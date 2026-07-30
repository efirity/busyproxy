package net.busyproxy.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import net.busyproxy.app.data.ApiClient
import net.busyproxy.app.data.Prefs
import net.busyproxy.app.domain.AuthUser
import net.busyproxy.app.domain.NetworkMode
import net.busyproxy.app.domain.Pricing
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
    val phoneDraft: String = "+37368182830",
    val codeDraft: String = "",
    val otpStep: Boolean = false,
    val sharingRequested: Boolean = false,
)

class AppViewModel(app: Application) : AndroidViewModel(app) {
    private val prefs = Prefs(app)
    private val api = ApiClient()
    private val _ui = MutableStateFlow(UiState())
    val ui: StateFlow<UiState> = _ui.asStateFlow()

    val consent = prefs.consentAccepted.stateIn(viewModelScope, SharingStarted.Eagerly, false)
    val networkMode = prefs.networkMode.stateIn(viewModelScope, SharingStarted.Eagerly, NetworkMode.PREFER_WIFI)

    init {
        viewModelScope.launch {
            prefs.sessionToken.collect { token ->
                _ui.value =
                    _ui.value.copy(
                        sessionToken = token,
                        ready = true,
                        user = if (token != null) _ui.value.user else null,
                    )
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
    }

    fun setPhone(v: String) {
        _ui.value = _ui.value.copy(phoneDraft = v)
    }

    fun setCode(v: String) {
        _ui.value = _ui.value.copy(codeDraft = v)
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
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busy = true, error = null)
            try {
                withContext(Dispatchers.IO) {
                    api.startOtp(_ui.value.phoneDraft)
                }
                _ui.value =
                    _ui.value.copy(
                        busy = false,
                        otpStep = true,
                        info = "Code sent (Twilio test number only in beta)",
                    )
            } catch (t: Throwable) {
                _ui.value = _ui.value.copy(busy = false, error = t.message)
            }
        }
    }

    fun verifyOtp() {
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busy = true, error = null)
            try {
                val session =
                    withContext(Dispatchers.IO) {
                        api.verifyOtp(_ui.value.phoneDraft, _ui.value.codeDraft)
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
                        info = "Signed in",
                    )
                refreshWallet()
            } catch (t: Throwable) {
                _ui.value = _ui.value.copy(busy = false, error = t.message)
            }
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
