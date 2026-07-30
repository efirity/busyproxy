/**
 * Predefined account-deletion reasons (product + Play review transparency).
 * Clients must send reasonCode; "other" requires free-text details.
 */

/** @type {ReadonlyArray<{ code: string, label: string }>} */
export const DELETION_REASONS = Object.freeze([
  { code: "not_earning", label: "Not earning enough" },
  { code: "battery_data", label: "Battery or data usage concerns" },
  { code: "privacy", label: "Privacy or trust concerns" },
  { code: "technical", label: "App technical issues / bugs" },
  { code: "switching", label: "Switching to another service" },
  { code: "temporary", label: "Taking a break / temporary" },
  { code: "other", label: "Other (please describe)" },
]);

const CODE_SET = new Set(DELETION_REASONS.map((r) => r.code));

/**
 * @param {{ reasonCode?: string, reasonText?: string } | null | undefined} input
 * @returns {{ code: string, label: string, detail: string | null }}
 */
export function normalizeDeletionReason(input) {
  const code = String(input?.reasonCode || input?.code || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (!code || !CODE_SET.has(code)) {
    const err = new Error(
      "Select a reason for deleting your account.",
    );
    err.status = 400;
    err.code = "deletion_reason_required";
    throw err;
  }
  const row = DELETION_REASONS.find((r) => r.code === code);
  let detail = String(input?.reasonText || input?.detail || input?.reason || "")
    .trim()
    .slice(0, 500);
  if (code === "other") {
    if (detail.length < 3) {
      const err = new Error(
        "Please describe why you are deleting your account (Other).",
      );
      err.status = 400;
      err.code = "deletion_reason_detail_required";
      throw err;
    }
  } else if (!detail) {
    detail = row.label;
  }
  return {
    code,
    label: row.label,
    detail: detail || null,
  };
}

export function listDeletionReasons() {
  return DELETION_REASONS.map((r) => ({ code: r.code, label: r.label }));
}
