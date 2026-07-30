package net.busyproxy.app.relay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import net.busyproxy.app.MainActivity
import net.busyproxy.app.R
import net.busyproxy.app.data.Prefs
import net.busyproxy.app.domain.RelayState

/**
 * Visible foreground service for the entire active sharing period.
 *
 * Keep-alive: START_STICKY + [SharingKeepAlive] (async prefs — never block main).
 */
class RelayForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var engine: RelayEngine? = null
    private var collectJob: Job? = null
    private var userRequestedStop = false
    private var startedForeground = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        try {
            ensureChannel()
            engine = RelayEngine(applicationContext, Prefs(this))
        } catch (t: Throwable) {
            Log.e(TAG, "onCreate failed", t)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return try {
            when (intent?.action) {
                ACTION_STOP -> {
                    userRequestedStop = true
                    // UI / status first so Stop never waits on reconnect
                    publishStatus(null)
                    try {
                        SharingKeepAlive.onSharingStopped(this)
                    } catch (_: Throwable) {
                    }
                    try {
                        collectJob?.cancel()
                        collectJob = null
                    } catch (_: Throwable) {
                    }
                    try {
                        engine?.stop()
                    } catch (t: Throwable) {
                        Log.w(TAG, "engine stop: ${t.message}")
                    }
                    if (startedForeground) {
                        try {
                            stopForeground(STOP_FOREGROUND_REMOVE)
                        } catch (_: Throwable) {
                        }
                    }
                    stopSelf()
                    START_NOT_STICKY
                }
                else -> {
                    userRequestedStop = false
                    // Non-blocking flag + watchdog
                    SharingKeepAlive.onSharingStarted(this)
                    // Foreground ASAP — required within 5s of startForegroundService
                    val notif = buildNotification("Starting…", "Preparing sharing session")
                    promoteToForeground(notif)
                    engine?.start()
                    collectJob?.cancel()
                    collectJob =
                        scope.launch {
                            val eng = engine ?: return@launch
                            eng.status.collectLatest { st ->
                                // Don't publish after user stop (avoids Stop button flip-flop)
                                if (userRequestedStop) return@collectLatest
                                publishStatus(st)
                                val title =
                                    when (st.state) {
                                        RelayState.ONLINE ->
                                            getString(
                                                R.string.notif_title_online,
                                                st.activeTransport.name.lowercase(),
                                            )
                                        RelayState.RECONNECTING, RelayState.CONNECTING_TUNNEL ->
                                            getString(R.string.notif_title_reconnecting)
                                        RelayState.PAUSED_DATA_CAP, RelayState.PAUSED_ROAMING ->
                                            getString(R.string.notif_title_paused)
                                        RelayState.ERROR -> "BusyProxy · error"
                                        else -> "BusyProxy"
                                    }
                                val body =
                                    getString(
                                        R.string.notif_body,
                                        st.egressIp ?: "—",
                                        formatBytes(st.bytesUp + st.bytesDown),
                                    )
                                val nm =
                                    getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                                nm.notify(NOTIF_ID, buildNotification(title, body))
                            }
                        }
                    START_STICKY
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "onStartCommand failed", t)
            // Still try to show a notification so we don't get FGS timeout crash
            try {
                promoteToForeground(
                    buildNotification("BusyProxy", "Sharing had an error — open the app"),
                )
            } catch (_: Throwable) {
                /* ignore */
            }
            START_STICKY
        }
    }

    private fun promoteToForeground(notif: Notification) {
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(
                NOTIF_ID,
                notif,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIF_ID, notif)
        }
        startedForeground = true
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        if (!userRequestedStop) {
            Log.i(TAG, "task removed — re-assert FGS")
            try {
                val restart = Intent(applicationContext, RelayForegroundService::class.java)
                if (Build.VERSION.SDK_INT >= 26) {
                    applicationContext.startForegroundService(restart)
                } else {
                    applicationContext.startService(restart)
                }
                SharingKeepAlive.scheduleWatchdog(applicationContext)
            } catch (t: Throwable) {
                Log.w(TAG, "task removed restart: ${t.message}")
                SharingKeepAlive.scheduleQuickRestart(applicationContext)
            }
        }
    }

    override fun onDestroy() {
        collectJob?.cancel()
        try {
            engine?.stop()
        } catch (_: Throwable) {
            /* ignore */
        }
        publishStatus(null)
        if (!userRequestedStop) {
            SharingKeepAlive.scheduleWatchdog(applicationContext)
            SharingKeepAlive.scheduleQuickRestart(applicationContext, 5_000L)
        }
        scope.cancel()
        super.onDestroy()
    }

    private fun publishStatus(st: net.busyproxy.app.domain.RelayStatus?) {
        status.value = st
    }

    private fun buildNotification(title: String, body: String): Notification {
        val open =
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        val stop =
            PendingIntent.getService(
                this,
                1,
                Intent(this, RelayForegroundService::class.java).setAction(ACTION_STOP),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .addAction(0, getString(R.string.notif_action_stop), stop)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        val ch =
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notif_channel_relay),
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = getString(R.string.notif_channel_relay_desc)
                setShowBadge(false)
            }
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(ch)
    }

    companion object {
        private const val TAG = "BpRelayFgs"
        const val CHANNEL_ID = "busyproxy_relay"
        const val NOTIF_ID = 42
        const val ACTION_STOP = "net.busyproxy.app.STOP_RELAY"

        val status =
            kotlinx.coroutines.flow.MutableStateFlow<net.busyproxy.app.domain.RelayStatus?>(null)

        fun start(ctx: Context) {
            val i = Intent(ctx, RelayForegroundService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= 26) {
                    ctx.startForegroundService(i)
                } else {
                    ctx.startService(i)
                }
            } catch (t: Throwable) {
                Log.e(TAG, "start failed: ${t.message}", t)
            }
        }

        fun stop(ctx: Context) {
            val i = Intent(ctx, RelayForegroundService::class.java).setAction(ACTION_STOP)
            try {
                ctx.startService(i)
            } catch (t: Throwable) {
                Log.w(TAG, "stop via startService failed: ${t.message}")
                try {
                    if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i)
                } catch (t2: Throwable) {
                    Log.e(TAG, "stop failed: ${t2.message}", t2)
                }
            }
        }

        private fun formatBytes(n: Long): String {
            if (n < 1024) return "$n B"
            if (n < 1024 * 1024) return "${n / 1024} KB"
            return String.format("%.2f GB", n / (1024.0 * 1024.0 * 1024.0))
        }
    }
}
