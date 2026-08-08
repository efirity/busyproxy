import Combine
import Foundation
import SwiftUI

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
        let s = SharedSessionStore.shared.readStatus()
        // Mirror into relay for HomeView display
        if s.state == "online" {
            relay.applyExternalStatus(
                state: .online,
                message: s.message.isEmpty ? L10n.t("relay_online") : s.message,
                bytesUp: s.bytesUp,
                bytesDown: s.bytesDown,
                streams: s.streams,
                egressIp: s.egressIp,
            )
        } else if s.state == "offline" || s.state == "Stopped" {
            // keep UI in sync when NE stops externally
            if usingPacketTunnel, !vpn.isConnected {
                usingPacketTunnel = false
            }
        } else if s.state == "connecting" || s.state == "preparing" || s.state == "reconnecting" {
            let st: RelayState = s.state == "reconnecting" ? .reconnecting : .connecting
            relay.applyExternalStatus(
                state: st,
                message: s.message,
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
            return s.message.isEmpty ? "Sharing" : s.message
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
        do {
            try await api.startOtp(phone: normalized, displayName: trimmedName)
            pendingPhone = normalized
            pendingName = trimmedName
            prefs.setLastLoginHints(phone: normalized, name: trimmedName)
            otpSent = true
            objectWillChange.send()
        } catch {
            authError = error.localizedDescription
        }
    }

    func verifyOtp(code: String) async {
        authBusy = true
        authError = nil
        defer { authBusy = false }
        do {
            let session = try await api.verifyOtp(phone: pendingPhone, code: code)
            guard let token = session.bearer else {
                authError = L10n.t("err_no_token")
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
            objectWillChange.send()
            await refreshWallet()
        } catch {
            authError = error.localizedDescription
        }
    }

    func logout() {
        Task { await stopSharing() }
        prefs.clearSession()
        wallet = nil
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

    // MARK: Share start/stop (NE preferred on device)

    func startSharing() async {
        guard let token = prefs.sessionToken else {
            authError = L10n.t("relay_sign_in")
            return
        }
        neStatusNote = ""
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
        } catch VPNManagerError.simulatorUseInProcess {
            usingPacketTunnel = false
            neStatusNote = L10n.t("ne_sim_fallback")
            relay.start()
        } catch {
            // Device: NE failed → fall back to in-process so sharing still works
            usingPacketTunnel = false
            neStatusNote = L10n.t("ne_fallback", error.localizedDescription as CVarArg)
            relay.start()
        }
    }

    func stopSharing() async {
        await vpn.stopSharing()
        usingPacketTunnel = false
        neStatusNote = ""
        relay.stop()
        await SharingStatusPresenter.shared.end()
    }
}
