import SwiftUI

struct ConsentView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("BusyProxy")
                    .font(.largeTitle.bold())
                Text("Earn by sharing spare Wi‑Fi or mobile data")
                    .font(.title3)
                    .foregroundStyle(.secondary)

                Text(
                    "When you start sharing, BusyProxy routes authenticated internet traffic through your phone’s connection. You control start and stop. Minimum cash-out $\(AppConfig.minWithdrawCents / 100) via Stripe.",
                )
                .font(.body)
                .foregroundStyle(.secondary)

                Link("Privacy Policy", destination: AppConfig.privacyURL)
                Link("Terms of Service", destination: AppConfig.termsURL)

                Button {
                    model.acceptConsent()
                } label: {
                    Text("I understand — Continue")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding(.top, 12)
            }
            .padding(24)
        }
        .background(Color.black.ignoresSafeArea())
    }
}
