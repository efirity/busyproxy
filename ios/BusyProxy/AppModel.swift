import Combine
import Foundation
import SwiftUI
import UIKit

@MainActor
final class AppModel: ObservableObject {
    let prefs: Prefs
    let relay: RelayEngine
    let vpn = VPNManager.shared
    private let api = ApiClient()
    private var cancellables = Set<AnyCancellable>()
    private var statsTimer: Timer?

    @Published var wallet: WalletSnapshot?
    @Published var authBusy = false
    @Published var authError: String?
    @Published var otpSent = false
    @Published var pendingPhone = ""
    @Published var pendingName = ""
    /// true when Packet Tunnel extension is driving the session
    @Published var usingPacketTunnel = false
    @Published var neStatusNote: String = ""
    @Published var profileBusy = false
    @Published var profileMessage: String?
    @Published var profileError: String?
    @Published var stripeBusy = false
    @Published var stripeMessage: String?
    @Published var stripeError: String?

    var isSignedIn: Bool { prefs.sessionToken != nil }

    init() {
        let prefs = Prefs()
        self.prefs = prefs
        self.relay = RelayEngine(prefs: prefs)
        // Prefs: forward so consent / sign-in gates on RootView update.
        // Do NOT forward relay.objectWillChange — byte counters fire ~1/s and remounted TabView
        // back to Home. HomeView observes RelayEngine via @ObservedObject instead.
        prefs.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
        vpn.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)

