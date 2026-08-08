import SwiftUI

struct WalletView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        NavigationStack {
            List {
                Section(L10n.t("available")) {
                    let cents = model.wallet?.availableCents ?? 0
                    Text(String(format: "$%.2f", Double(cents) / 100))
                        .font(.largeTitle.bold())
                        .listRowBackground(Color.clear)
                }
                Section(L10n.t("status")) {
                    let ready = model.wallet?.payoutsEnabled == true
                    Label(
                        ready ? L10n.t("payout_ready") : L10n.t("link_bank_web"),
                        systemImage: ready ? "checkmark.circle.fill" : "link",
                    )
                    let minCents = model.wallet?.minWithdrawCents ?? AppConfig.minWithdrawCents
                    Text(L10n.t("min_withdraw", Int32(minCents / 100)))
                        .foregroundStyle(.secondary)
                }
                Section {
                    Link(
                        L10n.t("open_dashboard"),
                        destination: URL(string: "\(AppConfig.apiBase)/dashboard")!,
                    )
                } footer: {
                    Text(L10n.t("wallet_footer"))
                }
            }
            .navigationTitle(L10n.t("tab_wallet"))
            .refreshable { await model.refreshWallet() }
            .task { await model.refreshWallet() }
        }
        .id(model.prefs.languageCode)
    }
}
