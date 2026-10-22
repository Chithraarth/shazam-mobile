package com.videofy.broadcast

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.abs

// The floating control shown over whatever app the user is in during a
// background scan. Two looks:
//  - Ready: a large Videofy pill "Start scan" with a close (x) button,
//    centred near the top so it's easy to find.
//  - Scanning: a small "● 12s" chip docked to the right edge, so it covers
//    as little of the video being captured as possible.
// Draggable in both. Needs "Display over other apps" (checked by callers).
internal class OverlayController(
  private val context: Context,
  private val mainHandler: Handler,
  private val onStart: () -> Unit,
  private val onCancel: () -> Unit,
) {
  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private val density = context.resources.displayMetrics.density
  private var view: View? = null
  private var label: TextView? = null
  private var ticker: Runnable? = null

  private val overlayType =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

  private fun dp(v: Int) = (v * density).toInt()

  fun showReady() = mainHandler.post {
    stopTicker()
    val pill = buildPill(compact = false, text = "Start scan", withClose = true)
    pill.setOnClickListener { onStart() }
    attach(pill, compact = false)
  }

  // Briefly replaces the label, e.g. "Open your video first", then restores it.
  fun hint(message: String) = mainHandler.post {
    val tv = label ?: return@post
    val previous = tv.text
    tv.text = message
    mainHandler.postDelayed({ if (label === tv) tv.text = previous }, 2200)
  }

  fun showScanning(seconds: Int) = mainHandler.post {
    stopTicker()
    attach(buildPill(compact = true, text = "${seconds}s", withClose = false), compact = true)
    var remaining = seconds
    val t = object : Runnable {
      override fun run() {
        remaining--
        if (view == null || remaining <= 0) return
        label?.text = "${remaining}s"
        mainHandler.postDelayed(this, 1000)
      }
    }
    ticker = t
    mainHandler.postDelayed(t, 1000)
  }

  fun showIdentifying() = mainHandler.post {
    stopTicker()
    label?.text = "Identifying…"
  }

  fun remove() = mainHandler.post {
    stopTicker()
    view?.let { runCatching { windowManager.removeView(it) } }
    view = null
    label = null
  }

  private fun stopTicker() {
    ticker?.let { mainHandler.removeCallbacks(it) }
    ticker = null
  }

  private fun buildPill(compact: Boolean, text: String, withClose: Boolean): View {
    val row = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      minimumHeight = dp(if (compact) 40 else 52)
      setPadding(dp(if (compact) 12 else 18), 0, dp(if (withClose) 6 else if (compact) 14 else 20), 0)
      background = GradientDrawable(
        GradientDrawable.Orientation.LEFT_RIGHT,
        intArrayOf(Color.parseColor("#6A2BFF"), Color.parseColor("#E0147A"), Color.parseColor("#F0600A")),
      ).apply { cornerRadius = dp(28).toFloat() }
      elevation = dp(8).toFloat()
    }
    // Lime dot: the Videofy mark, and a "live" indicator while scanning.
    row.addView(View(context).apply {
      background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.parseColor("#C6FF3D")) }
      layoutParams = LinearLayout.LayoutParams(dp(10), dp(10)).apply { marginEnd = dp(10) }
    })
    val tv = TextView(context).apply {
      this.text = text
      setTextColor(Color.WHITE)
      textSize = if (compact) 14f else 16f
      typeface = Typeface.DEFAULT_BOLD
    }
    label = tv
    row.addView(tv)
    if (withClose) {
      row.addView(TextView(context).apply {
        this.text = "✕"
        setTextColor(Color.WHITE)
        textSize = 16f
        gravity = Gravity.CENTER
        contentDescription = "Cancel background scan"
        layoutParams = LinearLayout.LayoutParams(dp(44), dp(44)).apply { marginStart = dp(8) }
        background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.parseColor("#33000000")) }
        setOnClickListener { onCancel() }
      })
    }
    row.contentDescription = if (withClose) "Start Videofy scan" else null
    return row
  }

  private fun attach(pill: View, compact: Boolean) {
    view?.let { runCatching { windowManager.removeView(it) } }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      if (compact) {
        gravity = Gravity.TOP or Gravity.END
        x = dp(12)
        y = dp(96)
      } else {
        gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        y = dp(120)
      }
    }
    makeDraggable(pill, params, compact)
    runCatching { windowManager.addView(pill, params) }
    view = pill
  }

  // Drag to move it out of the way; a tap (no drag) is a click. Touches on
  // the close button are handled by that button itself.
  private fun makeDraggable(pill: View, params: WindowManager.LayoutParams, compact: Boolean) {
    var downX = 0f
    var downY = 0f
    var startX = 0
    var startY = 0
    var dragged = false
    val xSign = if (compact) -1 else 1 // END gravity measures x from the right edge
    pill.setOnTouchListener { v, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX; downY = event.rawY
          startX = params.x; startY = params.y
          dragged = false
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (event.rawX - downX).toInt()
          val dy = (event.rawY - downY).toInt()
          if (abs(dx) > dp(6) || abs(dy) > dp(6)) dragged = true
          params.x = startX + dx * xSign
          params.y = (startY + dy).coerceAtLeast(0)
          runCatching { windowManager.updateViewLayout(pill, params) }
          true
        }
        MotionEvent.ACTION_UP -> {
          if (!dragged) v.performClick()
          true
        }
        else -> false
      }
    }
  }
}
