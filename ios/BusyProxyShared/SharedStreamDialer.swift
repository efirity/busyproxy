import Foundation
import Network
#if canImport(NetworkExtension)
import NetworkExtension
#endif

/// Destination TCP dialer for reverse-tunnel streams (app + Packet Tunnel extension).
///
/// **Critical for NE:** plain `NWConnection` without an interface pin often binds to the
/// virtual utun (no default route) so every open fails. Strategies:
/// - **Automatic:** `createTCPConnection` on the provider → primary physical path
///   (Wi‑Fi when both up; cellular when Wi‑Fi is off) — same as Android Automatic.
/// - **Wi‑Fi only / Mobile only:** `NWConnection` with `requiredInterfaceType` so traffic
///   is forced onto that radio even when the other is also connected (Android parity).
public final class SharedStreamDialer: @unchecked Sendable {
    private let queue = DispatchQueue(label: "bp.shared.dialer", qos: .userInitiated)
    private var connections: [String: NWConnection] = [:]
    #if canImport(NetworkExtension)
    private var neConnections: [String: NWTCPConnection] = [:]
    private var neObservers: [String: NSKeyValueObservation] = [:]
    private var neOpened: Set<String> = []
    /// Set by PacketTunnelProvider so egress uses the physical NIC, not the tunnel.
    public weak var packetTunnelProvider: NEPacketTunnelProvider?
    #endif
    private var pending: [String: [Data]] = [:]

    /// `automatic` | `wifi_only` | `cellular_only` (and legacy prefer_* → automatic).
    public var networkMode: String = "automatic"

    private let pathMonitor = NWPathMonitor()
    private let pathQueue = DispatchQueue(label: "bp.shared.dialer.path")
    /// Use Network.NWPath explicitly — NetworkExtension import makes bare `NWPath` ambiguous.
    private var latestPath: Network.NWPath?

    public var onUpstream: ((String, Data) -> Void)?
    public var onClosed: ((String, String) -> Void)?
    public var onBytes: ((Int64, Int64) -> Void)?
    public var onOpenOk: ((String) -> Void)?
    public var onOpenErr: ((String, String) -> Void)?

