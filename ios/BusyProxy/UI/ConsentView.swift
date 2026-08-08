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
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding(.top, 12)
            }
            .padding(24)
        }
        .background(Color.black.ignoresSafeArea())
        .id(model.prefs.languageCode)
    }
}
