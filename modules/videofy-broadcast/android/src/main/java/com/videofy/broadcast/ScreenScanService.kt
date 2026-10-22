package com.videofy.broadcast

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.Base64
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlin.math.max
import kotlin.math.roundToInt

// Videofy background scan on Android. Started with a MediaProjection grant;
// shows a floating "Start scan" pill over whatever app the user navigates
// to, and only begins capturing once they tap it — so it scans the video
// they're actually watching, not whatever happens to be on screen first.
// Keeps a frame every 2.5s for 15s after Start is tapped, sends them to
// /api/identify, then shows the answer as a notification and saves it for
// the app's History.
class ScreenScanService : Service() {
  companion object {
    const val EXTRA_RESULT_CODE = "resultCode"
    const val EXTRA_DATA = "data"
    private const val ACTION_STOP = "com.videofy.broadcast.STOP"
    private const val CHANNEL = "background-scan"
    private const val ONGOING_ID = 4101
    private const val CAPTURE_MS = 15_000L
    private const val SHOT_EVERY_MS = 2_500L
    private const val MAX_FRAMES = 7
    private const val MAX_EDGE = 1024
    // Refresh the cached screen frame at most this often.
    private const val CACHE_EVERY_MS = 400L
    // Give up if Start isn't tapped within this time.
    private const val IDLE_TIMEOUT_MS = 5 * 60_000L
  }

