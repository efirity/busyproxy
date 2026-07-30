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
 * PocketRelay §7.1 + BusyProxy earner product.
 */
class RelayForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var engine: RelayEngine? = null
    private var collectJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ensureChannel()
        val prefs = Prefs(this)
        engine = RelayEngine(applicationContext, prefs)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                engine?.stop()
                publishStatus(null)
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                val notif = buildNotification("Starting…", "Preparing sharing session")
                if (Build.VERSION.SDK_INT >= 34) {
                    startForeground(
                        NOTIF_ID,
                        notif,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
                    )
                } else {
                    startForeground(NOTIF_ID, notif)
                }
                engine?.start()
                collectJob?.cancel()
                collectJob =
                    scope.launch {
                        engine?.status?.collectLatest { st ->
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
                            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
                            nm.notify(NOTIF_ID, buildNotification(title, body))
                        }
                    }
            }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        collectJob?.cancel()
        engine?.stop()
        publishStatus(null)
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
                Intent(this, MainActivity::class.java),
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
            .build()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        val ch =
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notif_channel_relay),
                NotificationManager.IMPORTANCE_LOW,
            )
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(ch)
    }

    companion object {
        const val CHANNEL_ID = "busyproxy_relay"
        const val NOTIF_ID = 42
        const val ACTION_STOP = "net.busyproxy.app.STOP_RELAY"

        /** Live status for Compose home UI (null when service not running). */
        val status =
            kotlinx.coroutines.flow.MutableStateFlow<net.busyproxy.app.domain.RelayStatus?>(null)

        fun start(ctx: Context) {
            val i = Intent(ctx, RelayForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        }

        fun stop(ctx: Context) {
            val i = Intent(ctx, RelayForegroundService::class.java).setAction(ACTION_STOP)
            ctx.startService(i)
        }

        private fun formatBytes(n: Long): String {
            if (n < 1024) return "$n B"
            if (n < 1024 * 1024) return "${n / 1024} KB"
            return String.format("%.2f GB", n / (1024.0 * 1024.0 * 1024.0))
        }
    }
}
