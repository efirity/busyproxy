import SwiftUI

struct ConsentView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(L10n.t("app_name"))
                    .font(.largeTitle.bold())
                Text(L10n.t("consent_tagline"))
                    .font(.title3)
                    .foregroundStyle(.secondary)

                Text(
                    L10n.t("consent_body", Int32(AppConfig.minWithdrawCents / 100)),
                )
                .font(.body)
                .foregroundStyle(.secondary)

                Link(L10n.t("privacy_policy"), destination: AppConfig.privacyURL)
                Link(L10n.t("terms_of_service"), destination: AppConfig.termsURL)

                Button {
                    model.acceptConsent()
                } label: {
                    Text(L10n.t("consent_continue"))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding(.top, 12)
                // Keep CTA tappable even when disclosure text is long (ScrollView).
                .contentShape(Rectangle())
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.black.ignoresSafeArea())
        .id(model.prefs.languageCode)
    }
}
