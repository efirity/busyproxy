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
    private var generation: Int64 = 0
    private var wantRun = false
    private var loopTask: Task<Void, Never>?
    private var pingTimer: Timer?
    private let byteLock = NSLock()
    private var upAcc: Int64 = 0
    private var downAcc: Int64 = 0
    private var statusTimer: Timer?

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
        wireDialer()
    }

    private func wireDialer() {
        dialer.onUpstream = { [weak self] streamId, data in
            self?.sendText(SharedTunnelProtocol.data(streamId: streamId, b64: data.base64EncodedString()))
        }
        dialer.onClosed = { [weak self] streamId, reason in
            self?.sendText(SharedTunnelProtocol.close(streamId: streamId, reason: reason))
        }
        dialer.onOpenOk = { [weak self] streamId in
            self?.sendText(SharedTunnelProtocol.openOk(streamId: streamId))
        }
        dialer.onOpenErr = { [weak self] streamId, code in
            self?.sendText(SharedTunnelProtocol.openErr(streamId: streamId, code: code))
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
        DispatchQueue.main.async {
            self.statusTimer?.invalidate()
            self.statusTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
                self?.publish()
            }
        }
    }

    public func stop() {
        wantRun = false
        loopTask?.cancel()
        loopTask = nil
        pingTimer?.invalidate()
        pingTimer = nil
        statusTimer?.invalidate()
        statusTimer = nil
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
                // Keep dialer in sync with UI mode (Automatic / Wi‑Fi / Mobile) — same as Android.
                self.dialer.networkMode = store.networkMode
                // Brief path settle so transportLabel sees Wi‑Fi vs cellular correctly.
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

                // Stay "online" only while the WebSocket task is still alive.
                // Previously we never cleared `task` on receive/close failures, so the
                // phone UI stayed ONLINE forever while the server had no agent —
                // admin traffic then failed with 0 B (device_tunnel_offline).
                while wantRun, !Task.isCancelled, self.isTunnelSocketLive {
                    // Mode can only change when not sharing (UI disables picker), but
                    // re-apply so extension always matches App Group prefs.
                    self.dialer.networkMode = store.networkMode
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    if self.isTunnelSocketLive {
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
                    let backoff = UInt64(min(15, 2 + fails)) * 1_000_000_000
                    try? await Task.sleep(nanoseconds: backoff)
                }
            } catch is CancellationError {
                break
            } catch {
                fails += 1
                // Never publish HTML/502/nginx bodies into the app status / Live Activity
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

            let cfg = URLSessionConfiguration.default
            cfg.waitsForConnectivity = true
            let session = URLSession(configuration: cfg, delegate: self, delegateQueue: .main)
            self.session = session
            let task = session.webSocketTask(with: url)
            self.task = task
            self.pendingHelloOk = resumeOk
            self.pendingHelloErr = resumeErr
            task.resume()

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
                guard let self, self.generation == gen else { return }
                self.sendText(
                    SharedTunnelProtocol.hello(
                        deviceId: deviceId,
                        deviceSecret: deviceSecret,
                        network: network,
                        generation: gen,
                        userId: userId,
                        country: nil,
                        egressIp: egressIp,
                        name: self.store.resolvedDeviceName(),
                        installId: self.store.installId,
                    ),
                )
                self.startReceive(gen: gen)
                self.startPing()
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
                resumeErr(SharedApiError.http(0, "hello timeout"))
            }
        }
    }

    private var pendingHelloOk: (() -> Void)?
    private var pendingHelloErr: ((Error) -> Void)?

    /// True while we still have a live WebSocket task (server can open streams).
    private var isTunnelSocketLive: Bool {
        guard let task else { return false }
        // URLSessionTask states: 0 running, 1 suspended, 2 canceling, 3 completed
        return task.state == .running
    }

    private func markSocketDead(reason: String) {
        // Leave generation alone if disconnect() will bump it; used mid-flight
        pingTimer?.invalidate()
        pingTimer = nil
        dialer.closeAll()
        let t = task
        task = nil
        t?.cancel(with: .goingAway, reason: reason.data(using: .utf8))
        // Keep session for a moment; full disconnect invalidates it
        if wantRun {
            publish(state: "reconnecting", message: "Reconnecting…")
        }
    }

    private func disconnect(reason: String) {
        generation += 1
        pingTimer?.invalidate()
        pingTimer = nil
        dialer.closeAll()
        task?.cancel(with: .goingAway, reason: reason.data(using: .utf8))
        task = nil
        session?.invalidateAndCancel()
        session = nil
        pendingHelloOk = nil
        pendingHelloErr = nil
    }

    private func startPing() {
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 8, repeats: true) { [weak self] _ in
            guard let self else { return }
            guard self.isTunnelSocketLive else {
                self.markSocketDead(reason: "ping_no_socket")
                return
            }
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
        }
    }

    private func startReceive(gen: Int64) {
        task?.receive { [weak self] result in
            guard let self, self.generation == gen else { return }
            switch result {
            case let .failure(err):
                // Still in hello handshake?
                if self.pendingHelloErr != nil {
                    self.pendingHelloErr?(err)
                    self.pendingHelloErr = nil
                }
                // Always tear down so outer loop reconnects (was missing → stuck ONLINE)
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
                // Only continue receive if still live
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
            pendingHelloOk?()
            pendingHelloOk = nil
            pendingHelloErr = nil
        case "ping":
            let t = (o["t"] as? NSNumber)?.int64Value ?? 0
            sendText(SharedTunnelProtocol.pong(t: t))
        case "open":
            guard generation == gen else { return }
            // streamId may arrive as String or number depending on edge JSON
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

    private func sendText(_ text: String) {
        guard let task else { return }
        task.send(.string(text)) { [weak self] err in
            if err != nil {
                self?.markSocketDead(reason: err?.localizedDescription ?? "send_fail")
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
    ) {}

    public func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?,
    ) {
        markSocketDead(reason: "closed:\(closeCode.rawValue)")
    }
}
