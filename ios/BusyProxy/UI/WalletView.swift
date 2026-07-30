import SwiftUI

struct WalletView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        NavigationStack {
            List {
                Section("Available") {
                    let cents = model.wallet?.availableCents ?? 0
                    Text(String(format: "$%.2f", Double(cents) / 100))
                        .font(.largeTitle.bold())
                        .listRowBackground(Color.clear)
                }
                Section("Status") {
                    let ready = model.wallet?.payoutsEnabled == true
                    Label(
                        ready ? "Payout method ready" : "Link bank in web dashboard",
                        systemImage: ready ? "checkmark.circle.fill" : "link",
                    )
                    let minCents = model.wallet?.minWithdrawCents ?? AppConfig.minWithdrawCents
                    Text("Minimum withdraw $\(minCents / 100)")
                        .foregroundStyle(.secondary)
                }
                Section {
                    Link("Open web dashboard for Stripe", destination: URL(string: "\(AppConfig.apiBase)/dashboard")!)
                } footer: {
                    Text("iOS Phase 1 uses the website for bank link and cash-out. Same account as this phone login.")
                }
            }
            .navigationTitle("Wallet")
            .refreshable { await model.refreshWallet() }
            .task { await model.refreshWallet() }
        }
    }
}
