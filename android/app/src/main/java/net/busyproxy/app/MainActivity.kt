package net.busyproxy.app

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import net.busyproxy.app.auth.SmsOtpConsent
import net.busyproxy.app.relay.SharingKeepAlive
import net.busyproxy.app.ui.AppViewModel
import net.busyproxy.app.ui.BusyProxyAppRoot
import net.busyproxy.app.ui.theme.BusyProxyTheme

class MainActivity : ComponentActivity() {
    private var pendingVm: AppViewModel? = null
    private val notifPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            pendingVm?.logNotifPermission(granted)
        }

    private val batteryOptLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            pendingVm?.refreshBatteryHint()
        }

    /** Must be registered before STARTED (not inside Compose). */
    private val smsConsentLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode != Activity.RESULT_OK) return@registerForActivityResult
            val message =
                result.data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE).orEmpty()
            val code = SmsOtpConsent.extractCode(message) ?: return@registerForActivityResult
            otpCodeHandler?.invoke(code)
        }

    private var otpCodeHandler: ((String) -> Unit)? = null
    private var smsReceiver: BroadcastReceiver? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val vm: AppViewModel = viewModel()
            val ui by vm.ui.collectAsState()

            DisposableEffect(Unit) {
                otpCodeHandler = { code -> vm.onSmsOtpReceived(code) }
                onDispose {
                    otpCodeHandler = null
                    stopSmsConsent()
                }
            }

            LaunchedEffect(ui.otpStep) {
                if (ui.otpStep) startSmsConsent() else stopSmsConsent()
            }

            BusyProxyTheme {
                LaunchedEffect(Unit) {
                    pendingVm = vm
                    if (Build.VERSION.SDK_INT >= 33) {
                        val ok =
                            ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.POST_NOTIFICATIONS,
                            ) == PackageManager.PERMISSION_GRANTED
                        if (!ok) {
                            vm.logNotifPermissionAsked()
                            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                        } else {
                            vm.logNotifPermission(true)
                        }
                    }
                }
                // Do NOT auto-launch battery settings on share-start (can ANR / stack dialogs).
                // User taps "Fix battery settings" on the home card instead.
                BusyProxyAppRoot(
                    vm = vm,
                    onRequestBatteryUnrestricted = { requestBatteryUnrestricted(vm) },
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        pendingVm?.refreshBatteryHint()
        // Async revive if user left sharing on (must not block UI thread)
        SharingKeepAlive.ensureSharingIfWanted(this)
    }

    private fun requestBatteryUnrestricted(vm: AppViewModel) {
        if (SharingKeepAlive.isBatteryUnrestricted(this)) {
            vm.refreshBatteryHint()
            return
        }
        try {
            batteryOptLauncher.launch(SharingKeepAlive.batteryOptRequestIntent(this))
            vm.markBatteryPromptShown()
        } catch (t: Throwable) {
            Log.w(TAG, "battery opt intent: ${t.message}")
            runCatching {
                startActivity(SharingKeepAlive.batterySettingsIntent(this))
            }
        }
    }

    private fun startSmsConsent() {
        stopSmsConsent()
        SmsRetriever.getClient(this)
            .startSmsUserConsent(null)
            .addOnSuccessListener { Log.i(TAG, "SMS user consent listening") }
            .addOnFailureListener { e -> Log.w(TAG, "SMS consent start failed: ${e.message}") }

        val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
        val receiver =
            object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    if (SmsRetriever.SMS_RETRIEVED_ACTION != intent.action) return
                    val extras = intent.extras ?: return
                    val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return
                    if (status.statusCode != CommonStatusCodes.SUCCESS) {
                        Log.i(TAG, "SMS consent status=${status.statusCode}")
                        return
                    }
                    val consentIntent =
                        if (Build.VERSION.SDK_INT >= 33) {
                            extras.getParcelable(
                                SmsRetriever.EXTRA_CONSENT_INTENT,
                                Intent::class.java,
                            )
                        } else {
                            @Suppress("DEPRECATION")
                            extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT)
                        }
                    if (consentIntent != null) {
                        try {
                            smsConsentLauncher.launch(consentIntent)
                        } catch (e: ActivityNotFoundException) {
                            Log.w(TAG, "consent UI missing: ${e.message}")
                        }
                    }
                }
            }
        smsReceiver = receiver
        ContextCompat.registerReceiver(
            this,
            receiver,
            filter,
            ContextCompat.RECEIVER_EXPORTED,
        )
    }

    private fun stopSmsConsent() {
        smsReceiver?.let { runCatching { unregisterReceiver(it) } }
        smsReceiver = null
    }

    override fun onStart() {
        super.onStart()
        pendingVm?.onAppForeground()
    }

    override fun onStop() {
        pendingVm?.onAppBackground()
        super.onStop()
    }

    override fun onDestroy() {
        stopSmsConsent()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "BpSmsOtp"
    }
}
