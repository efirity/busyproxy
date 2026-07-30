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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import net.busyproxy.app.data.Prefs

/**
 * Keeps the earner reverse-tunnel alive when the UI is backgrounded or the
 * process is killed (within Android limits).
 *
 * Strategy:
 * 1. Persistent `sharingWanted` flag in DataStore
 * 2. Sticky [RelayForegroundService] with ongoing notification
 * 3. Boot + package-replace receivers restart FGS if wanted + session
 * 4. Periodic AlarmManager watchdog (~12 min) restarts if FGS died
 * 5. App cold-start also calls [ensureSharingIfWanted]
 *
 * Limits (document for users / Play):
 * - Force-stop in system settings blocks all restarts until user opens app
 * - Aggressive OEM battery savers may still kill; battery unrestricted helps
 * - We do **not** auto-launch the full Activity (Play / Android 10+ rules);
 *   the ongoing notification re-opens the UI on tap
 */
object SharingKeepAlive {
    private const val TAG = "BpKeepAlive"
    private const val WATCHDOG_REQ = 7101
    /** Inexact-ish interval; system may batch. */
    private const val WATCHDOG_MS = 12 * 60 * 1000L

    fun isBatteryUnrestricted(ctx: Context): Boolean {
        if (Build.VERSION.SDK_INT < 23) return true
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    /** Intent to request unrestricted battery (opens system dialog). */
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
     * and (re)schedule the watchdog.
     */
    fun ensureSharingIfWanted(ctx: Context) {
        val app = ctx.applicationContext
        val prefs = Prefs(app)
        val (wanted, token) =
            runBlocking {
                withContext(Dispatchers.IO) {
                    prefs.peekSharingWanted() to prefs.sessionToken.first()
                }
            }
        if (!wanted) {
            cancelWatchdog(app)
            return
        }
        if (token.isNullOrBlank()) {
            Log.i(TAG, "sharingWanted but no session — clear flag")
            runBlocking {
                withContext(Dispatchers.IO) { prefs.setSharingWanted(false) }
            }
            cancelWatchdog(app)
            return
        }
        // Status flow non-null ⇒ service already publishing
        if (RelayForegroundService.status.value == null) {
            Log.i(TAG, "restarting relay FGS (keep-alive)")
            RelayForegroundService.start(app)
        }
        scheduleWatchdog(app)
    }

    fun onSharingStarted(ctx: Context) {
        val app = ctx.applicationContext
        runBlocking {
            withContext(Dispatchers.IO) { Prefs(app).setSharingWanted(true) }
        }
        scheduleWatchdog(app)
    }

    fun onSharingStopped(ctx: Context) {
        val app = ctx.applicationContext
        runBlocking {
            withContext(Dispatchers.IO) { Prefs(app).setSharingWanted(false) }
        }
        cancelWatchdog(app)
    }

    fun scheduleWatchdog(ctx: Context) {
        val app = ctx.applicationContext
        val am = app.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = watchdogPending(app)
        val trigger = SystemClock.elapsedRealtime() + WATCHDOG_MS
        try {
            if (Build.VERSION.SDK_INT >= 23) {
                am.setAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    trigger,
                    pi,
                )
            } else {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, trigger, pi)
            }
            Log.d(TAG, "watchdog scheduled in ${WATCHDOG_MS / 1000}s")
        } catch (t: Throwable) {
            Log.w(TAG, "schedule watchdog failed: ${t.message}")
        }
    }

    fun cancelWatchdog(ctx: Context) {
        val app = ctx.applicationContext
        val am = app.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(watchdogPending(app))
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
