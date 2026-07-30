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
import net.busyproxy.app.data.EventLogger
import net.busyproxy.app.data.Prefs
import net.busyproxy.app.domain.AuthUser
import net.busyproxy.app.domain.NetworkMode
import net.busyproxy.app.domain.Pricing
import net.busyproxy.app.domain.RelayState
import net.busyproxy.app.domain.WalletSnapshot
import net.busyproxy.app.domain.cleanOptionalString
import net.busyproxy.app.relay.RelayForegroundService
import net.busyproxy.app.relay.SharingKeepAlive
import org.json.JSONObject

data class UiState(
    val ready: Boolean = false,
    val consent: Boolean = false,
    val user: AuthUser? = null,
    val sessionToken: String? = null,
    val networkMode: NetworkMode = NetworkMode.AUTOMATIC,
    val wallet: WalletSnapshot = WalletSnapshot(),
    val busy: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val displayNameDraft: String = "",
    val phoneDraft: String = "",
    val codeDraft: String = "",
    val otpStep: Boolean = false,
    val sharingRequested: Boolean = false,
    val relayState: RelayState = RelayState.OFFLINE,
    val egressIp: String? = null,
    val bytesToday: Long = 0,
    val bytesUp: Long = 0,
    val bytesDown: Long = 0,
    val activeStreams: Int = 0,
    val relayMessage: String? = null,
    /** True when OS may kill background work — prompt unrestricted battery */
    val needBatteryUnrestricted: Boolean = false,
)

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val prefs = Prefs(app)
    private val api = ApiClient()
    private val events = EventLogger(app, prefs, api)
    private val _ui = MutableStateFlow(UiState())
    val ui: StateFlow<UiState> = _ui.asStateFlow()
    private var lastRelayState: RelayState? = null

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
                            phone = cleanOptionalString(o.optString("phone", "")) ?: "",
                            displayName = cleanOptionalString(o.optString("displayName", "")),
                            email = cleanOptionalString(o.optString("email", "")),
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
            events.setSession(token, restoredUser?.phone)
            if (token != null) {
                events.log(
                    "session_restored",
                    message = "Session restored from disk",
                    journeyStep = 6,
                )
                events.log("logged_in", message = "Already signed in", journeyStep = 6)
                refreshWallet()
            } else {
                events.log(
                    "not_logged_in",
                    message =
                        if (!_ui.value.consent) {
                            "Awaiting consent"
                        } else {
                            "On login screen"
                        },
                    props =
                        mapOf(
                            "hasConsent" to _ui.value.consent,
                            "reason" to if (!_ui.value.consent) "needs_consent" else "needs_otp",
                        ),
                    journeyStep = if (!_ui.value.consent) 3 else 4,
                )
                if (!_ui.value.consent) {
                    events.log("consent_shown", journeyStep = 3)
                } else {
                    events.log("login_screen", journeyStep = 4)
                }
            }
            // Faster re-login: restore last phone + name (kept after logout)
            if (token == null) {
                val lastPhone = prefs.peekLastLoginPhone()
                val lastName = prefs.peekLastLoginDisplayName()
                val returning =
                    !lastPhone.isNullOrBlank() || !lastName.isNullOrBlank()
                if (returning) {
                    _ui.value =
                        _ui.value.copy(
                            phoneDraft = lastPhone ?: _ui.value.phoneDraft,
                            displayNameDraft = lastName ?: _ui.value.displayNameDraft,
                        )
                    if (_ui.value.consent) {
                        events.log(
                            "login_screen_returning",
                            message = "Returning user with saved phone/name",
                            props =
                                mapOf(
                                    "hasPhone" to !lastPhone.isNullOrBlank(),
                                    "hasName" to !lastName.isNullOrBlank(),
                                ),
                            journeyStep = 4,
                        )
                    }
                }
                // Country dial from IP only when we have no saved full number
                if (_ui.value.phoneDraft.replace(Regex("\\D"), "").length <= 4) {
                    runCatching {
                        val hint =
                            withContext(Dispatchers.IO) { api.phoneHint() }
                        val prefix = hint.optString("prefix", "").takeIf { it.isNotBlank() }
                        if (prefix != null &&
                            _ui.value.phoneDraft.replace(Regex("\\D"), "").length <= 4
                        ) {
                            _ui.value = _ui.value.copy(phoneDraft = "$prefix ")
                        }
                    }
                }
            } else {
                events.log("home_ready", journeyStep = 7)
                // Revive FGS if user left sharing on (process death / update)
                SharingKeepAlive.ensureSharingIfWanted(getApplication())
                val wanted = prefs.peekSharingWanted()
                if (wanted) {
                    _ui.value = _ui.value.copy(sharingRequested = true)
                }
                refreshBatteryHint()
            }
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
                // Prefer live FGS counters when sharing; prefs is a fallback
                if (!_ui.value.sharingRequested) {
                    _ui.value =
                        _ui.value.copy(
                            bytesUp = up,
                            bytesDown = down,
                            bytesToday = up + down,
                        )
                }
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
                val prev = lastRelayState
                lastRelayState = st.state
                _ui.value =
                    _ui.value.copy(
                        sharingRequested = st.state != RelayState.OFFLINE && st.state != RelayState.STOPPING,
                        relayState = st.state,
                        egressIp = st.egressIp,
                        activeStreams = st.activeStreams,
                        relayMessage = st.message,
                        bytesUp = st.bytesUp,
                        bytesDown = st.bytesDown,
                        bytesToday = st.bytesUp + st.bytesDown,
                    )
                if (prev != st.state) {
                    events.log(
                        "relay_state",
                        message = st.state.name,
                        props =
                            mapOf(
                                "state" to st.state.name,
                                "egressIp" to st.egressIp,
                                "streams" to st.activeStreams,
                            ),
                        journeyStep = 8,
                    )
                    when (st.state) {
                        RelayState.CONNECTING_TUNNEL,
                        RelayState.VERIFYING_EGRESS,
                        RelayState.PREPARING,
                        ->
                            events.log(
                                "tunnel_connecting",
                                message = st.state.name,
                                journeyStep = 8,
                            )
                        RelayState.ONLINE -> {
                            events.log(
                                "tunnel_online",
                                message = "Sharing online",
                                props = mapOf("egressIp" to st.egressIp),
                                journeyStep = 9,
                            )
                            events.markFullyFunctional(st.egressIp)
                        }
                        else -> {
                            if (prev == RelayState.ONLINE) {
                                events.log(
                                    "tunnel_offline",
                                    message = st.state.name,
                                    journeyStep = 8,
                                )
                            }
                        }
                    }
                }
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
        events.log("otp_code_autofill", journeyStep = 5)
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
            events.log("consent_accepted", journeyStep = 3)
            events.log("login_screen", journeyStep = 4)
        }
    }

    fun setMode(mode: NetworkMode) {
        viewModelScope.launch {
            prefs.setNetworkMode(mode)
            events.log(
                "network_mode_changed",
                message = mode.apiValue,
                props = mapOf("mode" to mode.apiValue),
                journeyStep = 7,
            )
        }
    }

    fun sendOtp() {
        val name = _ui.value.displayNameDraft.trim()
        if (name.length < 2) {
            _ui.value = _ui.value.copy(error = "Enter a display name (at least 2 characters)")
            events.log(
                "otp_start_fail",
                message = "Display name too short",
                props = mapOf("reason" to "name_invalid"),
                journeyStep = 5,
            )
            return
        }
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busy = true, error = null, info = null)
            events.log(
                "otp_start",
                props =
                    mapOf(
                        "hasName" to true,
                        "phoneLen" to _ui.value.phoneDraft.filter { it.isDigit() }.length,
                    ),
                journeyStep = 5,
            )
            try {
                withContext(Dispatchers.IO) {
                    api.startOtp(_ui.value.phoneDraft, name)
                }
                prefs.setLastLoginHints(_ui.value.phoneDraft, name)
                events.log("otp_start_ok", message = "OTP requested", journeyStep = 5)
                _ui.value =
                    _ui.value.copy(
                        busy = false,
                        otpStep = true,
                        codeDraft = "",
                        info = "Code sent — SMS will autofill when it arrives",
                    )
            } catch (t: Throwable) {
                events.log(
                    "otp_start_fail",
                    message = t.message,
                    props =
                        mapOf(
                            "error" to (t.message ?: ""),
                            "reason" to "api_error",
                        ),
                    journeyStep = 5,
                )
                events.log(
                    "not_logged_in",
                    message = t.message ?: "OTP send failed",
                    props = mapOf("reason" to "otp_start_fail"),
                    journeyStep = 5,
                )
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
            events.log(
                "otp_verify_fail",
                message = "Code not 6 digits",
                props = mapOf("reason" to "code_incomplete", "len" to code.length),
                journeyStep = 5,
            )
            _ui.value = _ui.value.copy(error = "Enter the 6-digit code")
            return
        }
        if (_ui.value.busy) return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busy = true, error = null)
            events.log("otp_verify", journeyStep = 5)
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
                        .put(
                            "displayName",
                            session.user.displayName ?: JSONObject.NULL,
                        )
                        .put("email", session.user.email ?: JSONObject.NULL)
                        .toString()
                prefs.setSession(session.sessionToken, userJson)
                prefs.setLastLoginHints(
                    session.user.phone,
                    session.user.displayName ?: _ui.value.displayNameDraft,
                )
                events.setSession(session.sessionToken, session.user.phone)
                events.log("otp_verify_ok", message = "OTP accepted", journeyStep = 6)
                events.log("logged_in", message = "Signed in", journeyStep = 6)
                events.log("home_ready", journeyStep = 7)
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
                events.log(
                    "otp_verify_fail",
                    message = t.message,
                    props =
                        mapOf(
                            "error" to (t.message ?: ""),
                            "reason" to "bad_code_or_api",
                        ),
                    journeyStep = 5,
                )
                events.log(
                    "not_logged_in",
                    message = t.message ?: "Verify failed",
                    props = mapOf("reason" to "otp_verify_fail"),
                    journeyStep = 5,
                )
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
            events.log("logout", journeyStep = 10)
            events.flushAsync()
            stopSharing()
            prefs.clearSession()
            events.setSession(null, null)
            _ui.value = UiState(ready = true, consent = _ui.value.consent)
            events.log("not_logged_in", message = "After logout", props = mapOf("reason" to "logout"), journeyStep = 4)
            events.log("login_screen", journeyStep = 4)
        }
    }

    /**
     * Soft-delete server account with a required reason + clear local data.
     */
    fun deleteAccount(reasonCode: String, reasonText: String? = null) {
        viewModelScope.launch {
            val token = _ui.value.sessionToken
            if (token == null) {
                _ui.value = _ui.value.copy(error = "Not signed in")
                return@launch
            }
            if (reasonCode.isBlank()) {
                _ui.value = _ui.value.copy(error = "Select a reason for deleting your account")
                return@launch
            }
            if (reasonCode == "other" && reasonText.orEmpty().trim().length < 3) {
                _ui.value =
                    _ui.value.copy(error = "Please describe why you are deleting (Other)")
                return@launch
            }
            _ui.value = _ui.value.copy(busy = true, error = null, info = null)
            events.log(
                "account_delete_attempt",
                props = mapOf("reasonCode" to reasonCode),
                journeyStep = 10,
            )
            try {
                stopSharing()
                withContext(Dispatchers.IO) {
                    api.deleteAccount(token, reasonCode, reasonText)
                }
                events.log(
                    "account_delete_ok",
                    props = mapOf("reasonCode" to reasonCode),
                    journeyStep = 10,
                )
                events.flushAsync()
                prefs.clearAccountLocalData()
                events.setSession(null, null)
                _ui.value =
                    UiState(
                        ready = true,
                        consent = true,
                        info = "Account deleted",
                    )
            } catch (t: Throwable) {
                events.log(
                    "account_delete_fail",
                    message = t.message,
                    props = mapOf("error" to (t.message ?: "")),
                    journeyStep = 10,
                )
                _ui.value =
                    _ui.value.copy(
                        busy = false,
                        error = friendlyNetError(t, "Could not delete account"),
                    )
            }
        }
    }

    fun logAccountOpen() {
        events.log("account_open", journeyStep = 10)
    }

    fun logSupportOpen() {
        events.log("support_open", journeyStep = 10)
    }

    /** POST_NOTIFICATIONS prompt shown (Android 13+). */
    fun logNotifPermissionAsked() {
        events.log(
            "notif_permission_asked",
            message = "Notification permission prompt",
            journeyStep = 2,
        )
    }

    fun logNotifPermission(granted: Boolean) {
        events.log(
            if (granted) "notif_permission_granted" else "notif_permission_denied",
            message = if (granted) "Notifications allowed" else "Notifications denied",
            props = mapOf("granted" to granted),
            journeyStep = 2,
        )
    }

    fun onAppForeground() {
        events.log("app_foreground", journeyStep = 2)
    }

    fun onAppBackground() {
        events.log("app_background", journeyStep = 2)
        events.flushAsync()
    }

    fun refreshWallet() {
        viewModelScope.launch { refreshHomeData() }
    }

    /** Pull-to-refresh: wallet + clear transient messages. */
    suspend fun refreshHomeData() {
        val token = _ui.value.sessionToken ?: return
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
                    error = null,
                    info = null,
                )
        } catch (t: Throwable) {
            _ui.value =
                _ui.value.copy(
                    error = friendlyNetError(t, "Could not refresh"),
                )
        }
    }

    fun startSharing() {
        if (!_ui.value.consent) {
            events.log(
                "share_start_blocked",
                message = "Accept disclosure first",
                props = mapOf("reason" to "needs_consent"),
                journeyStep = 8,
            )
            events.log(
                "not_logged_in",
                message = "Share blocked: no consent",
                props = mapOf("reason" to "needs_consent"),
                journeyStep = 3,
            )
            _ui.value = _ui.value.copy(error = "Accept disclosure first")
            return
        }
        if (_ui.value.sessionToken == null) {
            events.log(
                "share_start_blocked",
                message = "Sign in first",
                props = mapOf("reason" to "share_without_login"),
                journeyStep = 8,
            )
            events.log(
                "not_logged_in",
                message = "Share blocked: not signed in",
                props = mapOf("reason" to "share_without_login"),
                journeyStep = 4,
            )
            _ui.value = _ui.value.copy(error = "Sign in first")
            return
        }
        events.log(
            "share_start",
            props = mapOf("mode" to _ui.value.networkMode.apiValue),
            journeyStep = 8,
        )
        // UI first — never block main on DataStore / keep-alive
        _ui.value =
            _ui.value.copy(
                sharingRequested = true,
                error = null,
                info = "Sharing stays on in the background via a persistent notification",
            )
        // Persist + FGS (keep-alive is async; service also marks sharingWanted)
        viewModelScope.launch {
            runCatching { prefs.setSharingWanted(true) }
        }
        SharingKeepAlive.onSharingStarted(getApplication())
        RelayForegroundService.start(getApplication())
        refreshBatteryHint()
    }

    fun stopSharing() {
        events.log("share_stop", journeyStep = 8)
        _ui.value =
            _ui.value.copy(
                sharingRequested = false,
                needBatteryUnrestricted = false,
                info = null,
            )
        viewModelScope.launch {
            runCatching { prefs.setSharingWanted(false) }
        }
        SharingKeepAlive.onSharingStopped(getApplication())
        RelayForegroundService.stop(getApplication())
    }

    fun refreshBatteryHint() {
        try {
            val unrestricted = SharingKeepAlive.isBatteryUnrestricted(getApplication())
            _ui.value =
                _ui.value.copy(
                    needBatteryUnrestricted =
                        _ui.value.sharingRequested && !unrestricted,
                )
        } catch (_: Throwable) {
            _ui.value = _ui.value.copy(needBatteryUnrestricted = false)
        }
    }

    fun markBatteryPromptShown() {
        viewModelScope.launch { prefs.setBatteryOptPrompted(true) }
        refreshBatteryHint()
    }

    /** True once — auto system dialog; card remains if still restricted. */
    suspend fun shouldAutoPromptBattery(): Boolean {
        if (!_ui.value.needBatteryUnrestricted) return false
        if (prefs.peekBatteryOptPrompted()) return false
        prefs.setBatteryOptPrompted(true)
        return true
    }
}
