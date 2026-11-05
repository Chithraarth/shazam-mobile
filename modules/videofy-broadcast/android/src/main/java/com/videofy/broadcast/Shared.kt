package com.videofy.broadcast

import android.content.Context
import java.io.File

// Session, foreground flag and saved results shared between the app (via
// the module) and ScreenScanService. Mirrors the iOS app-group contract.
internal object Shared {
  private const val PREFS = "videofy_broadcast"
  const val TOKEN = "vb.token"
  const val API_BASE = "vb.apiBase"
  const val REGION = "vb.region"
  const val APP_ACTIVE = "vb.appActive"

  fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun resultsDir(context: Context) = File(context.filesDir, "BackgroundScans").apply { mkdirs() }

  // Frames from a finished Android scan, waiting for the app to identify
  // them: frame0.jpg, frame1.jpg, … plus "at" (capture time, ms).
  fun pendingDir(context: Context) = File(context.filesDir, "PendingScan")

  fun savePending(context: Context, frames: List<ByteArray>) {
    val dir = pendingDir(context)
    dir.deleteRecursively()
    dir.mkdirs()
    frames.forEachIndexed { i, bytes -> File(dir, "frame$i.jpg").writeBytes(bytes) }
    File(dir, "at").writeText(System.currentTimeMillis().toString())
  }
}