        Task { await vpn.prepare() }
        startSharedStatsPolling()
        // Android-parity funnel logs → admin User Journey
        EventLogger.shared.attach(prefs: prefs)
        if prefs.consentAccepted {
            if prefs.sessionToken != nil {
                EventLogger.shared.log("session_restored", message: "Session restored", journeyStep: 6)
                EventLogger.shared.log("logged_in", message: "Already signed in", journeyStep: 6)
                EventLogger.shared.log("home_ready", journeyStep: 7)
            } else {
                EventLogger.shared.log("not_logged_in", message: "On login screen", props: ["reason": "needs_otp"], journeyStep: 4)
                EventLogger.shared.log("login_screen", journeyStep: 4)
            }
        } else {
            EventLogger.shared.log("consent_shown", journeyStep: 3)
        }
    }

    private func startSharedStatsPolling() {
        statsTimer?.invalidate()
        // 1.5s is enough for counters + lock screen; lighter than 1Hz full-tree churn.
        statsTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                let sharing =
                    self.usingPacketTunnel || self.vpn.isConnected || self.relay.isSharingActive
                // Idle: skip App Group + Live Activity work entirely.
                guard sharing else { return }
                self.pullSharedStatsIfNeeded()
                self.pushLockScreenStatus()
            }
        }
        // Keep timer cheap when app is backgrounded (system coalesces RunLoop).
        statsTimer?.tolerance = 0.4
    }

    private func pullSharedStatsIfNeeded() {
        guard usingPacketTunnel || vpn.isConnected else { return }
        // Sync NE-enrolled device identity back into app prefs (stable fleet row)
        let store = SharedSessionStore.shared
        if let did = store.deviceId, !did.isEmpty, prefs.deviceId != did {
            prefs.deviceId = did
        }
        if let sec = store.deviceSecret, !sec.isEmpty, prefs.deviceSecret != sec {
            prefs.deviceSecret = sec
        }
        let s = store.readStatus()
        // Mirror into relay for HomeView display
        if s.state == "online" {
            let wasOnline = relay.state == .online
            relay.applyExternalStatus(
                state: .online,
                message: s.message.isEmpty
                    ? L10n.t("relay_online")
                    : RelayEngine.userFacingRelayMessage(s.message),
                bytesUp: s.bytesUp,
                bytesDown: s.bytesDown,
                streams: s.streams,
                egressIp: s.egressIp,
            )
            if !wasOnline {
                EventLogger.shared.log(
                    "tunnel_online",
                    message: s.egressIp ?? "online",
                    journeyStep: 9,
                )
                EventLogger.shared.markFullyFunctional(detail: s.egressIp)
            }
        } else if s.state == "offline" || s.state == "Stopped" {
            // keep UI in sync when NE stops externally
            if usingPacketTunnel, !vpn.isConnected {
                usingPacketTunnel = false
            }
        } else if s.state == "connecting" || s.state == "preparing" || s.state == "reconnecting" {
            let st: RelayState = s.state == "reconnecting" ? .reconnecting : .connecting
            relay.applyExternalStatus(
                state: st,
                message: RelayEngine.userFacingRelayMessage(
                    s.message.isEmpty ? L10n.t("relay_reconnecting") : s.message,
                ),
                bytesUp: s.bytesUp,
                bytesDown: s.bytesDown,
                streams: s.streams,
                egressIp: s.egressIp,
            )
        }
    }

    /// Lock Screen Live Activity + sticky-style notification (Android FGS parity).
    private func pushLockScreenStatus() {
        let sharing =
            usingPacketTunnel || vpn.isConnected || relay.isSharingActive
            || relay.state == .online || relay.state == .connecting || relay.state == .reconnecting
        guard sharing else { return }

        let s = SharedSessionStore.shared.readStatus()
        let up = max(relay.bytesUp, s.bytesUp)
        let down = max(relay.bytesDown, s.bytesDown)
        let streams = max(relay.activeStreams, s.streams)
        let ip = relay.egressIp ?? s.egressIp
        let network = prefs.networkMode.title
        let statusText: String = {
            if s.state == "online" || relay.state == .online { return "Sharing on" }
            if s.state == "reconnecting" || relay.state == .reconnecting { return "Reconnecting…" }
            if s.state == "connecting" || s.state == "preparing" || relay.state == .connecting {
                return "Connecting…"
            }
            // Never push HTML/502 bodies into Live Activity
            return RelayEngine.userFacingRelayMessage(s.message.isEmpty ? "Sharing" : s.message)
        }()

        Task {
            await SharingStatusPresenter.shared.update(
                statusText: statusText,
                bytesUp: up,
                bytesDown: down,
                streams: streams,
                egressIp: ip,
                networkLabel: network,
            )
        }
    }

    func acceptConsent() {
        prefs.consentAccepted = true
        EventLogger.shared.log("consent_accepted", journeyStep: 3)
        EventLogger.shared.log("login_screen", journeyStep: 4)
        // Explicit publish in case nested ObservableObject timing is subtle on device.
        objectWillChange.send()
    }

    func fetchPhoneHint() async throws -> PhoneHint {
        try await api.phoneHint()
    }

    func sendOtp(phone: String, name: String) async {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalized = PhoneInput.normalizeE164(phone)
        authBusy = true
        authError = nil
        defer { authBusy = false }
        guard trimmedName.count >= 2 else {
            authError = L10n.t("err_name_short")
            return
        }
        guard PhoneInput.digits(in: normalized).count >= 8 else {
            authError = L10n.t("err_phone_invalid")
            return
        }
        EventLogger.shared.log("otp_start", message: normalized, journeyStep: 5)
        do {
            try await api.startOtp(phone: normalized, displayName: trimmedName)
            pendingPhone = normalized
            pendingName = trimmedName
            prefs.setLastLoginHints(phone: normalized, name: trimmedName)
            otpSent = true
            EventLogger.shared.log("otp_start_ok", message: "OTP requested", journeyStep: 5)
            objectWillChange.send()
        } catch {
            authError = error.localizedDescription
            EventLogger.shared.log(
                "otp_start_fail",
                message: error.localizedDescription,
                props: ["reason": error.localizedDescription],
                journeyStep: 5,
            )
        }
    }

    func verifyOtp(code: String) async {
        authBusy = true
        authError = nil
        defer { authBusy = false }
        EventLogger.shared.log("otp_verify", journeyStep: 5)
        do {
            let session = try await api.verifyOtp(phone: pendingPhone, code: code)
            guard let token = session.bearer else {
                authError = L10n.t("err_no_token")
                EventLogger.shared.log("otp_verify_fail", message: "No token", journeyStep: 5)
                return
            }
            prefs.sessionToken = token
            prefs.userId = session.user?.id
            prefs.phone = session.user?.phone ?? pendingPhone
            prefs.displayName = session.user?.displayName ?? pendingName
            prefs.setLastLoginHints(
                phone: prefs.phone ?? pendingPhone,
                name: prefs.displayName ?? pendingName,
            )
            otpSent = false
            EventLogger.shared.log("otp_verify_ok", message: "OTP accepted", journeyStep: 6)
            EventLogger.shared.log("logged_in", message: "Signed in", journeyStep: 6)
            EventLogger.shared.log("home_ready", journeyStep: 7)
            objectWillChange.send()
            await refreshWallet()
            EventLogger.shared.flushSoon()
        } catch {
            authError = error.localizedDescription
            EventLogger.shared.log(
                "otp_verify_fail",
                message: error.localizedDescription,
                props: ["reason": error.localizedDescription],
                journeyStep: 5,
            )
        }
    }

    func logout() {
        Task { await stopSharing() }
        EventLogger.shared.log("logout", journeyStep: 10)
        prefs.clearSession()
        wallet = nil
        EventLogger.shared.log("not_logged_in", message: "After logout", props: ["reason": "logout"], journeyStep: 4)
        EventLogger.shared.log("login_screen", journeyStep: 4)
        EventLogger.shared.flushSoon()
    }

    func setLanguage(_ lang: AppLanguage) {
        prefs.languageCode = lang.rawValue
        L10n.language = lang
        relay.refreshLocalizedMessages()
        objectWillChange.send()
    }

    func refreshWallet() async {
        guard let token = prefs.sessionToken else { return }
        do {
            wallet = try await api.wallet(token: token)
        } catch {
            // non-fatal
        }
    }

    /// Save display name via PATCH /api/auth/profile.
    func saveDisplayName(_ raw: String) async {
        guard let token = prefs.sessionToken else {
            profileError = L10n.t("relay_sign_in")
            return
        }
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard name.count >= 2 else {
            profileError = L10n.t("err_name_short")
            return
        }
        profileBusy = true
        profileError = nil
        profileMessage = nil
        defer { profileBusy = false }
        do {
            let user = try await api.updateProfile(token: token, displayName: name)
            prefs.displayName = user.displayName ?? name
            prefs.setLastLoginHints(
                phone: prefs.phone ?? "",
                name: prefs.displayName ?? name,
            )
            profileMessage = L10n.t("name_saved")
            objectWillChange.send()
        } catch {
            profileError = error.localizedDescription
        }
    }

    /// Open Stripe Connect onboarding in Safari; return via busyproxy://stripe
    func linkStripePayout() async {
        guard let token = prefs.sessionToken else {
            stripeError = L10n.t("relay_sign_in")
            return
        }
        stripeBusy = true
        stripeError = nil
        stripeMessage = nil
        defer { stripeBusy = false }
        do {
            let result = try await api.stripeConnectOnboard(token: token)
            if let w = result.wallet { wallet = w }
            guard let url = URL(string: result.url) else {
                stripeError = L10n.t("stripe_bad_url")
                return
            }
            stripeMessage = L10n.t("stripe_opening")
            await UIApplication.shared.open(url)
        } catch {
            stripeError = error.localizedDescription
        }
    }

    /// Called when app opens busyproxy://stripe?status=return|refresh
    func handleStripeDeepLink(_ url: URL) async {
        guard url.scheme?.lowercased() == "busyproxy" else { return }
        let host = (url.host ?? url.path).lowercased()
        guard host.contains("stripe") || url.absoluteString.contains("stripe") else { return }
        stripeMessage = L10n.t("stripe_checking")
        await refreshStripeStatus()
    }

    func refreshStripeStatus() async {
        guard let token = prefs.sessionToken else { return }
        stripeBusy = true
        defer { stripeBusy = false }
        do {
            wallet = try await api.stripeConnectRefresh(token: token)
            if wallet?.payoutsEnabled == true {
                stripeMessage = L10n.t("stripe_ready")
                stripeError = nil
            } else {
                stripeMessage = L10n.t("stripe_pending")
            }
        } catch {
            // Fall back to wallet GET
            await refreshWallet()
            stripeError = error.localizedDescription
        }
    }

    // MARK: Share start/stop (NE preferred on device)

    func startSharing() async {
        guard let token = prefs.sessionToken else {
            authError = L10n.t("relay_sign_in")
            EventLogger.shared.log(
                "share_start_blocked",
                message: "Sign in required",
                props: ["reason": "not_signed_in"],
                journeyStep: 8,
            )
            return
        }
        if !prefs.consentAccepted {
            EventLogger.shared.log(
                "share_start_blocked",
                message: "Consent required",
                props: ["reason": "needs_consent"],
                journeyStep: 8,
            )
            return
        }
        neStatusNote = ""
        EventLogger.shared.log("share_start", message: "Start sharing", journeyStep: 8)
        EventLogger.shared.log("tunnel_connecting", journeyStep: 8)
        await SharingStatusPresenter.shared.start(
            statusText: "Starting…",
            bytesUp: 0,
            bytesDown: 0,
            streams: 0,
            egressIp: nil,
            networkLabel: prefs.networkMode.title,
        )
        do {
            try await vpn.startSharing(
                sessionToken: token,
                userId: prefs.userId,
                deviceId: prefs.deviceId,
                deviceSecret: prefs.deviceSecret,
                installId: prefs.installId,
                networkMode: prefs.networkMode.rawValue,
            )
            usingPacketTunnel = true
            neStatusNote = L10n.t("ne_active")
            relay.applyExternalStatus(
                state: .connecting,
                message: L10n.t("relay_connecting"),
                bytesUp: 0,
                bytesDown: 0,
                streams: 0,
                egressIp: nil,
            )
            EventLogger.shared.flushSoon()
        } catch VPNManagerError.simulatorUseInProcess {
            usingPacketTunnel = false
            neStatusNote = L10n.t("ne_sim_fallback")
            relay.start()
            EventLogger.shared.log("info", message: "Simulator in-process tunnel", journeyStep: 8)
        } catch {
            // Device: NE failed → fall back to in-process so sharing still works
            usingPacketTunnel = false
            neStatusNote = L10n.t("ne_fallback", error.localizedDescription as CVarArg)
            EventLogger.shared.log(
                "error",
                message: "NE fallback: \(error.localizedDescription)",
                props: ["reason": error.localizedDescription],
                journeyStep: 8,
            )
            relay.start()
        }
    }

    func stopSharing() async {
        EventLogger.shared.log("share_stop", journeyStep: 8)
        await vpn.stopSharing()
        usingPacketTunnel = false
        neStatusNote = ""
        relay.stop()
        await SharingStatusPresenter.shared.end()
        EventLogger.shared.log("tunnel_offline", message: "Sharing stopped", journeyStep: 8)
        EventLogger.shared.flushSoon()
    }

    func logAccountOpen() {
        EventLogger.shared.log("account_open", journeyStep: 10)
    }

    func logSupportOpen() {
        EventLogger.shared.log("support_open", journeyStep: 10)
    }

    func onAppForeground() {
        EventLogger.shared.onForeground()
    }

    func onAppBackground() {
        EventLogger.shared.onBackground()
    }
}