    public init() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            self?.latestPath = path
        }
        pathMonitor.start(queue: pathQueue)
    }

    deinit {
        pathMonitor.cancel()
    }

    public func activeCount() -> Int {
        queue.sync {
            #if canImport(NetworkExtension)
            return connections.count + neConnections.count
            #else
            return connections.count
            #endif
        }
    }

    /// Effective transport label for enroll / admin (`wifi` | `cellular`).
    public func transportLabel() -> String {
        let mode = Self.normalizeMode(networkMode)
        switch mode {
        case "wifi_only":
            return "wifi"
        case "cellular_only":
            return "cellular"
        default:
            // Prefer the interface the system is actually using (Wi‑Fi first when both).
            if let path = latestPath {
                if path.usesInterfaceType(.wifi) { return "wifi" }
                if path.usesInterfaceType(.cellular) { return "cellular" }
            }
            return "wifi"
        }
    }

    public func open(streamId: String, host: String, port: UInt16) {
        queue.async {
            #if canImport(NetworkExtension)
            if self.neConnections[streamId] != nil || self.connections[streamId] != nil { return }
            #else
            if self.connections[streamId] != nil { return }
            #endif

            let mode = Self.normalizeMode(self.networkMode)
            let pinned = Self.requiredInterface(for: mode)

            // Forced Wi‑Fi / mobile: pin NWConnection to that radio (Android parity).
            // Inside NE, requiredInterfaceType avoids the empty utun and selects the radio.
            if let iface = pinned {
                if let path = self.latestPath, path.status == .satisfied,
                   !path.usesInterfaceType(iface)
                {
                    let code = iface == .wifi ? "no_wifi" : "no_cellular"
                    self.failOpen(streamId, code)
                    return
                }
                self.openViaNW(streamId: streamId, host: host, port: port, requiredInterface: iface)
                return
            }

            #if canImport(NetworkExtension)
            if let provider = self.packetTunnelProvider {
                // Automatic: primary physical path (Wi‑Fi preferred when both available).
                self.openViaProvider(provider, streamId: streamId, host: host, port: port)
                return
            }
            #endif
            self.openViaNW(streamId: streamId, host: host, port: port, requiredInterface: nil)
        }
    }

    public func write(streamId: String, data: Data) {
        queue.async {
            #if canImport(NetworkExtension)
            if let conn = self.neConnections[streamId] {
                conn.write(data) { [weak self] err in
                    self?.queue.async {
                        if err == nil {
                            self?.onBytes?(Int64(data.count), 0)
                        } else {
                            self?.cleanup(streamId, reason: "write_fail")
                        }
                    }
                }
                return
            }
            #endif
            if let conn = self.connections[streamId] {
                conn.send(content: data, completion: .contentProcessed { [weak self] err in
                    if err == nil {
                        self?.onBytes?(Int64(data.count), 0)
                    } else {
                        self?.close(streamId, reason: "write_fail")
                    }
                })
            } else {
                self.pending[streamId, default: []].append(data)
            }
        }
    }

    public func writeBase64(streamId: String, b64: String) {
        var s = b64.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while s.count % 4 != 0 { s.append("=") }
        guard let data = Data(base64Encoded: s) else { return }
        write(streamId: streamId, data: data)
    }

    public func close(_ streamId: String, reason: String) {
        queue.async { self.cleanup(streamId, reason: reason) }
    }

    public func closeAll() {
        queue.async {
            #if canImport(NetworkExtension)
            for id in Array(self.neConnections.keys) {
                self.cleanup(id, reason: "teardown")
            }
            #endif
            for id in Array(self.connections.keys) {
                self.cleanup(id, reason: "teardown")
            }
            self.pending.removeAll()
        }
    }

    // MARK: - Mode helpers

    private static func normalizeMode(_ raw: String) -> String {
        let m = raw.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        switch m {
        case "wifi_only", "wifi", "wifi-only":
            return "wifi_only"
        case "cellular_only", "cellular", "mobile", "mobile_only", "cell_only":
            return "cellular_only"
        case "prefer_cellular":
            // Collapse legacy prefer_* to automatic (same as Android UI).
            return "automatic"
        case "prefer_wifi", "any", "automatic", "":
            return "automatic"
        default:
            if m.contains("cellular") || m.contains("mobile") { return "cellular_only" }
            if m.contains("wifi") { return "wifi_only" }
            return "automatic"
        }
    }

    private static func requiredInterface(for mode: String) -> NWInterface.InterfaceType? {
        switch mode {
        case "wifi_only": return .wifi
        case "cellular_only": return .cellular
        default: return nil
        }
    }

    // MARK: - Physical path (Packet Tunnel, automatic)

    #if canImport(NetworkExtension)
    private func openViaProvider(
        _ provider: NEPacketTunnelProvider,
        streamId: String,
        host: String,
        port: UInt16,
    ) {
        pending[streamId] = []
        let endpoint = NWHostEndpoint(hostname: host, port: String(port))
        // Primary physical interface (not tunnel utun). Wi‑Fi when both are up.
        let conn = provider.createTCPConnection(
            to: endpoint,
            enableTLS: false,
            tlsParameters: nil,
            delegate: nil,
        )
        neConnections[streamId] = conn

        let obs = conn.observe(\.state, options: [.initial, .new]) { [weak self] c, _ in
            guard let self else { return }
            self.queue.async {
                switch c.state {
                case .connected:
                    guard self.neOpened.insert(streamId).inserted else { return }
                    self.flushPendingNE(streamId: streamId, conn: c)
                    self.onOpenOk?(streamId)
                    self.receiveLoopNE(streamId: streamId, conn: c)
                case .disconnected:
                    if !self.neOpened.contains(streamId) {
                        let err = c.error?.localizedDescription ?? "disconnected"
                        self.failOpen(streamId, err)
                    } else {
                        self.cleanup(streamId, reason: "disconnected")
                    }
                case .cancelled:
                    if !self.neOpened.contains(streamId) {
                        self.failOpen(streamId, "cancelled")
                    } else {
                        self.cleanup(streamId, reason: "cancelled")
                    }
                case .invalid:
                    self.failOpen(streamId, c.error?.localizedDescription ?? "invalid")
                default:
                    break
                }
            }
        }
        neObservers[streamId] = obs

        queue.asyncAfter(deadline: .now() + 15) { [weak self] in
            guard let self else { return }
            if let c = self.neConnections[streamId], c.state != .connected {
                let detail = c.error?.localizedDescription ?? "connect_timeout"
                self.failOpen(streamId, detail)
            }
        }
    }

    private func flushPendingNE(streamId: String, conn: NWTCPConnection) {
        let chunks = pending.removeValue(forKey: streamId) ?? []
        for chunk in chunks {
            conn.write(chunk) { [weak self] err in
                if err == nil {
                    self?.onBytes?(Int64(chunk.count), 0)
                }
            }
        }
    }

    private func receiveLoopNE(streamId: String, conn: NWTCPConnection) {
        // Small reads → smaller WSS uplink frames (iOS dies on huge concurrent sends).
        conn.readMinimumLength(1, maximumLength: 16 * 1024) { [weak self] data, error in
            guard let self else { return }
            self.queue.async {
                if let error {
                    self.cleanup(streamId, reason: error.localizedDescription)
                    return
                }
                if let data, !data.isEmpty {
                    self.onBytes?(0, Int64(data.count))
                    self.onUpstream?(streamId, data)
                    self.receiveLoopNE(streamId: streamId, conn: conn)
                } else {
                    self.cleanup(streamId, reason: "eof")
                }
            }
        }
    }
    #endif

    // MARK: - Pinned / app path

    private func openViaNW(
        streamId: String,
        host: String,
        port: UInt16,
        requiredInterface: NWInterface.InterfaceType?,
    ) {
        pending[streamId] = []
        let endpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: NWEndpoint.Port(rawValue: port) ?? .https,
        )
        let params = NWParameters.tcp
        params.allowLocalEndpointReuse = true
        // Cellular is "expensive" — must allow it for mobile mode / automatic cellular.
        params.prohibitConstrainedPaths = false
        params.prohibitExpensivePaths = false
        if let requiredInterface {
            params.requiredInterfaceType = requiredInterface
        }
        let conn = NWConnection(to: endpoint, using: params)
        connections[streamId] = conn
        conn.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            switch state {
            case .ready:
                self.flushPending(streamId: streamId, conn: conn)
                self.onOpenOk?(streamId)
                self.receiveLoop(streamId: streamId, conn: conn)
            case let .failed(err):
                self.failOpen(streamId, err.localizedDescription)
            case .cancelled:
                self.cleanup(streamId, reason: "cancelled")
            case let .waiting(err):
                _ = err
            default:
                break
            }
        }
        conn.start(queue: queue)

        // Failsafe if stuck waiting (e.g. mobile off while cellular_only)
        queue.asyncAfter(deadline: .now() + 15) { [weak self] in
            guard let self else { return }
            guard self.connections[streamId] != nil else { return }
            // still not ready → open_err
            if case .ready = self.connections[streamId]?.state {
                return
            }
            // Only fail if never opened (onOpenOk clears via connections still present when ready)
            // Check via a simple flag: if onOpenOk already ran, receive loop is active.
            // Use presence of pending as "not yet ready" heuristic + state.
            switch self.connections[streamId]?.state {
            case .ready:
                break
            case .failed, .cancelled:
                break
            default:
                let code: String
                if requiredInterface == .wifi {
                    code = "wifi_connect_timeout"
                } else if requiredInterface == .cellular {
                    code = "cellular_connect_timeout"
                } else {
                    code = "connect_timeout"
                }
                self.failOpen(streamId, code)
            }
        }
    }

    private func flushPending(streamId: String, conn: NWConnection) {
        let chunks = pending.removeValue(forKey: streamId) ?? []
        for chunk in chunks {
            conn.send(content: chunk, completion: .contentProcessed { [weak self] err in
                if err == nil {
                    self?.onBytes?(Int64(chunk.count), 0)
                }
            })
        }
    }

    private func receiveLoop(streamId: String, conn: NWConnection) {
        conn.receive(minimumIncompleteLength: 1, maximumLength: 256 * 1024) { [weak self] data, _, isComplete, error in
            guard let self else { return }
            if let data, !data.isEmpty {
                self.onBytes?(0, Int64(data.count))
                self.onUpstream?(streamId, data)
            }
            if error != nil {
                self.cleanup(streamId, reason: error?.localizedDescription ?? "read_fail")
                return
            }
            if isComplete {
                self.cleanup(streamId, reason: "eof")
                return
            }
            self.receiveLoop(streamId: streamId, conn: conn)
        }
    }

    private func failOpen(_ streamId: String, _ code: String) {
        pending.removeValue(forKey: streamId)
        var wasPending = false
        #if canImport(NetworkExtension)
        wasPending = (neConnections[streamId] != nil && !neOpened.contains(streamId))
            || connections[streamId] != nil
        neOpened.remove(streamId)
        neObservers.removeValue(forKey: streamId)?.invalidate()
        if let c = neConnections.removeValue(forKey: streamId) {
            c.cancel()
        }
        #else
        wasPending = connections[streamId] != nil
        #endif
        if let c = connections.removeValue(forKey: streamId) {
            c.cancel()
            wasPending = true
        }
        // Always surface open_err when we never completed open_ok
        onOpenErr?(streamId, code)
        onClosed?(streamId, code)
        _ = wasPending
    }

    private func cleanup(_ streamId: String, reason: String) {
        pending.removeValue(forKey: streamId)
        var closed = false
        #if canImport(NetworkExtension)
        neOpened.remove(streamId)
        neObservers.removeValue(forKey: streamId)?.invalidate()
        if let c = neConnections.removeValue(forKey: streamId) {
            c.cancel()
            closed = true
        }
        #endif
        if let c = connections.removeValue(forKey: streamId) {
            c.cancel()
            closed = true
        }
        if closed {
            onClosed?(streamId, reason)
        }
    }
}
