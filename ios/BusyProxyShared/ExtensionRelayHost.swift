import Foundation
#if canImport(NetworkExtension)
import NetworkExtension
#endif

/// Reverse-tunnel host that runs inside the Packet Tunnel extension (no UIKit).
public final class ExtensionRelayHost: NSObject, URLSessionWebSocketDelegate {
    private let store = SharedSessionStore.shared
    private let api = SharedApiClient()
    private let dialer = SharedStreamDialer()

    private var task: URLSessionWebSocketTask?
    private var session: URLSession?
    /// Dedicated queue — NE main run-loop is unreliable for URLSession / Timer.
    private let sessionQueue = OperationQueue()
    private let workQueue = DispatchQueue(label: "bp.extension.relay", qos: .userInitiated)
    private var generation: Int64 = 0
    private var wantRun = false
    private var loopTask: Task<Void, Never>?
    private var pingSource: DispatchSourceTimer?
    private var statusSource: DispatchSourceTimer?
    private let byteLock = NSLock()
    private var upAcc: Int64 = 0
    private var downAcc: Int64 = 0

    /// Pending hello handshake for current generation.
    private var pendingHelloOk: (() -> Void)?
    private var pendingHelloErr: ((Error) -> Void)?
    private var helloTimeoutWork: DispatchWorkItem?
    private var helloSent = false
    private var socketOpened = false
    /// Set true after hello_ok so we treat the agent as live for traffic.
    private var helloCompleted = false

    private var pendingHelloDeviceId: String?
    private var pendingHelloSecret: String?
    private var pendingHelloNetwork: String?
    private var pendingHelloUserId: String?
    private var pendingHelloGen: Int64 = 0

    public var onBecameReady: (() -> Void)?
    public var onFailed: ((Error) -> Void)?

    /// User-facing reconnect copy — never raw HTML / nginx / 502 pages.
    static func friendlyReconnectMessage(_ error: Error) -> String {
        let s = error.localizedDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        let lower = s.lowercased()
        if s.isEmpty
            || s.contains("<html") || s.contains("<!DOCTYPE") || s.contains("<head")
            || lower.contains("bad gateway") || lower.contains("502")
            || lower.contains("503") || lower.contains("504")
            || lower.contains("nginx") || lower.contains("<center>")
            || s.count > 80
        {
            return "Reconnecting…"
        }
        return "Reconnecting…"
    }

    /// Packet tunnel provider — required so stream dials use the physical NIC.
    public weak var packetTunnelProvider: NEPacketTunnelProvider? {
        didSet {
            #if canImport(NetworkExtension)
            dialer.packetTunnelProvider = packetTunnelProvider
            #endif
        }
    }

    public override init() {
        super.init()
        sessionQueue.name = "bp.extension.urlsession"
        sessionQueue.maxConcurrentOperationCount = 1
        wireDialer()
    }

    private func wireDialer() {
        dialer.onUpstream = { [weak self] streamId, data in
            // Bulk uplink — never tear down the whole agent on a single send glitch.
            self?.sendText(
                SharedTunnelProtocol.data(streamId: streamId, b64: data.base64EncodedString()),
                critical: false,
            )
        }
        dialer.onClosed = { [weak self] streamId, reason in
            self?.sendText(
                SharedTunnelProtocol.close(streamId: streamId, reason: reason),
                critical: false,
            )
        }
        dialer.onOpenOk = { [weak self] streamId in
            self?.sendText(SharedTunnelProtocol.openOk(streamId: streamId), critical: true)
        }
        dialer.onOpenErr = { [weak self] streamId, code in
            self?.sendText(SharedTunnelProtocol.openErr(streamId: streamId, code: code), critical: true)
        }
        dialer.onBytes = { [weak self] up, down in
            guard let self else { return }
            self.byteLock.lock()
            self.upAcc += up
            self.downAcc += down
            self.byteLock.unlock()
            self.publish()
        }
    }

    public func start() {
        wantRun = true
        store.setSharingWanted(true)
        publish(state: "preparing", message: "Starting…")
        loopTask?.cancel()
        loopTask = Task { [weak self] in
            await self?.runLoop()
        }
        startStatusTimer()
    }

    public func stop() {
        wantRun = false
        loopTask?.cancel()
        loopTask = nil
        stopPing()
        stopStatusTimer()
        disconnect(reason: "user_stop")
        dialer.closeAll()
        store.clearSharing()
        publish(state: "offline", message: "Stopped")
    }

