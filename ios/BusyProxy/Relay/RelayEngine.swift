import Foundation
import UIKit

enum RelayState: String {
    case offline
    case preparing
    case waitingForNetwork = "waiting_network"
    case connecting
    case online
    case reconnecting
    case stopping
    case error
}

@MainActor
final class RelayEngine: ObservableObject {
    @Published private(set) var state: RelayState = .offline
    @Published private(set) var message: String = L10n.t("relay_idle")
    @Published private(set) var bytesUp: Int64 = 0
    @Published private(set) var bytesDown: Int64 = 0
    @Published private(set) var egressIp: String?
    @Published private(set) var activeStreams: Int = 0

    private let prefs: Prefs
    private let api = ApiClient()
    private let pathSelector = NetworkPathSelector()
    private lazy var dialer = StreamDialer()
    private lazy var tunnel = TunnelClient(dialer: dialer, pathSelector: pathSelector)

    private var wantRun = false
    private var loopTask: Task<Void, Never>?
    private var bgTask: UIBackgroundTaskIdentifier = .invalid
    private let byteLock = NSLock()
    private var upAcc: Int64 = 0
    private var downAcc: Int64 = 0
    /// Bumped on every stop so in-flight loop iterations discard results.
    private var runGeneration: UInt64 = 0
    /// Throttle high-frequency byte publishes so HomeView stays smooth.
    private var lastByteUIPublish: Date = .distantPast
    private var lastPublishedStreams: Int = -1
    private let byteUIInterval: TimeInterval = 0.5

    init(prefs: Prefs) {
        self.prefs = prefs
        dialer.onBytes = { [weak self] up, down in
            guard let self else { return }
            self.byteLock.lock()
            self.upAcc += up
            self.downAcc += down
            let u = self.upAcc
            let d = self.downAcc
            self.byteLock.unlock()
            let streams = self.dialer.activeCount()
            Task { @MainActor in
                guard self.wantRun else { return }
                self.publishBytesIfNeeded(up: u, down: d, streams: streams, force: false)
            }
        }
        tunnel.statsProvider = { [weak self] in
            guard let self, self.wantRun else { return (0, 0, 0, nil) }
            self.byteLock.lock()
            let u = self.upAcc
            let d = self.downAcc
            self.byteLock.unlock()
            return (u, d, self.dialer.activeCount(), self.egressIp)
        }
        tunnel.onState = { [weak self] connected, detail in
            Task { @MainActor in
                guard let self, self.wantRun else { return }
                if connected {
                    self.state = .online
                    self.message = L10n.t("relay_online")
                } else {
                    // Only reconnect while user still wants sharing on
                    self.state = .reconnecting
                    self.message = detail ?? L10n.t("relay_reconnecting")
                }
            }
        }
    }

    var isSharingActive: Bool {
        switch state {
        case .offline, .error:
            return false
        case .preparing, .waitingForNetwork, .connecting, .online, .reconnecting, .stopping:
            return true
        }
    }

    func start() {
        if wantRun, loopTask != nil {
            // Already running
            return
        }
        // Ensure previous loop fully abandoned
        wantRun = false
        loopTask?.cancel()
        loopTask = nil
        tunnel.disconnect(reason: "restart")

        wantRun = true
        runGeneration &+= 1
        let gen = runGeneration
        beginBackgroundGrace()
        state = .preparing
        message = L10n.t("relay_starting")
        loopTask = Task { [weak self] in
            await self?.runLoop(generation: gen)
        }
    }

    func stop() {
        #if DEBUG
        print("[BpRelay] stop requested (state=\(state.rawValue))")
        #endif
        wantRun = false
        runGeneration &+= 1
        loopTask?.cancel()
        loopTask = nil

        state = .stopping
        message = L10n.t("relay_stopped")

        // Tear down sockets immediately (must not wait for run loop)
        tunnel.disconnect(reason: "user_stop")
        dialer.closeAll()
        activeStreams = 0
        endBackgroundGrace()

        state = .offline
        message = L10n.t("relay_stopped")
        #if DEBUG
        print("[BpRelay] stop complete → offline")
        #endif
    }

    /// Mirror Packet Tunnel extension status into UI-bound fields.
    func applyExternalStatus(
        state: RelayState,
        message: String,
        bytesUp: Int64,
        bytesDown: Int64,
        streams: Int,
        egressIp: String?,
    ) {
        // Don't fight an in-process run loop
        if wantRun, loopTask != nil { return }
        // Skip no-op publishes — keeps TabView / HomeView from thrashing every second.
        let stateChanged = self.state != state
        let msgChanged = self.message != message
        let streamsChanged = activeStreams != streams
        let ipChanged = self.egressIp != egressIp
        let bytesChanged = self.bytesUp != bytesUp || self.bytesDown != bytesDown
        guard stateChanged || msgChanged || streamsChanged || ipChanged || bytesChanged else { return }

        if stateChanged { self.state = state }
        if msgChanged { self.message = message }
        if streamsChanged { activeStreams = streams }
        if ipChanged { self.egressIp = egressIp }
        if bytesChanged {
            self.bytesUp = bytesUp
            self.bytesDown = bytesDown
        }
        byteLock.lock()
        upAcc = bytesUp
        downAcc = bytesDown
        byteLock.unlock()
        lastByteUIPublish = Date()
        lastPublishedStreams = streams
    }

