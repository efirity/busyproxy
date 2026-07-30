package net.busyproxy.app.auth

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

/**
 * One-tap SMS OTP consent (Play Services).
 * No READ_SMS permission — user confirms once when the SMS arrives.
 */
class SmsOtpConsent(
    private val activity: ComponentActivity,
    private val onCode: (String) -> Unit,
) {
    private var receiver: BroadcastReceiver? = null
    private var consentLauncher: ActivityResultLauncher<Intent>? = null

    fun register() {
        consentLauncher =
            activity.registerForActivityResult(
                ActivityResultContracts.StartActivityForResult(),
            ) { result ->
                if (result.resultCode != Activity.RESULT_OK) return@registerForActivityResult
                val message = result.data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE).orEmpty()
                extractCode(message)?.let(onCode)
            }
    }

    fun startListening() {
        stopListening()
        val client = SmsRetriever.getClient(activity)
        client.startSmsUserConsent(null)
            .addOnSuccessListener { Log.i(TAG, "SMS user consent started") }
            .addOnFailureListener { e -> Log.w(TAG, "SMS consent failed: ${e.message}") }

        val filter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
        val r =
            object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    if (SmsRetriever.SMS_RETRIEVED_ACTION != intent.action) return
                    val extras = intent.extras ?: return
                    val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return
                    when (status.statusCode) {
                        CommonStatusCodes.SUCCESS -> {
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
                                    consentLauncher?.launch(consentIntent)
                                } catch (e: ActivityNotFoundException) {
                                    Log.w(TAG, "consent activity missing: ${e.message}")
                                }
                            }
                        }
                        CommonStatusCodes.TIMEOUT -> Log.i(TAG, "SMS consent timeout")
                    }
                }
            }
        receiver = r
        ContextCompat.registerReceiver(
            activity,
            r,
            filter,
            ContextCompat.RECEIVER_EXPORTED,
        )
    }

    fun stopListening() {
        receiver?.let {
            runCatching { activity.unregisterReceiver(it) }
        }
        receiver = null
    }

    companion object {
        private const val TAG = "BpSmsOtp"

        /** Prefer a 6-digit OTP from SMS body. */
        fun extractCode(message: String): String? {
            val m = Regex("""\b(\d{6})\b""").find(message) ?: return null
            return m.groupValues[1]
        }
    }
}
