import Foundation
#if canImport(NetworkExtension)
import NetworkExtension
#endif
import os.log

/// Reverse-tunnel host that runs inside the Packet Tunnel extension (no UIKit).
public final class ExtensionRelayHost: NSObject, URLSessionWebSocketDelegate {
    private let log = OSLog(subsystem: "net.busyproxy.app.ios.tunnel", category: "RelayHost")
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

    /// Single continuation for the current hello handshake (never leave dangling).
    private var helloContinuation: CheckedContinuation<Void, Error>?
    private var helloTimeoutWork: DispatchWorkItem?
    private var helloSent = false
    private var helloCompleted = false

    private var pendingHelloDeviceId: String?
    private var pendingHelloSecret: String?
    private var pendingHelloNetwork: String?
    private var pendingHelloUserId: String?
    private var pendingHelloGen: Int64 = 0
    private var lastEgressIp: String?

    public var onBecameReady: (() -> Void)?
    public var onFailed: ((Error) -> Void)?

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
            // Chunk uplink — multi‑KB base64 frames kill iOS URLSession WSS (close 1006).
            guard let self else { return }
            let maxChunk = 8 * 1024
            var offset = 0
            while offset < data.count {
                let end = min(offset + maxChunk, data.count)
                let slice = data.subdata(in: offset ..< end)
                self.sendText(
                    SharedTunnelProtocol.data(streamId: streamId, b64: slice.base64EncodedString()),
                    critical: false,
                )
                offset = end
            }
        }
        dialer.onClosed = { [weak self] streamId, reason in
            self?.sendText(
                SharedTunnelProtocol.close(streamId: streamId, reason: reason),
                critical: false,
            )
        }
        dialer.onOpenOk = { [weak self] streamId in
            self?.sendText(SharedTunnelProtocol.openOk(streamId: streamId), critical: false)
        }
        dialer.onOpenErr = { [weak self] streamId, code in
            self?.sendText(SharedTunnelProtocol.openErr(streamId: streamId, code: code), critical: false)
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
        // Fail any in-flight hello so we never hang on "Connecting tunnel…"
        failHello(SharedApiError.http(0, "restart"))
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
                    os_log("no session token in app group", log: log, type: .error)
                    publish(state: "error", message: "Sign in required")
                    try await Task.sleep(nanoseconds: 3_000_000_000)
                    continue
                }
                publish(state: "connecting", message: "Enrolling…")
                dialer.networkMode = store.networkMode
                try? await Task.sleep(nanoseconds: 200_000_000)
                let network = dialer.transportLabel()
                // Don't block enroll on egress probe (was hanging some NE starts).
                let publicIp = await SharedEgressIpProbe.fetch(timeout: 4)
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
                if secret.isEmpty {
                    throw SharedApiError.http(401, "missing device secret")
                }

                publish(state: "connecting", message: "Connecting tunnel…")
                os_log("connect wss %{public}@", log: log, type: .info, agentUrl)
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
                os_log("tunnel online device=%{public}@", log: log, type: .info, enroll.deviceId)

                while wantRun, !Task.isCancelled, helloCompleted, task != nil {
                    dialer.networkMode = store.networkMode
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    if helloCompleted, task != nil {
                        let net = dialer.transportLabel()
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
                    let backoff = UInt64(min(12, 2 + fails)) * 1_000_000_000
                    try? await Task.sleep(nanoseconds: backoff)
                }
            } catch is CancellationError {
                break
            } catch {
                fails += 1
                os_log(
                    "relay loop error: %{public}@",
                    log: log,
                    type: .error,
                    error.localizedDescription,
                )
                publish(state: "reconnecting", message: Self.friendlyReconnectMessage(error))
                disconnect(reason: "error")
                let backoff = UInt64(min(20, 2 + fails * 2)) * 1_000_000_000
                try? await Task.sleep(nanoseconds: backoff)
            }
        }
        disconnect(reason: "loop_end")
        if !wantRun {
            publish(state: "offline", message: "Stopped")
        }
    }

    private func connectAndWaitHello(
        agentUrl: String,
        deviceId: String,
        deviceSecret: String,
        network: String,
        userId: String?,
        egressIp: String?,
    ) async throws {
        // Tear down previous socket but ALWAYS finish any prior hello wait first.
        failHello(SharedApiError.http(0, "reconnect"))
        disconnect(reason: "reconnect")
        generation += 1
        let gen = generation
        lastEgressIp = egressIp
        helloSent = false
        helloCompleted = false
        pendingHelloDeviceId = deviceId
        pendingHelloSecret = deviceSecret
        pendingHelloNetwork = network
        pendingHelloUserId = userId
        pendingHelloGen = gen

        guard let url = URL(string: agentUrl) else {
            throw SharedApiError.decode
        }

        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
                // Only one waiter
                self.failHello(SharedApiError.http(0, "replaced"))
                self.helloContinuation = cont

                let cfg = URLSessionConfiguration.ephemeral
                cfg.waitsForConnectivity = false // fail fast in NE, then retry loop
                cfg.timeoutIntervalForRequest = 30
                cfg.timeoutIntervalForResource = 45
                let session = URLSession(
                    configuration: cfg,
                    delegate: self,
                    delegateQueue: self.sessionQueue,
                )
                self.session = session
                let task = session.webSocketTask(with: url)
                self.task = task

                // Arm receive BEFORE resume so hello_ok cannot be dropped.
                self.startReceive(gen: gen)
                task.resume()

                // Send hello shortly after resume; also on didOpen.
                self.workQueue.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                    self?.sendHelloIfNeeded(gen: gen)
                }

                let timeout = DispatchWorkItem { [weak self] in
                    guard let self else { return }
                    guard self.generation == gen, !self.helloCompleted else { return }
                    os_log("hello timeout gen=%{public}lld", log: self.log, type: .error, gen)
                    self.failHello(SharedApiError.http(0, "hello timeout"))
                }
                self.helloTimeoutWork = timeout
                self.workQueue.asyncAfter(deadline: .now() + 15, execute: timeout)
            }
        } onCancel: { [weak self] in
            self?.failHello(CancellationError())
            self?.disconnect(reason: "cancelled")
        }
    }

    /// Resume hello waiter exactly once (success or failure). Prevents forever-CONNECTING.
    private func completeHello() {
        helloTimeoutWork?.cancel()
        helloTimeoutWork = nil
        helloCompleted = true
        if let cont = helloContinuation {
            helloContinuation = nil
            cont.resume()
        }
        startPing()
    }

    private func failHello(_ error: Error) {
        helloTimeoutWork?.cancel()
        helloTimeoutWork = nil
        helloCompleted = false
        if let cont = helloContinuation {
            helloContinuation = nil
            cont.resume(throwing: error)
        }
    }

    private func sendHelloIfNeeded(gen: Int64) {
        guard generation == gen, !helloSent, task != nil else { return }
        guard let deviceId = pendingHelloDeviceId,
              let secret = pendingHelloSecret
        else { return }
        helloSent = true
        os_log("sending hello device=%{public}@", log: log, type: .info, deviceId)
        // Non-critical: if socket not fully open yet, didOpen will re-send.
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
            critical: false,
        )
    }

    private func markSocketDead(reason: String) {
        os_log("socket dead: %{public}@", log: log, type: .info, reason)
        stopPing()
        dialer.closeAll()
        let wasWaiting = helloContinuation != nil
        if wasWaiting {
            failHello(SharedApiError.http(0, reason))
        }
        helloCompleted = false
        let t = task
        task = nil
        t?.cancel(with: .goingAway, reason: reason.data(using: .utf8))
        if wantRun, !wasWaiting {
            publish(state: "reconnecting", message: "Reconnecting…")
        }
    }

    private func disconnect(reason: String) {
        generation += 1
        stopPing()
        dialer.closeAll()
        // Never leave connectAndWaitHello parked forever
        if helloContinuation != nil {
            failHello(SharedApiError.http(0, reason))
        }
        helloTimeoutWork?.cancel()
        helloTimeoutWork = nil
        helloCompleted = false
        helloSent = false
        task?.cancel(with: .goingAway, reason: reason.data(using: .utf8))
        task = nil
        session?.invalidateAndCancel()
        session = nil
        pendingHelloDeviceId = nil
        pendingHelloSecret = nil
    }

    private func startPing() {
        stopPing()
        let src = DispatchSource.makeTimerSource(queue: workQueue)
        src.schedule(deadline: .now() + 8, repeating: 12)
        var consecutivePingFails = 0
        src.setEventHandler { [weak self] in
            guard let self else { return }
            guard self.task != nil, self.helloCompleted else { return }
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
                critical: false,
            )
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
                if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCancelled {
                    if self.helloContinuation != nil {
                        self.failHello(err)
                    }
                    self.markSocketDead(reason: "cancelled")
                    return
                }
                if self.helloContinuation != nil {
                    self.failHello(err)
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
            os_log("hello_ok", log: log, type: .info)
            completeHello()
        case "hello_err":
            let code = (o["code"] as? String) ?? "hello_err"
            failHello(SharedApiError.http(401, code))
            markSocketDead(reason: code)
        case "ping":
            let t = (o["t"] as? NSNumber)?.int64Value ?? 0
            sendText(SharedTunnelProtocol.pong(t: t), critical: false)
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

    private func sendText(_ text: String, critical: Bool = false) {
        guard let task else { return }
        task.send(.string(text)) { [weak self] err in
            if let err {
                let ns = err as NSError
                if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCancelled { return }
                if critical {
                    self?.markSocketDead(reason: err.localizedDescription)
                }
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
            egressIp: st.egressIp ?? lastEgressIp,
        )
    }

    // MARK: URLSessionWebSocketDelegate

    public func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?,
    ) {
        os_log("wss didOpen", log: log, type: .info)
        // Allow a second hello attempt if the first pre-open send was dropped.
        if helloSent, !helloCompleted {
            helloSent = false
        }
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
            if helloContinuation != nil {
                failHello(error)
            }
            markSocketDead(reason: error.localizedDescription)
        }
    }
}
