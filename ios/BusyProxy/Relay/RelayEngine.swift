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
    @Published private(set) var message: String = "Idle"
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
    private var upAcc: Int64 = 0
    private var downAcc: Int64 = 0

    init(prefs: Prefs) {
        self.prefs = prefs
        dialer.onBytes = { [weak self] up, down in
            Task { @MainActor in
                guard let self else { return }
                self.upAcc += up
                self.downAcc += down
                self.bytesUp = self.upAcc
                self.bytesDown = self.downAcc
                self.activeStreams = self.dialer.activeCount()
            }
        }
        tunnel.onState = { [weak self] connected, detail in
            Task { @MainActor in
                guard let self, self.wantRun else { return }
                if connected {
                    self.state = .online
                    self.message = "Sharing · tunnel online"
                } else {
                    self.state = .reconnecting
                    self.message = detail ?? "Reconnecting…"
                }
            }
        }
    }

    func start() {
        wantRun = true
        beginBackgroundGrace()
        if loopTask != nil { return }
        state = .preparing
        message = "Starting…"
        loopTask = Task { await runLoop() }
    }

    func stop() {
        wantRun = false
        loopTask?.cancel()
        loopTask = nil
        state = .stopping
        tunnel.disconnect(reason: "user_stop")
        endBackgroundGrace()
        state = .offline
        message = "Stopped"
    }

    private func runLoop() async {
        var failStreak = 0
        while wantRun, !Task.isCancelled {
            do {
                guard prefs.consentAccepted else {
                    state = .error
                    message = "Accept disclosure first"
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    continue
                }
                guard let token = prefs.sessionToken else {
                    state = .error
                    message = "Sign in required"
                    try await Task.sleep(nanoseconds: 3_000_000_000)
                    continue
                }

                state = .waitingForNetwork
                message = "Checking network…"
                if !pathSelector.hasSatisfiedPath {
                    // allow a moment for monitor
                    try await Task.sleep(nanoseconds: 500_000_000)
                }

                state = .connecting
                message = "Enrolling device…"

                let networkLabel = pathSelector.transportLabel(for: prefs.networkMode)
                let enroll = try await api.enroll(
                    token: token,
                    deviceId: prefs.deviceId,
                    name: UIDevice.current.name,
                    network: networkLabel == "wifi" ? "wifi" : "cellular",
                    userId: prefs.userId,
                    installId: prefs.installId,
                    publicIp: nil,
                    deviceSecret: prefs.deviceSecret,
                )
                prefs.deviceId = enroll.deviceId
                if let secret = enroll.deviceSecret, !secret.isEmpty {
                    prefs.deviceSecret = secret
                }
                let agentUrl = (enroll.agentUrl?.isEmpty == false)
                    ? enroll.agentUrl!
                    : AppConfig.agentWss
                let secret = prefs.deviceSecret ?? ""

                message = "Connecting tunnel…"
                await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
                    var resumed = false
                    tunnel.onHelloAck = {
                        if !resumed {
                            resumed = true
                            cont.resume()
                        }
                    }
                    tunnel.connect(
                        agentUrl: agentUrl,
                        deviceId: enroll.deviceId,
                        deviceSecret: secret,
                        networkMode: prefs.networkMode,
                        userId: prefs.userId,
                    )
                    // Don't hang forever if hello_ok missing
                    Task {
                        try? await Task.sleep(nanoseconds: 12_000_000_000)
                        if !resumed {
                            resumed = true
                            cont.resume()
                        }
                    }
                }

                if !wantRun { break }
                state = .online
                message = "Sharing · tunnel online"
                failStreak = 0

                // Stay until stop or disconnect signal
                while wantRun, !Task.isCancelled, state == .online || state == .reconnecting {
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    activeStreams = dialer.activeCount()
                    if state == .reconnecting {
                        break // outer loop re-enrolls
                    }
                }
            } catch {
                failStreak += 1
                state = .reconnecting
                message = error.localizedDescription
                tunnel.disconnect(reason: "error")
                let backoff = UInt64(min(30, 2 + failStreak * 2)) * 1_000_000_000
                try? await Task.sleep(nanoseconds: backoff)
            }
        }
        tunnel.disconnect(reason: "loop_end")
        if wantRun == false {
            state = .offline
            message = "Stopped"
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
