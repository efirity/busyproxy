import SwiftUI

struct LoginView: View {
    @EnvironmentObject var model: AppModel
    @State private var name = ""
    @State private var phone = ""
    @State private var code = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Sign in")
                    .font(.largeTitle.bold())
                Text("Phone number + SMS code")
                    .foregroundStyle(.secondary)

                if !model.otpSent {
                    TextField("Display name", text: $name)
                        .textContentType(.name)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    TextField("Phone (+E.164)", text: $phone)
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
                            Text("Send code").frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(model.authBusy || name.count < 2 || phone.count < 8)
                } else {
                    Text("Code sent to \(model.pendingPhone)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    TextField("6-digit code", text: $code)
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
                            Text("Verify").frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(model.authBusy || code.count < 4)
                    Button("Use different number") {
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
    }
}