    /// Push accumulated counters to @Published fields at most ~2×/s (or force on state changes).
    private func publishBytesIfNeeded(up: Int64, down: Int64, streams: Int, force: Bool) {
        let now = Date()
        let due = force || now.timeIntervalSince(lastByteUIPublish) >= byteUIInterval
            || streams != lastPublishedStreams
        guard due else { return }
        lastByteUIPublish = now
        lastPublishedStreams = streams
        if bytesUp != up { bytesUp = up }
        if bytesDown != down { bytesDown = down }
        if activeStreams != streams { activeStreams = streams }
    }

    /// Re-apply copy after in-app language change.
    func refreshLocalizedMessages() {
        switch state {
        case .offline:
            message = L10n.t("relay_idle")
        case .preparing:
            message = L10n.t("relay_starting")
        case .waitingForNetwork:
            message = L10n.t("relay_checking_network")
        case .connecting:
            message = L10n.t("relay_connecting")
        case .online:
            message = L10n.t("relay_online")
        case .reconnecting:
            message = L10n.t("relay_reconnecting")
        case .stopping:
            message = L10n.t("relay_stopped")
        case .error:
            break
        }
    }

    private func stillCurrent(_ generation: UInt64) -> Bool {
        wantRun && !Task.isCancelled && generation == runGeneration
    }

    private func runLoop(generation: UInt64) async {
        var failStreak = 0
        defer {
            // Only the active generation may clear loopTask / final disconnect
            Task { @MainActor in
                if self.runGeneration == generation {
                    self.loopTask = nil
                    if !self.wantRun {
                        self.tunnel.disconnect(reason: "loop_end")
                        self.state = .offline
                        self.message = L10n.t("relay_stopped")
                        self.activeStreams = 0
                    }
                }
            }
        }

        while stillCurrent(generation) {
            do {
                guard prefs.consentAccepted else {
                    state = .error
                    message = L10n.t("relay_accept_consent")
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    continue
                }
                guard let token = prefs.sessionToken else {
                    state = .error
                    message = L10n.t("relay_sign_in")
                    try await Task.sleep(nanoseconds: 3_000_000_000)
                    continue
                }

                guard stillCurrent(generation) else { break }

                state = .waitingForNetwork
                message = L10n.t("relay_checking_network")
                if !pathSelector.hasSatisfiedPath {
                    try await Task.sleep(nanoseconds: 500_000_000)
                }

                guard stillCurrent(generation) else { break }

                state = .connecting
                message = L10n.t("relay_enrolling")

                // Public egress IP → edge geo (city/country/ISP) for admin Location column
                let publicIp = await EgressIpProbe.fetch()
                if let publicIp {
                    egressIp = publicIp
                }

                let networkLabel = pathSelector.transportLabel(for: prefs.networkMode)
                let enroll = try await api.enroll(
                    token: token,
                    deviceId: prefs.deviceId,
                    name: UIDevice.current.name,
                    network: networkLabel == "wifi" ? "wifi" : "cellular",
                    userId: prefs.userId,
                    installId: prefs.installId,
                    publicIp: publicIp,
                    deviceSecret: prefs.deviceSecret,
                )

                guard stillCurrent(generation) else { break }

                prefs.deviceId = enroll.deviceId
                if let secret = enroll.deviceSecret, !secret.isEmpty {
                    prefs.deviceSecret = secret
                }
                if publicIp != nil {
                    Task { await api.refreshDeviceGeo(token: token, deviceId: enroll.deviceId) }
                }
                let agentUrl = (enroll.agentUrl?.isEmpty == false)
                    ? enroll.agentUrl!
                    : AppConfig.agentWss
                let secret = prefs.deviceSecret ?? ""

                message = L10n.t("relay_connecting")
                await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
                    var resumed = false
                    let resumeOnce = {
                        if !resumed {
                            resumed = true
                            cont.resume()
                        }
                    }
                    tunnel.onHelloAck = { resumeOnce() }
                    tunnel.connect(
                        agentUrl: agentUrl,
                        deviceId: enroll.deviceId,
                        deviceSecret: secret,
                        networkMode: prefs.networkMode,
                        userId: prefs.userId,
                        egressIp: publicIp ?? self.egressIp,
                    )
                    Task {
                        try? await Task.sleep(nanoseconds: 12_000_000_000)
                        resumeOnce()
                    }
                }

                guard stillCurrent(generation) else { break }

                state = .online
                message = L10n.t("relay_online")
                failStreak = 0

                while stillCurrent(generation), state == .online || state == .reconnecting {
                    try await Task.sleep(nanoseconds: 1_000_000_000)
                    activeStreams = dialer.activeCount()
                    if state == .reconnecting {
                        break
                    }
                }
            } catch is CancellationError {
                break
            } catch {
                guard stillCurrent(generation) else { break }
                failStreak += 1
                state = .reconnecting
                message = error.localizedDescription
                tunnel.disconnect(reason: "error")
                let backoff = UInt64(min(30, 2 + failStreak * 2)) * 1_000_000_000
                try? await Task.sleep(nanoseconds: backoff)
            }
        }
    }

    private func beginBackgroundGrace() {
        endBackgroundGrace()
        bgTask = UIApplication.shared.beginBackgroundTask(withName: "bp.tunnel") { [weak self] in
            self?.endBackgroundGrace()
        }
    }

    private func endBackgroundGrace() {
        if bgTask != .invalid {
            UIApplication.shared.endBackgroundTask(bgTask)
            bgTask = .invalid
        }
    }
}
