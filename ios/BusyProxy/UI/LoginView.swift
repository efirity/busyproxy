import SwiftUI

struct LoginView: View {
    @EnvironmentObject var model: AppModel
    @State private var name = ""
    @State private var phone = ""
    @State private var code = ""
    @State private var countryLabel: String?

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
                        .textInputAutocapitalization(.words)
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    VStack(alignment: .leading, spacing: 6) {
                        TextField(L10n.t("phone_e164"), text: $phone)
                            .textContentType(.telephoneNumber)
                            .keyboardType(.phonePad)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding()
                            .background(Color.white.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        if let countryLabel {
                            Text(countryLabel)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        } else {
                            Text(L10n.t("phone_hint_help"))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button {
                        Task {
                            await model.sendOtp(phone: phone, name: name)
                            if model.otpSent {
                                phone = model.pendingPhone
                            }
                        }
                    } label: {
                        if model.authBusy {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text(L10n.t("send_code")).frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(model.authBusy || name.trimmingCharacters(in: .whitespaces).count < 2 || PhoneInput.digits(in: phone).count < 8)
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
                        model.authError = nil
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
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.black.ignoresSafeArea())
        .id(model.prefs.languageCode)
        .task {
            await bootstrapPhoneField()
        }
    }

    /// Restore last login + IP-based dial prefix (Android parity).
    private func bootstrapPhoneField() async {
        if name.isEmpty, let last = model.prefs.lastLoginName, !last.isEmpty {
            name = last
        }
        if phone.isEmpty, let last = model.prefs.lastLoginPhone, !last.isEmpty {
            phone = last
        } else if phone.isEmpty, let signed = model.prefs.phone, !signed.isEmpty {
            phone = signed
        }

        // Only auto-fill country when field is empty / prefix-only
        guard PhoneInput.isEmptyOrPrefixOnly(phone) else { return }
        do {
            let hint = try await model.fetchPhoneHint()
            if let prefix = hint.prefix, !prefix.isEmpty {
                phone = PhoneInput.applyingHint(prefix: prefix, current: phone)
                if let cc = hint.countryCode, let country = hint.country {
                    countryLabel = L10n.t("phone_country_detected", "\(country) (\(cc)) \(prefix)" as CVarArg)
                } else if let prefix = hint.prefix {
                    countryLabel = L10n.t("phone_prefix_detected", prefix as CVarArg)
                }
            }
        } catch {
            // Silent — user can type full E.164 manually
        }
    }
}
