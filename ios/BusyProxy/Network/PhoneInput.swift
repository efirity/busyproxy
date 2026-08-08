import Foundation

/// Phone helpers — E.164 normalize + dial-prefix detection (parity with Android).
enum PhoneInput {
    /// Digits only (keeps leading + if present as intent via separate flag).
    static func digits(in raw: String) -> String {
        raw.filter(\.isNumber)
    }

    /// Normalize to E.164-ish form: leading +, digits only after.
    static func normalizeE164(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        let d = digits(in: trimmed)
        guard !d.isEmpty else { return "" }
        if trimmed.hasPrefix("+") || d.count >= 10 {
            return "+" + d
        }
        return "+" + d
    }

    /// True when field is empty or only a short country prefix (≤4 digits).
    static func isEmptyOrPrefixOnly(_ raw: String) -> Bool {
        digits(in: raw).count <= 4
    }

    /// Apply IP-based dial prefix (e.g. "+373") without wiping a full number the user typed.
    static func applyingHint(prefix: String?, current: String) -> String {
        guard let prefix, !prefix.isEmpty else { return current }
        let p = prefix.hasPrefix("+") ? prefix : "+\(prefix)"
        if isEmptyOrPrefixOnly(current) {
            return p + " "
        }
        return current
    }
}
