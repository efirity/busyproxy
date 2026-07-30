import Foundation
import Network

/// Picks Wi‑Fi vs cellular for NWConnection parameters (best-effort pin).
final class NetworkPathSelector {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "bp.path")
    private(set) var path: NWPath?

    init() {
        monitor.pathUpdateHandler = { [weak self] p in
            self?.path = p
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }

    func parameters(for mode: NetworkMode) -> NWParameters {
        let params = NWParameters.tcp
        params.allowLocalEndpointReuse = true
        switch mode {
        case .wifiOnly:
            params.requiredInterfaceType = .wifi
        case .cellularOnly:
            params.requiredInterfaceType = .cellular
        case .automatic:
            // Prefer current satisfied path type when known
            if let path, path.usesInterfaceType(.wifi) {
                params.requiredInterfaceType = .wifi
            } else if let path, path.usesInterfaceType(.cellular) {
                params.requiredInterfaceType = .cellular
            }
        }
        return params
    }

    func transportLabel(for mode: NetworkMode) -> String {
        switch mode {
        case .wifiOnly: return "wifi"
        case .cellularOnly: return "cellular"
        case .automatic:
            if let path, path.usesInterfaceType(.cellular) { return "cellular" }
            return "wifi"
        }
    }

    var hasSatisfiedPath: Bool {
        path?.status == .satisfied
    }
}
