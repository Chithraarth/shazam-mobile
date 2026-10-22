package com.videofy.broadcast

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
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

// A small floating, draggable pill shown over whatever app the user is in.
// Starts in "Start" mode (tap to begin capture) and switches to a countdown
// once capture begins. Requires the "display over other apps" permission —
// callers must check that before creating this.
internal class OverlayController(
  private val context: Context,
  private val mainHandler: Handler,
  private val captureSeconds: Int,
  private val onStart: () -> Unit,
) {
  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private var view: View? = null
  private var label: TextView? = null

  private val overlayType =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

  fun showStart() {
    mainHandler.post {
      val pill = buildPill("Start scan")
      pill.setOnClickListener {
        onStart()
        showCountingDown(captureSeconds)
      }
      attach(pill)
    }
  }

  fun showCountingDown(fromSeconds: Int) {
    mainHandler.post {
      if (view == null) attach(buildPill(""))
      var remaining = fromSeconds
      label?.text = "Scanning… ${remaining}s"
      val ticker = object : Runnable {
        override fun run() {
          remaining--
          if (remaining <= 0 || view == null) return
          label?.text = "Scanning… ${remaining}s"
          mainHandler.postDelayed(this, 1000)
        }
      }
      mainHandler.postDelayed(ticker, 1000)
    }
  }

  fun showIdentifying() {
    mainHandler.post { label?.text = "Identifying…" }
  }

  fun remove() {
    mainHandler.post {
      view?.let { runCatching { windowManager.removeView(it) } }
      view = null
      label = null
    }
  }

  private fun buildPill(text: String): View {
    val padding = (12 * context.resources.displayMetrics.density).toInt()
    val tv = TextView(context).apply {
      this.text = text
      setTextColor(Color.WHITE)
      textSize = 14f
      setPadding(padding, padding / 2, padding, padding / 2)
    }
    label = tv
    val bg = GradientDrawable().apply {
      cornerRadius = 999f
      setColor(Color.parseColor("#CC1A1A2E"))
    }
    return LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      background = bg
      addView(tv)
    }
  }

  private fun attach(pill: View) {
    view?.let { runCatching { windowManager.removeView(it) } }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
      y = (80 * context.resources.displayMetrics.density).toInt()
    }
    makeDraggable(pill, params)
    windowManager.addView(pill, params)
    view = pill
  }

  // Lets the user drag the pill out of the way of the content they're
  // trying to scan, without needing a separate "move" mode.
  private fun makeDraggable(pill: View, params: WindowManager.LayoutParams) {
    var downX = 0f
    var downY = 0f
    var startX = 0
    var startY = 0
    var dragged = false
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
          if (abs(dx) > 8 || abs(dy) > 8) dragged = true
          params.x = startX + dx
          params.y = startY + dy
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
