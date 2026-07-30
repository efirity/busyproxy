import Foundation

@MainActor
final class Prefs: ObservableObject {
    private let d = UserDefaults.standard

    @Published var consentAccepted: Bool {
        didSet { d.set(consentAccepted, forKey: Keys.consent) }
    }

    @Published var sessionToken: String? {
        didSet { d.set(sessionToken, forKey: Keys.token) }
    }

    @Published var userId: String? {
        didSet { d.set(userId, forKey: Keys.userId) }
    }

    @Published var phone: String? {
        didSet { d.set(phone, forKey: Keys.phone) }
    }

    @Published var displayName: String? {
        didSet { d.set(displayName, forKey: Keys.displayName) }
    }

    @Published var deviceId: String? {
        didSet { d.set(deviceId, forKey: Keys.deviceId) }
    }

    @Published var deviceSecret: String? {
        didSet { d.set(deviceSecret, forKey: Keys.deviceSecret) }
    }

    @Published var networkMode: NetworkMode {
        didSet { d.set(networkMode.rawValue, forKey: Keys.networkMode) }
    }

    let installId: String

    init() {
        consentAccepted = d.bool(forKey: Keys.consent)
        sessionToken = d.string(forKey: Keys.token)
        userId = d.string(forKey: Keys.userId)
        phone = d.string(forKey: Keys.phone)
        displayName = d.string(forKey: Keys.displayName)
        deviceId = d.string(forKey: Keys.deviceId)
        deviceSecret = d.string(forKey: Keys.deviceSecret)
        if let raw = d.string(forKey: Keys.networkMode),
           let m = NetworkMode(rawValue: raw)
        {
            networkMode = m
        } else {
            networkMode = .automatic
        }
        if let existing = d.string(forKey: Keys.installId), existing.count >= 8 {
            installId = existing
        } else {
            let id = "inst_" + UUID().uuidString.replacingOccurrences(of: "-", with: "")
            d.set(id, forKey: Keys.installId)
            installId = id
        }
    }

    func clearSession() {
        sessionToken = nil
        userId = nil
        phone = nil
        displayName = nil
    }

    private enum Keys {
        static let consent = "bp.consent"
        static let token = "bp.token"
        static let userId = "bp.userId"
        static let phone = "bp.phone"
        static let displayName = "bp.displayName"
        static let deviceId = "bp.deviceId"
        static let deviceSecret = "bp.deviceSecret"
        static let networkMode = "bp.networkMode"
        static let installId = "bp.installId"
    }
}

enum NetworkMode: String, CaseIterable, Identifiable {
    case automatic
    case wifiOnly = "wifi_only"
    case cellularOnly = "cellular_only"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .automatic: return "Automatic"
        case .wifiOnly: return "Wi‑Fi only"
        case .cellularOnly: return "Mobile only"
        }
    }
}
