import Foundation
import SwiftUI

@MainActor
final class AppModel: ObservableObject {
    let prefs = Prefs()
    lazy var relay = RelayEngine(prefs: prefs)
    private let api = ApiClient()

    @Published var wallet: WalletSnapshot?
    @Published var authBusy = false
    @Published var authError: String?
    @Published var otpSent = false
    @Published var pendingPhone = ""
    @Published var pendingName = ""

    var isSignedIn: Bool { prefs.sessionToken != nil }

    func acceptConsent() {
        prefs.consentAccepted = true
    }

    func sendOtp(phone: String, name: String) async {
        authBusy = true
        authError = nil
        defer { authBusy = false }
        do {
            try await api.startOtp(phone: phone, displayName: name)
            pendingPhone = phone
            pendingName = name
            otpSent = true
        } catch {
            authError = error.localizedDescription
        }
    }

    func verifyOtp(code: String) async {
        authBusy = true
        authError = nil
        defer { authBusy = false }
        do {
            let session = try await api.verifyOtp(phone: pendingPhone, code: code)
            guard let token = session.bearer else {
                authError = "No session token"
                return
            }
            prefs.sessionToken = token
            prefs.userId = session.user?.id
            prefs.phone = session.user?.phone ?? pendingPhone
            prefs.displayName = session.user?.displayName ?? pendingName
            otpSent = false
            await refreshWallet()
        } catch {
            authError = error.localizedDescription
        }
    }

    func logout() {
        relay.stop()
        prefs.clearSession()
        wallet = nil
    }

    func refreshWallet() async {
        guard let token = prefs.sessionToken else { return }
        do {
            wallet = try await api.wallet(token: token)
        } catch {
            // non-fatal
        }
    }
}
