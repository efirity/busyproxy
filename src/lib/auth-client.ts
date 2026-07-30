const TOKEN_KEY = "relay_session_token";
const USER_KEY = "relay_session_user";
export const AUTH_EVENT = "relay-auth-changed";

export type AuthUser = {
  id: string;
  phone: string;
  displayName: string | null;
  email: string | null;
  country: string | null;
  status: string;
  payoutReady?: boolean;
  createdAt?: string;
  /** Operator console access (admin phone allowlist) */
  isAdmin?: boolean;
  role?: "admin" | "earner" | string;
};

function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`/api/auth${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export function fetchAuthConfig() {
  return api<{
    twilioConfigured: boolean;
    testNumber: string;
    otpLength: number;
    expiresInSec: number;
  }>("/config");
}

/** Guess E.164 prefix from visitor IP (e.g. "+373"). No auth. */
export function fetchPhoneHint() {
  return api<{
    ok: boolean;
    prefix: string | null;
    dialCode?: string | null;
    countryCode?: string | null;
    country?: string | null;
    city?: string | null;
    source?: string;
  }>("/phone-hint");
}

export function startOtp(phone: string, displayName?: string) {
  return api<{
    ok: boolean;
    challengeId: string;
    phone: string;
    isNewUser?: boolean;
    expiresInSec: number;
    message: string;
  }>("/otp/start", {
    method: "POST",
    body: JSON.stringify({
      phone,
      displayName: displayName?.trim() || undefined,
    }),
  });
}

export async function verifyOtp(
  phone: string,
  code: string,
  displayName?: string,
) {
  const result = await api<{
    ok: boolean;
    token: string;
    expiresAt: string;
    user: AuthUser;
  }>("/otp/verify", {
    method: "POST",
    body: JSON.stringify({
      phone,
      code,
      displayName: displayName?.trim() || undefined,
    }),
  });
  persistSession(result.token, result.user);
  return result;
}

export async function fetchSession() {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const session = await api<{ user: AuthUser }>("/session");
    persistSession(token, session.user);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export async function logout() {
  try {
    await api("/logout", { method: "POST", body: "{}" });
  } catch {
    /* ignore */
  }
  clearSession();
}

export async function updateProfile(patch: {
  displayName?: string;
  email?: string | null;
}) {
  const result = await api<{ user: AuthUser }>("/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const token = getStoredToken();
  if (token) persistSession(token, result.user);
  return result.user;
}

export type DeletionReason = { code: string; label: string };

export function fetchDeletionReasons() {
  return api<{ ok: boolean; reasons: DeletionReason[] }>("/deletion-reasons");
}

/** Soft-delete the signed-in account (requires reason for ops). */
export async function deleteAccount(input: {
  reasonCode: string;
  reasonText?: string;
}) {
  const result = await api<{
    ok: boolean;
    deleted?: boolean;
    message?: string;
    reason?: { code: string; label: string; detail: string | null };
  }>("/account", {
    method: "DELETE",
    body: JSON.stringify({
      reasonCode: input.reasonCode,
      reasonText: input.reasonText,
    }),
  });
  clearSession();
  return result;
}

/** Mask phone for UI: +373•••2830 */
export function formatPhoneShort(phone: string | null | undefined) {
  if (!phone) return "Account";
  const d = phone.replace(/\s/g, "");
  if (d.length < 6) return d;
  return `${d.slice(0, 4)}···${d.slice(-4)}`;
}