    private func runLoop() async {
        var fails = 0
        while wantRun, !Task.isCancelled {
            do {
                guard let token = store.sessionToken, !token.isEmpty else {
                    publish(state: "error", message: "Sign in required")
                    try await Task.sleep(nanoseconds: 3_000_000_000)
                    continue
                }
                publish(state: "connecting", message: "Enrolling…")
                self.dialer.networkMode = store.networkMode
                try? await Task.sleep(nanoseconds: 300_000_000)
                let network = self.dialer.transportLabel()
                let publicIp = await SharedEgressIpProbe.fetch()
                let enroll = try await api.enroll(
                    token: token,
                    deviceId: store.deviceId,
                    name: store.resolvedDeviceName(),
                    network: network,
                    userId: store.userId,
                    installId: store.installId,
                    publicIp: publicIp,
                    deviceSecret: store.deviceSecret,
                )
                store.updateDevice(deviceId: enroll.deviceId, deviceSecret: enroll.deviceSecret)
                let agentUrl = (enroll.agentUrl?.isEmpty == false) ? enroll.agentUrl! : SharedConfig.agentWss
                let secret = store.deviceSecret ?? enroll.deviceSecret ?? ""

                publish(state: "connecting", message: "Connecting tunnel…")
                try await connectAndWaitHello(
                    agentUrl: agentUrl,
                    deviceId: enroll.deviceId,
                    deviceSecret: secret,
                    network: network,
                    userId: store.userId,
                    egressIp: publicIp,
                )
                guard wantRun else { break }
                fails = 0
                publish(state: "online", message: "Sharing · tunnel online")
                onBecameReady?()

                // Stay online while hello completed and socket not torn down.
                // Do NOT rely only on URLSessionTask.state — it can flicker in NE.
                while wantRun, !Task.isCancelled, self.helloCompleted, self.task != nil {
                    self.dialer.networkMode = store.networkMode
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    if self.helloCompleted, self.task != nil {
                        let net = self.dialer.transportLabel()
                        let modeHint: String = {
                            let m = store.networkMode.lowercased()
                            if m.contains("cellular") || m.contains("mobile") { return "Mobile" }
                            if m.contains("wifi") { return "Wi‑Fi" }
                            return net == "cellular" ? "Mobile" : "Wi‑Fi"
                        }()
                        publish(state: "online", message: "Sharing · \(modeHint)")
                    }
                }
                if wantRun {
                    publish(state: "reconnecting", message: "Reconnecting…")
                    disconnect(reason: "socket_dead")
                    fails += 1
                    let backoff = UInt64(min(15, 2 + fails)) * 1_000_000_000
                    try? await Task.sleep(nanoseconds: backoff)
                }
            } catch is CancellationError {
                break
            } catch {
                fails += 1
                publish(state: "reconnecting", message: Self.friendlyReconnectMessage(error))
                disconnect(reason: "error")
                let backoff = UInt64(min(30, 2 + fails * 2)) * 1_000_000_000
                try? await Task.sleep(nanoseconds: backoff)
            }
        }
        disconnect(reason: "loop_end")
        if !wantRun {
            publish(state: "offline", message: "Stopped")
        }
    }

    private var lastEgressIp: String?

    private func connectAndWaitHello(
        agentUrl: String,
        deviceId: String,
        deviceSecret: String,
        network: String,
        userId: String?,
        egressIp: String?,
    ) async throws {
        disconnect(reason: "reconnect")
        generation += 1
        let gen = generation
        lastEgressIp = egressIp
        helloSent = false
        socketOpened = false
        helloCompleted = false
        pendingHelloDeviceId = deviceId
        pendingHelloSecret = deviceSecret
        pendingHelloNetwork = network
        pendingHelloUserId = userId
        pendingHelloGen = gen

        guard let url = URL(string: agentUrl) else {
            throw SharedApiError.decode
        }

        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            var resumed = false
            let resumeOk = {
                if !resumed {
                    resumed = true
                    cont.resume()
                }
            }
            let resumeErr = { (e: Error) in
                if !resumed {
                    resumed = true
                    cont.resume(throwing: e)
                }
            }

            let cfg = URLSessionConfiguration.ephemeral
            cfg.waitsForConnectivity = true
            cfg.timeoutIntervalForRequest = 60
            cfg.timeoutIntervalForResource = 0 // long-lived WSS
            // Critical for NE: do NOT use .main — callbacks never fire reliably.
            let session = URLSession(configuration: cfg, delegate: self, delegateQueue: self.sessionQueue)
            self.session = session
            let task = session.webSocketTask(with: url)
            self.task = task
            self.pendingHelloOk = resumeOk
            self.pendingHelloErr = resumeErr

            // Arm receive BEFORE resume so hello_ok cannot be lost (was the 15s flap bug).
            task.resume()
            self.startReceive(gen: gen)

            // Also send hello immediately; re-send on didOpen if needed.
            self.workQueue.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                self?.sendHelloIfNeeded(gen: gen)
            }

