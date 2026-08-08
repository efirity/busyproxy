import SwiftUI

struct LoginView: View {
    @EnvironmentObject var model: AppModel
    @State private var name = ""
    @State private var phone = ""
    @State private var code = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(L10n.t("sign_in"))
                    .font(.largeTitle.bold())
                Text(L10n.t("sign_in_subtitle"))
                    .foregroundStyle(.secondary)

                if !model.otpSent {
                    TextField(L10n.t("display_name"), text: $name)
                        .textContentType(.name)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    TextField(L10n.t("phone_e164"), text: $phone)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    Button {
                        Task { await model.sendOtp(phone: phone, name: name) }
                    } label: {
                        if model.authBusy {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text(L10n.t("send_code")).frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(model.authBusy || name.count < 2 || phone.count < 8)
                } else {
                    Text(L10n.t("code_sent_to", model.pendingPhone as CVarArg))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    TextField(L10n.t("otp_code"), text: $code)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    Button {
                        Task { await model.verifyOtp(code: code) }
                    } label: {
                        if model.authBusy {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text(L10n.t("verify")).frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(model.authBusy || code.count < 4)
                    Button(L10n.t("use_different_number")) {
                        model.otpSent = false
                        code = ""
                    }
                    .padding(.top, 4)
                }

                if let err = model.authError {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .padding(24)
        }
        .background(Color.black.ignoresSafeArea())
        .id(model.prefs.languageCode)
    }
}
