import Foundation
import Network
#if canImport(NetworkExtension)
import NetworkExtension
#endif

/// Destination TCP dialer for reverse-tunnel streams (app + Packet Tunnel extension).
///
/// **Critical for NE:** plain `NWConnection` inside a Packet Tunnel is often bound to the
/// virtual utun (no default route) so every open fails. When a `NEPacketTunnelProvider`
/// is set, we use `createTCPConnection` which uses the **physical** interface.
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

    public var onUpstream: ((String, Data) -> Void)?
    public var onClosed: ((String, String) -> Void)?
    public var onBytes: ((Int64, Int64) -> Void)?
    public var onOpenOk: ((String) -> Void)?
    public var onOpenErr: ((String, String) -> Void)?

    public init() {}

    public func activeCount() -> Int {
        queue.sync {
            #if canImport(NetworkExtension)
            return connections.count + neConnections.count
            #else
            return connections.count
            #endif
        }
    }

    public func open(streamId: String, host: String, port: UInt16) {
        queue.async {
            #if canImport(NetworkExtension)
            if self.neConnections[streamId] != nil || self.connections[streamId] != nil { return }
            if let provider = self.packetTunnelProvider {
                self.openViaProvider(provider, streamId: streamId, host: host, port: port)
                return
            }
            // No provider (shouldn't happen in NE) — still try NW path
            #endif
            if self.connections[streamId] != nil { return }
            self.openViaNW(streamId: streamId, host: host, port: port)
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
        // URL-safe / padding-tolerant decode
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

    // MARK: - Physical path (Packet Tunnel)

    #if canImport(NetworkExtension)
    private func openViaProvider(
        _ provider: NEPacketTunnelProvider,
        streamId: String,
        host: String,
        port: UInt16,
    ) {
        pending[streamId] = []
        // Prefer IPv4 literals when possible later; hostname uses system DNS on physical path.
        let endpoint = NWHostEndpoint(hostname: host, port: String(port))
        // NEProvider.createTCPConnection uses the physical network, not the tunnel utun.
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
                    // Surface error before cleanup so edge gets open_err not silent timeout
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
                    break // connecting / waiting
                }
            }
        }
        neObservers[streamId] = obs

        // Failsafe if stuck connecting
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
        conn.readMinimumLength(1, maximumLength: 256 * 1024) { [weak self] data, error in
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

    // MARK: - App / non-tunnel path

    private func openViaNW(streamId: String, host: String, port: UInt16) {
        pending[streamId] = []
        let endpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: NWEndpoint.Port(rawValue: port) ?? .https,
        )
        let params = NWParameters.tcp
        params.allowLocalEndpointReuse = true
        // Prefer real radios over constrained/expensive when possible
        params.prohibitConstrainedPaths = false
        params.prohibitExpensivePaths = false
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
                // Surface waiting as soft log via open_err if stuck — timeout handled by edge
                _ = err
            default:
                break
            }
        }
        conn.start(queue: queue)
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
        #if canImport(NetworkExtension)
        let wasPending = neConnections[streamId] != nil && !neOpened.contains(streamId)
        neOpened.remove(streamId)
        neObservers.removeValue(forKey: streamId)?.invalidate()
        if let c = neConnections.removeValue(forKey: streamId) {
            c.cancel()
        }
        #else
        let wasPending = connections[streamId] != nil
        #endif
        connections.removeValue(forKey: streamId)?.cancel()
        if wasPending {
            onOpenErr?(streamId, code)
        }
        onClosed?(streamId, code)
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
