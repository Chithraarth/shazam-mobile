package com.videofy.broadcast

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.provider.Settings
import android.util.Base64
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

private const val CAPTURE_REQUEST = 7311
private const val OVERLAY_REQUEST = 7312

class VideofyBroadcastModule : Module() {
  private var pending: Promise? = null

  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("NoContext", "App context isn't ready", null)

  override fun definition() = ModuleDefinition {
    Name("VideofyBroadcast")

    Function("isSupported") { true }

    Function("setSession") { token: String, apiBase: String, region: String ->
      Shared.prefs(context).edit()
        .putString(Shared.TOKEN, token)
        .putString(Shared.API_BASE, apiBase)
        .putString(Shared.REGION, region)
        .apply()
    }

    Function("clearSession") {
      Shared.prefs(context).edit().remove(Shared.TOKEN).apply()
    }

    Function("setAppActive") { active: Boolean ->
      Shared.prefs(context).edit().putBoolean(Shared.APP_ACTIVE, active).apply()
    }

    // The floating Start/countdown control needs "Display over other apps".
    // Unlike other permissions, Android requires sending the user to a
    // dedicated system settings screen rather than a runtime dialog — there's
    // no way to show that screen and get a direct result back, so we just
    // check again when the app resumes (see OnActivityResult below).
    Function("hasOverlayPermission") { Settings.canDrawOverlays(context) }

    Function("requestOverlayPermission") {
      appContext.currentActivity?.startActivityForResult(
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")),
        OVERLAY_REQUEST,
      )
    }

    // Asks for screen-capture consent (Android shows its own dialog), then
    // hands the grant to ScreenScanService. Requires the overlay permission
    // to already be granted, since the service's Start/countdown control is
    // a floating overlay.
    AsyncFunction("start") { promise: Promise ->
      val activity = appContext.currentActivity
        ?: throw CodedException("NoActivity", "Open Videofy and try again.", null)
      if (!Settings.canDrawOverlays(context)) {
        promise.reject(CodedException("NoOverlay", "Allow Videofy to display over other apps first.", null))
        return@AsyncFunction
      }
      val manager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      pending = promise
      activity.startActivityForResult(manager.createScreenCaptureIntent(), CAPTURE_REQUEST)
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode != CAPTURE_REQUEST) return@OnActivityResult
      val promise = pending ?: return@OnActivityResult
      pending = null
      val data = payload.data
      if (payload.resultCode != Activity.RESULT_OK || data == null) {
        promise.reject(CodedException("Cancelled", "Screen capture wasn’t allowed.", null))
        return@OnActivityResult
      }
      val intent = Intent(context, ScreenScanService::class.java)
        .putExtra(ScreenScanService.EXTRA_RESULT_CODE, payload.resultCode)
        .putExtra(ScreenScanService.EXTRA_DATA, data)
      ContextCompat.startForegroundService(context, intent)
      promise.resolve(null)
      // Step out of the way: the user lands on their home screen with the
      // floating Start button, ready to open the video they want to scan.
      activity.moveTaskToBack(true)
    }

    // Saved results (<id>.json + <id>.jpg), returned once and deleted.
    Function("consumeResults") {
      val out = JSONArray()
      val dir = Shared.resultsDir(context)
      dir.listFiles { f -> f.extension == "json" }?.forEach { file ->
        try {
          val entry = JSONObject(file.readText())
          val thumb = java.io.File(dir, "${file.nameWithoutExtension}.jpg")
          entry.put("thumbBase64", if (thumb.exists()) Base64.encodeToString(thumb.readBytes(), Base64.NO_WRAP) else JSONObject.NULL)
          thumb.delete()
          out.put(entry)
        } catch (_: Exception) {
        } finally {
          file.delete()
        }
      }
      out.toString()
    }
  }
}
