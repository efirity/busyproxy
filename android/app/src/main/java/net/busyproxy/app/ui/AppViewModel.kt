package net.busyproxy.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import net.busyproxy.app.data.ApiClient
import net.busyproxy.app.data.Prefs
import net.busyproxy.app.domain.AuthUser
import net.busyproxy.app.domain.NetworkMode
import net.busyproxy.app.domain.Pricing
import net.busyproxy.app.domain.RelayState
import net.busyproxy.app.domain.WalletSnapshot
import net.busyproxy.app.relay.RelayForegroundService
import org.json.JSONObject

data class UiState(
    val ready: Boolean = false,
    val consent: Boolean = false,
    val user: AuthUser? = null,
    val sessionToken: String? = null,
    val networkMode: NetworkMode = NetworkMode.PREFER_WIFI,
    val wallet: WalletSnapshot = WalletSnapshot(),
    val busy: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val displayNameDraft: String = "",
    val phoneDraft: String = "+37368182830",
    val codeDraft: String = "",
    val otpStep: Boolean = false,
    val sharingRequested: Boolean = false,
    val relayState: RelayState = RelayState.OFFLINE,
    val egressIp: String? = null,
    val bytesToday: Long = 0,
    val activeStreams: Int = 0,
    val relayMessage: String? = null,
)

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val prefs = Prefs(app)
    private val api = ApiClient()
    private val _ui = MutableStateFlow(UiState())
    val ui: StateFlow<UiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            // Restore session + user from disk once
            val token = prefs.sessionToken.first()
            val userJson = prefs.peekUserJson()
            val restoredUser =
                userJson?.let { raw ->
                    runCatching {
                        val o = JSONObject(raw)
                        AuthUser(
                            id = o.getString("id"),
                            phone = o.getString("phone"),
                            displayName = o.optString("displayName", "").takeIf { it.isNotBlank() },
                            email = o.optString("email", "").takeIf { it.isNotBlank() },
                        )
                    }.getOrNull()
                }
            _ui.value =
                _ui.value.copy(
                    sessionToken = token,
                    user = if (token != null) restoredUser else null,
                    ready = true,
                    consent = prefs.consentAccepted.first(),
                    networkMode = prefs.networkMode.first(),
                )
            if (token != null) refreshWallet()
        }
        viewModelScope.launch {
            prefs.consentAccepted.collect { c ->
                _ui.value = _ui.value.copy(consent = c)
            }
        }
        viewModelScope.launch {
            prefs.networkMode.collect { m ->
                _ui.value = _ui.value.copy(networkMode = m)
            }
        }
        viewModelScope.launch {
            prefs.usageToday.collect { (up, down) ->
                _ui.value = _ui.value.copy(bytesToday = up + down)
            }
        }
        // Observe live engine status when FGS is running
        viewModelScope.launch {
            RelayForegroundService.status.collect { st ->
                if (st == null) {
                    if (!_ui.value.sharingRequested) {
                        _ui.value =
                            _ui.value.copy(
                                relayState = RelayState.OFFLINE,
                                egressIp = null,
                                activeStreams = 0,
                                relayMessage = null,
                            )
                    }
                    return@collect
                }
                _ui.value =
                    _ui.value.copy(
                        sharingRequested = st.state != RelayState.OFFLINE && st.state != RelayState.STOPPING,
                        relayState = st.state,
                        egressIp = st.egressIp,
                        activeStreams = st.activeStreams,
                        relayMessage = st.message,
                        bytesToday = st.bytesUp + st.bytesDown,
                    )
            }
        }
    }

    fun setDisplayName(v: String) {
        _ui.value = _ui.value.copy(displayNameDraft = v.take(40), error = null)
    }

    fun setPhone(v: String) {
        _ui.value = _ui.value.copy(phoneDraft = v)
    }

    fun setCode(v: String) {
        // Digits only; Android SMS autofill / consent may paste full message or 6 digits
        val digits = v.filter { it.isDigit() }.take(6)
        _ui.value = _ui.value.copy(codeDraft = digits, error = null)
        // Auto-verify as soon as a full 6-digit code is present
        if (digits.length == 6 && !_ui.value.busy && _ui.value.otpStep) {
            verifyOtp()
        }
    }

    /** Called when SMS User Consent / autofill supplies a full SMS body or code. */
    fun onSmsOtpReceived(raw: String) {
        val code = raw.filter { it.isDigit() }.let { digits ->
            when {
                digits.length >= 6 -> digits.takeLast(6)
                else -> digits
            }
        }
        if (code.isBlank()) return
        _ui.value =
            _ui.value.copy(
                codeDraft = code,
                info = "Code filled from SMS",
                error = null,
            )
        if (code.length == 6 && !_ui.value.busy) {
            verifyOtp()
        }
    }

    fun acceptConsent() {
        viewModelScope.launch {
            prefs.setConsent(true)
        }
    }

    fun setMode(mode: NetworkMode) {
        viewModelScope.launch { prefs.setNetworkMode(mode) }
    }

    fun sendOtp() {
        val name = _ui.value.displayNameDraft.trim()
        if (name.length < 2) {
            _ui.value = _ui.value.copy(error = "Enter a display name (at least 2 characters)")
            return
        }
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busy = true, error = null, info = null)
            try {
                withContext(Dispatchers.IO) {
                    api.startOtp(_ui.value.phoneDraft, name)
                }
                _ui.value =
                    _ui.value.copy(
                        busy = false,
                        otpStep = true,
                        codeDraft = "",
                        info = "Code sent — SMS will autofill when it arrives",
                    )
            } catch (t: Throwable) {
                _ui.value =
                    _ui.value.copy(
                        busy = false,
                        error = friendlyNetError(t, "Could not send code"),
                    )
            }
        }
    }

    fun verifyOtp() {
        val code = _ui.value.codeDraft.filter { it.isDigit() }
        if (code.length != 6) {
            _ui.value = _ui.value.copy(error = "Enter the 6-digit code")
            return
        }
        if (_ui.value.busy) return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busy = true, error = null)
            try {
                val session =
                    withContext(Dispatchers.IO) {
                        api.verifyOtp(
                            _ui.value.phoneDraft,
                            code,
                            _ui.value.displayNameDraft.trim(),
                        )
                    }
                val userJson =
                    JSONObject()
                        .put("id", session.user.id)
                        .put("phone", session.user.phone)
                        .put("displayName", session.user.displayName)
                        .put("email", session.user.email)
                        .toString()
                prefs.setSession(session.sessionToken, userJson)
                _ui.value =
                    _ui.value.copy(
                        busy = false,
                        user = session.user,
                        sessionToken = session.sessionToken,
                        otpStep = false,
                        codeDraft = "",
                        info = "Signed in",
                        error = null,
                    )
                refreshWallet()
            } catch (t: Throwable) {
                _ui.value =
                    _ui.value.copy(
                        busy = false,
                        error = friendlyNetError(t, "Could not verify code"),
                    )
            }
        }
    }

    private fun friendlyNetError(t: Throwable, prefix: String): String {
        val msg = t.message.orEmpty()
        return when {
            msg.contains("Unable to resolve host", ignoreCase = true) ||
                msg.contains("UnknownHost", ignoreCase = true) ->
                "$prefix: no internet / DNS. Check Wi‑Fi or mobile data."
            msg.contains("timeout", ignoreCase = true) ||
                msg.contains("failed to connect", ignoreCase = true) ->
                "$prefix: network timeout. Try again on Wi‑Fi."
            msg.contains("SSL", ignoreCase = true) ||
                msg.contains("Certificate", ignoreCase = true) ->
                "$prefix: secure connection failed."
            msg.isNotBlank() -> msg
            else -> "$prefix: ${t.javaClass.simpleName}"
        }
    }

    fun logout() {
        viewModelScope.launch {
            stopSharing()
            prefs.clearSession()
            _ui.value = UiState(ready = true, consent = _ui.value.consent)
        }
    }

    fun refreshWallet() {
        val token = _ui.value.sessionToken ?: return
        viewModelScope.launch {
            try {
                val w = withContext(Dispatchers.IO) { api.wallet(token) }
                _ui.value =
                    _ui.value.copy(
                        wallet =
                            w.copy(
                                wifiCentsPerGb = Pricing.WIFI_CENTS_PER_GB,
                                mobileCentsPerGb = Pricing.MOBILE_CENTS_PER_GB,
                                minWithdrawCents = Pricing.MIN_WITHDRAW_CENTS,
                            ),
                    )
            } catch (_: Throwable) {
                /* optional */
            }
        }
    }

    fun startSharing() {
        if (!_ui.value.consent) {
            _ui.value = _ui.value.copy(error = "Accept disclosure first")
            return
        }
        if (_ui.value.sessionToken == null) {
            _ui.value = _ui.value.copy(error = "Sign in first")
            return
        }
        RelayForegroundService.start(getApplication())
        _ui.value = _ui.value.copy(sharingRequested = true, error = null)
    }

    fun stopSharing() {
        RelayForegroundService.stop(getApplication())
        _ui.value = _ui.value.copy(sharingRequested = false)
    }
}