  private var projection: MediaProjection? = null
  private var display: VirtualDisplay? = null
  private var reader: ImageReader? = null
  private lateinit var worker: HandlerThread
  private lateinit var handler: Handler
  private var overlay: OverlayController? = null
  private val frames = mutableListOf<ByteArray>()
  private var windowStart = 0L
  private var lastShot = 0L
  private var finished = false
  private var capturing = false
  // The most recent screen frame. Android only delivers a new frame when the
  // screen changes, so a paused video or a still title card produces none;
  // keeping the last one means every 2.5s shot still has the current screen.
  @Volatile private var latest: Bitmap? = null
  private var lastCached = 0L
  private val idleTimeout = Runnable {
    if (!capturing && !finished) {
      finish("Background scan stopped", "It wasn’t started within 5 minutes. No scan was used.")
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      finish(null, null)
      return START_NOT_STICKY
    }
    createChannel()
    // Android 14+ requires the foreground service to be running before the
    // projection is created.
    ServiceCompat.startForeground(
      this, ONGOING_ID, ongoingNotification("Open the video, then tap Start scan"),
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION else 0,
    )
    val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, 0) ?: 0
    val data: Intent? = if (Build.VERSION.SDK_INT >= 33) intent?.getParcelableExtra(EXTRA_DATA, Intent::class.java)
      else @Suppress("DEPRECATION") intent?.getParcelableExtra(EXTRA_DATA)
    if (data == null) {
      finish(null, null)
      return START_NOT_STICKY
    }
    worker = HandlerThread("videofy-scan").apply { start() }
    handler = Handler(worker.looper)
    val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    projection = manager.getMediaProjection(resultCode, data)?.also { p ->
      p.registerCallback(object : MediaProjection.Callback() {
        // The user stopped sharing from the system UI.
        override fun onStop() {
          handler.post {
            if (finished) return@post
            // Stopped before Start was tapped: just end quietly.
            if (capturing) finishCapture() else finish(null, null)
          }
        }
      }, handler)
    }
    if (projection == null) {
      finish(null, null)
      return START_NOT_STICKY
    }
    // Create the virtual display right away so capture can begin the
    // instant the user taps Start — nothing is read from it until then.
    val metrics = resources.displayMetrics
    val scale = MAX_EDGE.toFloat() / max(metrics.widthPixels, metrics.heightPixels)
    val width = (metrics.widthPixels * scale).roundToInt()
    val height = (metrics.heightPixels * scale).roundToInt()
    reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2).also { r ->
      r.setOnImageAvailableListener({ cacheFrame(it) }, handler)
    }
    display = projection?.createVirtualDisplay(
      "videofy-scan", width, height, metrics.densityDpi,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader?.surface, null, handler,
    )
    overlay = OverlayController(
      this, Handler(mainLooper),
      onStart = { handler.post(::requestStart) },
      onCancel = { handler.post { if (!finished) finish(null, null) } },
    ).also { it.showReady() }
    handler.postDelayed(idleTimeout, IDLE_TIMEOUT_MS)
    return START_NOT_STICKY
  }

  // The user tapped "Start scan". Capture only begins if they're on the
  // video, not still in Videofy.
  private fun requestStart() {
    if (capturing || finished) return
    if (Shared.prefs(this).getBoolean(Shared.APP_ACTIVE, false)) {
      overlay?.hint("Open your video first")
      return
    }
    beginCapture()
  }

  // The only place frame capture actually begins.
  private fun beginCapture() {
    capturing = true
    handler.removeCallbacks(idleTimeout)
    windowStart = System.currentTimeMillis()
    lastShot = 0L
    overlay?.showScanning((CAPTURE_MS / 1000).toInt())
    updateOngoing("Scanning your screen… keep the video playing")
    handler.post(::tick)
  }

  // Keeps `latest` up to date with what's on screen (throttled).
  private fun cacheFrame(r: ImageReader) {
    val image = runCatching { r.acquireLatestImage() }.getOrNull() ?: return
    try {
      val now = System.currentTimeMillis()
      if (finished || now - lastCached < CACHE_EVERY_MS) return
      lastCached = now
      val plane = image.planes[0]
      val rowPadding = plane.rowStride - plane.pixelStride * image.width
      val padded = Bitmap.createBitmap(image.width + rowPadding / plane.pixelStride, image.height, Bitmap.Config.ARGB_8888)
      padded.copyPixelsFromBuffer(plane.buffer)
      val frame = if (rowPadding == 0) padded else Bitmap.createBitmap(padded, 0, 0, image.width, image.height).also { padded.recycle() }
      val old = latest
      latest = frame
      old?.recycle()
    } catch (_: Exception) {
    } finally {
      image.close()
    }
  }

  private fun tick() {
    if (finished || !capturing) return
    val now = System.currentTimeMillis()
    if (now - lastShot >= SHOT_EVERY_MS) {
      grabFrame()?.let { frames.add(it); lastShot = now }
    }
    if (now - windowStart >= CAPTURE_MS || frames.size >= MAX_FRAMES) {
      finishCapture()
      return
    }
    handler.postDelayed(::tick, 250)
  }

  private fun grabFrame(): ByteArray? {
    val frame = latest ?: return null
    return try {
      val out = ByteArrayOutputStream()
      frame.compress(Bitmap.CompressFormat.JPEG, 70, out)
      out.toByteArray()
    } catch (_: Exception) {
      null
    }
  }

  private fun finishCapture() {
    if (finished) return
    finished = true
    releaseProjection()
    if (frames.isEmpty()) {
      finish("Nothing was captured", "Play the video and try again. No scan was used.")
      return
    }
    updateOngoing("Identifying…")
    overlay?.showIdentifying()
    Thread { upload() }.start()
  }

  private fun upload() {
    val prefs = Shared.prefs(this)
    val token = prefs.getString(Shared.TOKEN, null)
    val base = prefs.getString(Shared.API_BASE, null)
    if (token.isNullOrEmpty() || base.isNullOrEmpty()) {
      finish("Sign in again", "Open Videofy to sign in, then scan again.")
      return
    }
    val body = JSONObject()
      .put("imageData", Base64.encodeToString(frames[0], Base64.NO_WRAP))
      .put("extraFrames", JSONArray(frames.drop(1).map { Base64.encodeToString(it, Base64.NO_WRAP) }))
      .put("mimeType", "image/jpeg")
      .put("region", prefs.getString(Shared.REGION, "IN"))
      .put("source", "screen")
    try {
      val conn = (URL("$base/api/identify").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15_000
        readTimeout = 60_000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Authorization", "Bearer $token")
      }
      conn.outputStream.use { it.write(body.toString().toByteArray()) }
      val status = conn.responseCode
      when (status) {
        200 -> {
          val result = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
          save(result)
          val (title, text) = describe(result)
          finish(title, text)
        }
        401 -> finish("Sign in again", "Open Videofy to sign in, then scan again.")
        402 -> finish("You’re out of scans", "Open Videofy to get more scans.")
        else -> finish("Couldn’t identify that", "Your scan wasn’t used — please try again.")
      }
      conn.disconnect()
    } catch (_: Exception) {
      finish("Couldn’t reach Videofy", "Check your connection and try again. No scan was used.")
    }
  }

  private fun describe(r: JSONObject): Pair<String, String> {
    if (!r.optBoolean("found")) return "No match this time" to "Try again while a title, face or caption is on screen."
    val name = r.optString("title").ifEmpty { r.optString("creator") }.ifEmpty { "Found it" }
    val parts = listOfNotNull(
      r.optInt("year", 0).takeIf { it > 0 }?.toString(),
      r.optString("platform").takeIf { it.isNotEmpty() && it != "null" }?.let { "on $it" },
      r.optInt("confidence", -1).takeIf { it >= 0 }?.let { "$it% match" },
    )
    return "Found it: $name" to (if (parts.isEmpty()) "Tap to see the details." else parts.joinToString(" · "))
  }

  private fun save(result: JSONObject) {
    val dir = Shared.resultsDir(this)
    val id = UUID.randomUUID().toString()
    File(dir, "$id.json").writeText(JSONObject().put("id", id).put("at", System.currentTimeMillis()).put("result", result).toString())
    File(dir, "$id.jpg").writeBytes(frames[0])
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(NotificationManager::class.java)
    nm.createNotificationChannel(NotificationChannel(CHANNEL, "Background scan", NotificationManager.IMPORTANCE_HIGH))
  }

  private fun openAppIntent(): PendingIntent? {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun ongoingNotification(text: String): Notification {
    val stop = PendingIntent.getService(
      this, 1, Intent(this, ScreenScanService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    return NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Videofy background scan")
      .setContentText(text)
      .setOngoing(true)
      .setSilent(true)
      .addAction(0, "Stop", stop)
      .build()
  }

  private fun updateOngoing(text: String) {
    getSystemService(NotificationManager::class.java).notify(ONGOING_ID, ongoingNotification(text))
  }

  private fun releaseProjection() {
    display?.release(); display = null
    reader?.setOnImageAvailableListener(null, null)
    reader?.close(); reader = null
    projection?.stop(); projection = null
  }

  // Posts the answer (if any), stops capture and ends the service.
  private fun finish(title: String?, text: String?) {
    finished = true
    if (::handler.isInitialized) handler.removeCallbacks(idleTimeout)
    releaseProjection()
    if (title != null) {
      val n = NotificationCompat.Builder(this, CHANNEL)
        .setSmallIcon(applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(text))
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setContentIntent(openAppIntent())
        .build()
      getSystemService(NotificationManager::class.java).notify(ONGOING_ID + 1 + (System.currentTimeMillis() % 1000).toInt(), n)
    }
    overlay?.remove()
    overlay = null
    latest?.recycle()
    latest = null
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
    if (::worker.isInitialized) worker.quitSafely()
  }
}
