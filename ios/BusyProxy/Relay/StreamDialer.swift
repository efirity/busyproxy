import Foundation
import Network

/// Opens destination TCP connections (egress) and pumps bytes to/from the tunnel.
final class StreamDialer: @unchecked Sendable {
    private let queue = DispatchQueue(label: "bp.dialer", qos: .userInitiated)
    private var connections: [String: NWConnection] = [:]
    private var pending: [String: [Data]] = [:]

    var onUpstream: ((String, Data) -> Void)?
    var onClosed: ((String, String) -> Void)?
    var onBytes: ((Int64, Int64) -> Void)?
    var onOpenOk: ((String) -> Void)?
    var onOpenErr: ((String, String) -> Void)?

    func activeCount() -> Int {
        queue.sync { connections.count }
    }

    func open(streamId: String, host: String, port: UInt16, parameters: NWParameters) {
        queue.async {
            if self.connections[streamId] != nil { return }
            self.pending[streamId] = []
            let endpoint = NWEndpoint.hostPort(
                host: NWEndpoint.Host(host),
                port: NWEndpoint.Port(rawValue: port) ?? .https,
            )
            let conn = NWConnection(to: endpoint, using: parameters)
            self.connections[streamId] = conn
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
                default:
                    break
                }
            }
            conn.start(queue: self.queue)
        }
    }

    func write(streamId: String, data: Data) {
        queue.async {
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

    func writeBase64(streamId: String, b64: String) {
        guard let data = Data(base64Encoded: b64) else { return }
        write(streamId: streamId, data: data)
    }

    func close(_ streamId: String, reason: String) {
        queue.async {
            self.cleanup(streamId, reason: reason)
        }
    }

    func closeAll() {
        queue.async {
            let ids = Array(self.connections.keys)
            for id in ids {
                self.cleanup(id, reason: "teardown")
            }
            self.pending.removeAll()
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
        conn.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
            guard let self else { return }
            if let data, !data.isEmpty {
                self.onBytes?(0, Int64(data.count))
                self.onUpstream?(streamId, data)
            }
            if isComplete || error != nil {
                self.cleanup(streamId, reason: error?.localizedDescription ?? "eof")
                return
            }
            self.receiveLoop(streamId: streamId, conn: conn)
        }
    }

    private func failOpen(_ streamId: String, _ code: String) {
        pending.removeValue(forKey: streamId)
        connections.removeValue(forKey: streamId)?.cancel()
        onOpenErr?(streamId, code)
        onClosed?(streamId, code)
    }

    private func cleanup(_ streamId: String, reason: String) {
        pending.removeValue(forKey: streamId)
        if let c = connections.removeValue(forKey: streamId) {
            c.cancel()
            onClosed?(streamId, reason)
        }
    }
}
