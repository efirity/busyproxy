import SwiftUI

struct AccountView: View {
    @EnvironmentObject var model: AppModel
    @State private var nameDraft: String = ""
    @FocusState private var nameFocused: Bool

    private var nameDirty: Bool {
        let current = (model.prefs.displayName ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let draft = nameDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        return draft != current && draft.count >= 2
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 10) {
                        TextField(L10n.t("display_name"), text: $nameDraft)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .focused($nameFocused)
                            .submitLabel(.done)
                            .onSubmit {
                                if nameDirty { Task { await model.saveDisplayName(nameDraft) } }
                            }
                        if nameDirty {
                            Button {
                                Task { await model.saveDisplayName(nameDraft) }
                            } label: {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(.green)
                                    .accessibilityLabel(L10n.t("save_name"))
                            }
                            .buttonStyle(.plain)
                            .disabled(model.profileBusy)
                        }
                    }
                    if model.profileBusy {
                        ProgressView()
                            .scaleEffect(0.85)
                    }
                    if let msg = model.profileMessage, !msg.isEmpty {
                        Text(msg)
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                    if let err = model.profileError, !err.isEmpty {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    Text(model.prefs.phone ?? "—")
                        .font(.body.monospaced())
                        .foregroundStyle(.secondary)
                } header: {
                    Text(L10n.t("signed_in"))
                } footer: {
                    Text(L10n.t("name_edit_footer"))
                }

                Section {
                    Picker(L10n.t("language"), selection: Binding(
                        get: {
                            AppLanguage(rawValue: model.prefs.languageCode) ?? .en
                        },
                        set: { lang in
                            model.setLanguage(lang)
                        },
                    )) {
                        ForEach(AppLanguage.allCases) { lang in
                            Text(lang.menuTitle).tag(lang)
                        }
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text(L10n.t("language"))
                } footer: {
                    Text(L10n.t("language_footer"))
                }
                Section(L10n.t("legal")) {
                    Link(L10n.t("privacy"), destination: AppConfig.privacyURL)
                    Link(L10n.t("terms"), destination: AppConfig.termsURL)
                    Link(
                        L10n.t("support"),
                        destination: URL(string: "mailto:\(AppConfig.supportEmail)")!,
                    )
                }
                Section {
                    Button(L10n.t("log_out"), role: .destructive) {
                        model.logout()
                    }
                }
                Section(L10n.t("about")) {
                    Text(L10n.t("about_phase1"))
                    Text(L10n.t("install_id", String(model.prefs.installId.prefix(16)) as CVarArg))
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(L10n.t("tab_account"))
            .onAppear {
                nameDraft = model.prefs.displayName ?? ""
                model.logAccountOpen()
            }
            .onChange(of: model.prefs.displayName) { _, new in
                if !nameFocused {
                    nameDraft = new ?? ""
                }
            }
        }
        .id(model.prefs.languageCode)
    }
}
