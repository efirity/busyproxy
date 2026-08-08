import Foundation

/// Outbound WebSocket reverse tunnel to BusyProxy edge.
final class TunnelClient: NSObject, URLSessionWebSocketDelegate {
    private var task: URLSessionWebSocketTask?
    private var session: URLSession?
    private var generation: Int64 = 0
    private let dialer: StreamDialer
    private let pathSelector: NetworkPathSelector
    private var networkMode: NetworkMode = .automatic
    private var pingTimer: Timer?
    private var lastEgressIp: String?

    var onState: ((Bool, String?) -> Void)?
    var onHelloAck: (() -> Void)?
    /// Session counters for edge stats (bytesUp, bytesDown, streams, egressIp).
    var statsProvider: (() -> (Int64, Int64, Int, String?))?

    init(dialer: StreamDialer, pathSelector: NetworkPathSelector) {
        self.dialer = dialer
        self.pathSelector = pathSelector
        super.init()
        wireDialer()
    }

    private func wireDialer() {
        dialer.onUpstream = { [weak self] streamId, data in
            self?.sendData(streamId: streamId, payload: data)
        }
        dialer.onClosed = { [weak self] streamId, reason in
            self?.sendText(TunnelProtocol.close(streamId: streamId, reason: reason))
        }
        dialer.onOpenOk = { [weak self] streamId in
            self?.sendText(TunnelProtocol.openOk(streamId: streamId))
        }
        dialer.onOpenErr = { [weak self] streamId, code in
            self?.sendText(TunnelProtocol.openErr(streamId: streamId, code: code))
        }
    }

    func connect(
        agentUrl: String,
        deviceId: String,
        deviceSecret: String,
        networkMode: NetworkMode,
        userId: String?,
        egressIp: String? = nil,
    ) {
        disconnect(reason: "reconnect")
        self.networkMode = networkMode
        lastEgressIp = egressIp
        generation += 1
        let gen = generation

        guard let url = URL(string: agentUrl) else {
            onState?(false, "bad agent url")
            return
        }

        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        let session = URLSession(configuration: config, delegate: self, delegateQueue: .main)
        self.session = session
        let task = session.webSocketTask(with: url)
        self.task = task
        task.resume()

        // Hello after open — receive loop starts in didOpen
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self, self.generation == gen else { return }
            let label = self.pathSelector.transportLabel(for: networkMode)
            self.sendText(
                TunnelProtocol.hello(
                    deviceId: deviceId,
                    deviceSecret: deviceSecret,
                    network: label,
                    generation: gen,
                    userId: userId,
                    country: nil,
                    egressIp: egressIp,
                ),
            )
            self.onState?(true, nil)
            self.startReceive(gen: gen)
            self.startPing()
        }
    }

    func disconnect(reason: String) {
        #if DEBUG
        print("[BpTunnel] disconnect reason=\(reason)")
        #endif
        pingTimer?.invalidate()
        pingTimer = nil
        // Invalidate generation so delayed hello / receive callbacks no-op
        generation += 1
        dialer.closeAll()
        let t = task
        task = nil
        t?.cancel(with: .goingAway, reason: reason.data(using: .utf8))
        let s = session
        session = nil
        s?.invalidateAndCancel()
        onHelloAck = nil
        // Do not call onState here for user_stop — RelayEngine owns UI state on stop.
        // Still notify for unexpected closes so reconnect can run while sharing is wanted.
        if reason != "user_stop", reason != "restart", reason != "loop_end" {
            onState?(false, reason)
        }
    }

    func sendStats(up: Int64, down: Int64, streams: Int, egressIp: String?) {
        sendText(TunnelProtocol.stats(bytesUp: up, bytesDown: down, streams: streams, egressIp: egressIp))
    }

    private func startPing() {
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 8, repeats: true) { [weak self] _ in
            guard let self else { return }
            if let s = self.statsProvider?() {
                let ip = s.3 ?? self.lastEgressIp
                self.sendStats(up: s.0, down: s.1, streams: s.2, egressIp: ip)
            } else {
                self.sendStats(
                    up: 0,
                    down: 0,
                    streams: self.dialer.activeCount(),
                    egressIp: self.lastEgressIp,
                )
            }
        }
    }

    private func startReceive(gen: Int64) {
        task?.receive { [weak self] result in
            guard let self, self.generation == gen else { return }
            switch result {
            case let .failure(err):
                self.onState?(false, err.localizedDescription)
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
                self.startReceive(gen: gen)
            }
        }
    }

    private func handleFrame(_ text: String, gen: Int64) {
        guard let o = TunnelProtocol.parse(text),
              let type = o["type"] as? String
        else { return }

        switch type {
        case "hello_ok", "welcome":
            onHelloAck?()
        case "ping":
            let t = (o["t"] as? NSNumber)?.int64Value ?? 0
            sendText(TunnelProtocol.pong(t: t))
        case "open":
            guard generation == gen,
                  let streamId = o["streamId"] as? String,
                  let host = o["host"] as? String
            else { return }
            let portRaw = (o["port"] as? NSNumber)?.intValue
                ?? (o["port"] as? Int)
                ?? Int(o["port"] as? String ?? "")
                ?? 443
            let port = UInt16(clamping: portRaw)
            let params = pathSelector.parameters(for: networkMode)
            #if DEBUG
            print("[BpTunnel] open stream=\(streamId) \(host):\(port)")
            #endif
            dialer.open(streamId: streamId, host: host, port: port, parameters: params)
        case "data":
            guard let streamId = o["streamId"] as? String,
                  let b64 = o["b64"] as? String
            else { return }
            dialer.writeBase64(streamId: streamId, b64: b64)
        case "close":
            if let streamId = o["streamId"] as? String {
                dialer.close(streamId, reason: (o["reason"] as? String) ?? "remote")
            }
        default:
            break
        }
    }

    private func sendData(streamId: String, payload: Data) {
        sendText(TunnelProtocol.data(streamId: streamId, b64: payload.base64EncodedString()))
    }

    private func sendText(_ text: String) {
        task?.send(.string(text)) { _ in }
    }

    // MARK: URLSessionWebSocketDelegate

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?,
    ) {
        onState?(true, nil)
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?,
    ) {
        onState?(false, "closed:\(closeCode.rawValue)")
    }
}
