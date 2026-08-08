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
        // Prefs / relay / vpn publish separately — forward so RootView (env AppModel) re-renders.
        // Without this, acceptConsent() saved true but the consent screen never advanced.
        prefs.objectWillChange
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
        relay.objectWillChange
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
        statsTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.pullSharedStatsIfNeeded()
            }
        }
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
    }
}
