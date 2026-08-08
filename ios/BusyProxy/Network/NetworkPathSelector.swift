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
        // Simulator / Mac often has no cellular and may not tag en0 as .wifi —
        // only pin interface when the path actually has that type (avoid silent open fails).
        switch mode {
        case .wifiOnly:
            if path?.usesInterfaceType(.wifi) == true {
                params.requiredInterfaceType = .wifi
            }
        case .cellularOnly:
            if path?.usesInterfaceType(.cellular) == true {
                params.requiredInterfaceType = .cellular
            }
        case .automatic:
            // Do not force interface type; let the system pick a satisfied path.
            break
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
