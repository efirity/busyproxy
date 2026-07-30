/** Admin console API — all users / wallets / withdrawals (operator only). */

function token(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("relay_session_token");
  } catch {
    return null;
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const t = token();
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(t ? { authorization: `Bearer ${t}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Admin API failed (${res.status})`,
    );
  }
  return data as T;
}

export type AdminUserRow = {
  id: string;
  phone: string;
  displayName: string | null;
  email: string | null;
  country: string | null;
  status: string;
  payoutReady: boolean;
  stripeConnected: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  wallet: {
    availableCents: number;
    pendingWithdrawCents: number;
    lifetimeEarnCents: number;
    lifetimeWithdrawnCents: number;
  };
  devices: {
    enrolled: number;
    live: number;
    online: number;
    liveNames: string[];
    networks: string[];
  };
};

export type AdminWithdrawalRow = {
  id: string;
  userId: string;
  phone: string | null;
  displayName: string | null;
  amountCents: number;
  status: string;
  stripeTransferId: string | null;
  reviewNote: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type AdminAppEvent = {
  id: string | null;
  createdAt: string;
  userId: string | null;
  installId: string;
  phone: string | null;
  eventType: string;
  eventCategory: string;
  message: string | null;
  props: Record<string, unknown>;
  appVersion: string | null;
  platform: string | null;
  deviceModel: string | null;
  osVersion: string | null;
  clientIp: string | null;
};

export function fetchUserEvents(userId: string, limit = 150) {
  return json<{
    ok: boolean;
    events: AdminAppEvent[];
    source: string;
    retentionDays: number;
    userId: string;
    phone: string | null;
    displayName: string | null;
  }>(`/users/${encodeURIComponent(userId)}/events?limit=${limit}`);
}

export type AdminOverview = {
  generatedAt: string;
  totals: {
    users: number;
    walletsAvailableCents: number;
    walletsPendingCents: number;
    lifetimeEarnCents: number;
    lifetimeWithdrawnCents: number;
    paidWithdrawCents: number;
    pendingWithdrawCents: number;
    liveDevices: number;
    onlineDevices: number;
  };
  users: AdminUserRow[];
  withdrawals: AdminWithdrawalRow[];
};

export function fetchAdminOverview() {
  return json<AdminOverview>("/overview");
}

export function fetchAdminUsers() {
  return json<{ users: AdminUserRow[]; totals: AdminOverview["totals"] }>(
    "/users",
  );
}

export function fetchAdminWithdrawals() {
  return json<{
    withdrawals: AdminWithdrawalRow[];
    totals: { paidCents: number; pendingCents: number; count: number };
  }>("/withdrawals");
}
