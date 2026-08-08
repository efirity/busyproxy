import SwiftUI

struct WalletView: View {
    @EnvironmentObject var model: AppModel

    private var payoutReady: Bool {
        model.wallet?.payoutsEnabled == true
    }

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
                    Label(
                        payoutReady ? L10n.t("payout_ready") : L10n.t("link_bank_needed"),
                        systemImage: payoutReady ? "checkmark.circle.fill" : "creditcard",
                    )
                    .foregroundStyle(payoutReady ? .green : .primary)
                    let minCents = model.wallet?.minWithdrawCents ?? AppConfig.minWithdrawCents
                    Text(L10n.t("min_withdraw", Int32(minCents / 100)))
                        .foregroundStyle(.secondary)
                    if let msg = model.stripeMessage, !msg.isEmpty {
                        Text(msg)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let err = model.stripeError, !err.isEmpty {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
                Section {
                    if !payoutReady {
                        Button {
                            Task { await model.linkStripePayout() }
                        } label: {
                            HStack {
                                Text(L10n.t("link_bank"))
                                Spacer()
                                if model.stripeBusy {
                                    ProgressView()
                                } else {
                                    Image(systemName: "arrow.up.right")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .disabled(model.stripeBusy)
                    } else {
                        Button {
                            Task { await model.refreshStripeStatus() }
                        } label: {
                            Text(L10n.t("refresh_payout_status"))
                        }
                        .disabled(model.stripeBusy)
                    }
                    Link(
                        L10n.t("open_dashboard"),
                        destination: URL(string: "\(AppConfig.apiBase)/dashboard")!,
                    )
                } footer: {
                    Text(L10n.t("wallet_footer_inapp"))
                }
            }
            .navigationTitle(L10n.t("tab_wallet"))
            .refreshable {
                await model.refreshWallet()
                await model.refreshStripeStatus()
            }
            .task { await model.refreshWallet() }
        }
        .id(model.prefs.languageCode)
    }
}
