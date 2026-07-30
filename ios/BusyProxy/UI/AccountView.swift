import SwiftUI

struct AccountView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        NavigationStack {
            List {
                Section("Signed in") {
                    Text(model.prefs.displayName ?? "Earner")
                    Text(model.prefs.phone ?? "—")
                        .font(.body.monospaced())
                        .foregroundStyle(.secondary)
                }
                Section("Legal") {
                    Link("Privacy", destination: AppConfig.privacyURL)
                    Link("Terms", destination: AppConfig.termsURL)
                    Link(
                        "Support",
                        destination: URL(string: "mailto:\(AppConfig.supportEmail)")!,
                    )
                }
                Section {
                    Button("Log out", role: .destructive) {
                        model.logout()
                    }
                }
                Section("About") {
                    Text("BusyProxy iOS Phase 1")
                    Text("Install \(model.prefs.installId.prefix(16))…")
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Account")
        }
    }
}
