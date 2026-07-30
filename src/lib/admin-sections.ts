/** Operator console sections — mirrored in URL as /portal/:section */

export const ADMIN_SECTIONS = [
  "overview",
  "proxies",
  "gateway",
  "users",
  "devices",
  "traffic",
  "withdrawals",
  "risk",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const DEFAULT_ADMIN_SECTION: AdminSection = "devices";

export function isAdminSection(value: string | undefined | null): value is AdminSection {
  return !!value && (ADMIN_SECTIONS as readonly string[]).includes(value);
}

export function parseAdminSection(
  value: string | undefined | null,
): AdminSection {
  return isAdminSection(value) ? value : DEFAULT_ADMIN_SECTION;
}

/** Canonical path for a section (works on admin.* and main host). */
export function adminSectionPath(section: AdminSection): string {
  return `/portal/${section}`;
}
