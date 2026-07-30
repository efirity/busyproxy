package net.busyproxy.app.relay

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import net.busyproxy.app.data.Prefs

/**
 * Keeps the earner reverse-tunnel alive when the UI is backgrounded or the
 * process is killed (within Android limits).
 *
 * **Never blocks the main thread** — all DataStore IO is on [ioScope].
 * Blocking here caused Start-sharing ANRs (“isn't responding”).
 */
object SharingKeepAlive {
    private const val TAG = "BpKeepAlive"
    private const val WATCHDOG_REQ = 7101
    private const val WATCHDOG_MS = 12 * 60 * 1000L

    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun isBatteryUnrestricted(ctx: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT < 23) true
            else {
                val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
                pm.isIgnoringBatteryOptimizations(ctx.packageName)
            }
        } catch (t: Throwable) {
            Log.w(TAG, "battery check: ${t.message}")
            true
        }
    }

    fun batteryOptRequestIntent(ctx: Context): Intent {
        return Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = android.net.Uri.parse("package:${ctx.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    fun batterySettingsIntent(ctx: Context): Intent {
        return Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    /**
     * If user previously enabled sharing and still has a session, start FGS
     * and (re)schedule the watchdog. Safe to call from main thread.
     */
    fun ensureSharingIfWanted(ctx: Context) {
        val app = ctx.applicationContext
        ioScope.launch {
            try {
                val prefs = Prefs(app)
                val wanted = prefs.peekSharingWanted()
                if (!wanted) {
                    cancelWatchdog(app)
                    return@launch
                }
                val token = prefs.sessionToken.first()
                if (token.isNullOrBlank()) {
                    Log.i(TAG, "sharingWanted but no session — clear flag")
                    prefs.setSharingWanted(false)
                    cancelWatchdog(app)
                    return@launch
                }
                if (RelayForegroundService.status.value == null) {
                    Log.i(TAG, "restarting relay FGS (keep-alive)")
                    // startForegroundService must run on a thread that can post to main;
                    // Application context start is allowed from background when FGS type set.
                    RelayForegroundService.start(app)
                }
                scheduleWatchdog(app)
            } catch (t: Throwable) {
                Log.w(TAG, "ensureSharingIfWanted: ${t.message}")
            }
        }
    }

    /** Persist + schedule watchdog. Non-blocking. */
    fun onSharingStarted(ctx: Context) {
        val app = ctx.applicationContext
        ioScope.launch {
            try {
                Prefs(app).setSharingWanted(true)
                scheduleWatchdog(app)
            } catch (t: Throwable) {
                Log.w(TAG, "onSharingStarted: ${t.message}")
            }
        }
    }

    /** Clear flag + cancel watchdog. Non-blocking. */
    fun onSharingStopped(ctx: Context) {
        val app = ctx.applicationContext
        ioScope.launch {
            try {
                Prefs(app).setSharingWanted(false)
                cancelWatchdog(app)
            } catch (t: Throwable) {
                Log.w(TAG, "onSharingStopped: ${t.message}")
            }
        }
    }

    fun scheduleWatchdog(ctx: Context) {
        val app = ctx.applicationContext
        try {
            val am = app.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pi = watchdogPending(app)
            val trigger = SystemClock.elapsedRealtime() + WATCHDOG_MS
            // Prefer inexact set — avoids SCHEDULE_EXACT_ALARM requirements
            am.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                trigger,
                pi,
            )
            Log.d(TAG, "watchdog scheduled in ${WATCHDOG_MS / 1000}s")
        } catch (t: Throwable) {
            Log.w(TAG, "schedule watchdog failed: ${t.message}")
        }
    }

    fun cancelWatchdog(ctx: Context) {
        try {
            val app = ctx.applicationContext
            val am = app.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.cancel(watchdogPending(app))
        } catch (t: Throwable) {
            Log.w(TAG, "cancel watchdog: ${t.message}")
        }
    }

    fun scheduleQuickRestart(ctx: Context, delayMs: Long = 5_000L) {
        try {
            val app = ctx.applicationContext
            val am = app.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pi =
                PendingIntent.getBroadcast(
                    app,
                    7102,
                    Intent(app, KeepAliveReceiver::class.java).setAction(
                        KeepAliveReceiver.ACTION_RESTART_RELAY,
                    ),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            am.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + delayMs,
                pi,
            )
        } catch (t: Throwable) {
            Log.w(TAG, "quick restart: ${t.message}")
        }
    }

    private fun watchdogPending(ctx: Context): PendingIntent {
        val i =
            Intent(ctx, KeepAliveReceiver::class.java).setAction(
                KeepAliveReceiver.ACTION_WATCHDOG,
            )
        return PendingIntent.getBroadcast(
            ctx,
            WATCHDOG_REQ,
            i,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