            let timeout = DispatchWorkItem { [weak self] in
                guard let self, self.generation == gen, !self.helloCompleted else { return }
                resumeErr(SharedApiError.http(0, "hello timeout"))
            }
            self.helloTimeoutWork = timeout
            self.workQueue.asyncAfter(deadline: .now() + 20, execute: timeout)
        }
    }

    private func sendHelloIfNeeded(gen: Int64) {
        guard generation == gen, !helloSent, task != nil else { return }
        guard let deviceId = pendingHelloDeviceId,
              let secret = pendingHelloSecret
        else { return }
        helloSent = true
        sendText(
            SharedTunnelProtocol.hello(
                deviceId: deviceId,
                deviceSecret: secret,
                network: pendingHelloNetwork ?? "wifi",
                generation: gen,
                userId: pendingHelloUserId,
                country: nil,
                egressIp: lastEgressIp,
                name: store.resolvedDeviceName(),
                installId: store.installId,
            ),
            critical: true,
        )
        startPing()
    }

    private func markSocketDead(reason: String) {
        stopPing()
        dialer.closeAll()
        helloCompleted = false
        let t = task
        task = nil
        t?.cancel(with: .goingAway, reason: reason.data(using: .utf8))
        if wantRun {
            publish(state: "reconnecting", message: "Reconnecting…")
        }
    }

    private func disconnect(reason: String) {
        generation += 1
        stopPing()
        dialer.closeAll()
        helloTimeoutWork?.cancel()
        helloTimeoutWork = nil
        helloCompleted = false
        helloSent = false
        socketOpened = false
        task?.cancel(with: .goingAway, reason: reason.data(using: .utf8))
        task = nil
        session?.invalidateAndCancel()
        session = nil
        pendingHelloOk = nil
        pendingHelloErr = nil
        pendingHelloDeviceId = nil
        pendingHelloSecret = nil
    }

    private func startPing() {
        stopPing()
        let src = DispatchSource.makeTimerSource(queue: workQueue)
        // Keep under nginx/proxy idle limits; don't tear down on a single ping glitch.
        src.schedule(deadline: .now() + 8, repeating: 12)
        var consecutivePingFails = 0
        src.setEventHandler { [weak self] in
            guard let self else { return }
            guard self.task != nil, self.helloCompleted else {
                if self.task == nil {
                    self.markSocketDead(reason: "ping_no_socket")
                }
                return
            }
            // App-level stats frame (server treats as traffic / liveness).
            self.byteLock.lock()
            let u = self.upAcc
            let d = self.downAcc
            self.byteLock.unlock()
            self.sendText(
                SharedTunnelProtocol.stats(
                    bytesUp: u,
                    bytesDown: d,
                    streams: self.dialer.activeCount(),
                    egressIp: self.lastEgressIp,
                ),
            )
            // WebSocket control ping — only mark dead after repeated failures.
            self.task?.sendPing { [weak self] err in
                guard let self else { return }
                if err != nil {
                    consecutivePingFails += 1
                    if consecutivePingFails >= 3 {
                        self.markSocketDead(reason: err?.localizedDescription ?? "ws_ping_fail")
                    }
                } else {
                    consecutivePingFails = 0
                }
            }
        }
        src.resume()
        pingSource = src
    }

    private func stopPing() {
        pingSource?.cancel()
        pingSource = nil
    }

    private func startStatusTimer() {
        stopStatusTimer()
        let src = DispatchSource.makeTimerSource(queue: workQueue)
        src.schedule(deadline: .now() + 2, repeating: 2)
        src.setEventHandler { [weak self] in
            self?.publish()
        }
        src.resume()
        statusSource = src
    }

    private func stopStatusTimer() {
        statusSource?.cancel()
        statusSource = nil
    }

    private func startReceive(gen: Int64) {
        guard let task, generation == gen else { return }
        task.receive { [weak self] result in
            guard let self, self.generation == gen else { return }
            switch result {
            case let .failure(err):
                let ns = err as NSError
                // Ignore cancel during intentional reconnect.
                if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCancelled {
                    if self.pendingHelloErr != nil {
                        self.pendingHelloErr?(err)
                        self.pendingHelloErr = nil
                    }
                    self.markSocketDead(reason: "cancelled")
                    return
                }
                if self.pendingHelloErr != nil {
                    self.pendingHelloErr?(err)
                    self.pendingHelloErr = nil
                }
                self.markSocketDead(reason: err.localizedDescription)
            case let .success(message):
                switch message {
                case let .string(text):
                    self.handleFrame(text, gen: gen)
                case let .data(data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleFrame(text, gen: gen)
                    }
                @unknown default:
                    break
                }
                if self.task != nil, self.generation == gen {
                    self.startReceive(gen: gen)
                }
            }
        }
    }

    private func handleFrame(_ text: String, gen: Int64) {
        guard let o = SharedTunnelProtocol.parse(text),
              let type = o["type"] as? String
        else { return }
        switch type {
        case "hello_ok", "welcome":
            helloCompleted = true
            helloTimeoutWork?.cancel()
            helloTimeoutWork = nil
            pendingHelloOk?()
            pendingHelloOk = nil
            pendingHelloErr = nil
        case "hello_err":
            let code = (o["code"] as? String) ?? "hello_err"
            let err = SharedApiError.http(401, code)
            pendingHelloErr?(err)
            pendingHelloErr = nil
            pendingHelloOk = nil
            markSocketDead(reason: code)
        case "ping":
            let t = (o["t"] as? NSNumber)?.int64Value ?? 0
            sendText(SharedTunnelProtocol.pong(t: t))
        case "open":
            guard generation == gen, helloCompleted else { return }
            let streamId: String? = {
                if let s = o["streamId"] as? String { return s }
                if let n = o["streamId"] as? NSNumber { return n.stringValue }
                if let i = o["streamId"] as? Int { return String(i) }
                return nil
            }()
            guard let streamId, let host = o["host"] as? String, !host.isEmpty else { return }
            let portRaw = (o["port"] as? NSNumber)?.intValue
                ?? (o["port"] as? Int)
                ?? Int(o["port"] as? String ?? "")
                ?? 443
            dialer.open(streamId: streamId, host: host, port: UInt16(clamping: portRaw))
        case "data":
            let streamId: String? = {
                if let s = o["streamId"] as? String { return s }
                if let n = o["streamId"] as? NSNumber { return n.stringValue }
                return nil
            }()
            guard let streamId, let b64 = o["b64"] as? String else { return }
            dialer.writeBase64(streamId: streamId, b64: b64)
        case "close":
            let streamId: String? = {
                if let s = o["streamId"] as? String { return s }
                if let n = o["streamId"] as? NSNumber { return n.stringValue }
                return nil
            }()
            if let streamId {
                dialer.close(streamId, reason: (o["reason"] as? String) ?? "remote")
            }
        default:
            break
        }
    }

    /// Send a control/data frame. `critical: true` kills the tunnel on failure
    /// (hello / open_ok). Data-plane failures must not drop the whole agent —
    /// that made Generate traffic flip the device Offline in admin.
    private func sendText(_ text: String, critical: Bool = false) {
        guard let task else { return }
        task.send(.string(text)) { [weak self] err in
            if let err {
                let ns = err as NSError
                if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCancelled { return }
                if critical {
                    self?.markSocketDead(reason: err.localizedDescription)
                }
                // Non-critical (bulk data): drop frame only; keep WSS alive.
            }
        }
    }

    private func publish(state: String? = nil, message: String? = nil) {
        byteLock.lock()
        let u = upAcc
        let d = downAcc
        byteLock.unlock()
        let st = store.readStatus()
        store.publishStatus(
            state: state ?? st.state,
            message: message ?? st.message,
            bytesUp: u,
            bytesDown: d,
            streams: dialer.activeCount(),
            egressIp: st.egressIp,
        )
    }

    // MARK: URLSessionWebSocketDelegate

    public func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?,
    ) {
        socketOpened = true
        // Ensure hello goes out as soon as the socket is open (and receive already armed).
        sendHelloIfNeeded(gen: pendingHelloGen)
    }

    public func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?,
    ) {
        markSocketDead(reason: "closed:\(closeCode.rawValue)")
    }

    public func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?,
    ) {
        if let error {
            let ns = error as NSError
            if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCancelled { return }
            markSocketDead(reason: error.localizedDescription)
        }
    }
}
