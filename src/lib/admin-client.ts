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
  /** Edge agent device id when known (per-phone logs) */
  deviceId?: string | null;
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

export type AdminJourneySummary = {
  reachedSteps: string[];
  lastStep: number;
  lastStepKey: string | null;
  droppedAt: string | null;
  fullyFunctional: boolean;
  notLoggedInReason?: string | null;
  lastBlock?: {
    type: string;
    reason: string | null;
    message: string | null;
  } | null;
  milestones: Array<{ step: number; key: string; done: boolean }>;
};

export type AdminEventDeviceChip = {
  installId: string;
  deviceId?: string | null;
  deviceModel?: string | null;
  platform?: string | null;
  count?: number;
  lastAt?: string | null;
  name?: string;
  online?: boolean;
};

export function fetchUserEvents(
  userId: string,
  opts?: { limit?: number; deviceId?: string | null; installId?: string | null },
) {
  const limit = opts?.limit ?? 250;
  const q = new URLSearchParams({ limit: String(limit) });
  if (opts?.deviceId) q.set("deviceId", opts.deviceId);
  if (opts?.installId) q.set("installId", opts.installId);
  return json<{
    ok: boolean;
    events: AdminAppEvent[];
    journey?: AdminJourneySummary;
    devices?: AdminEventDeviceChip[];
    liveDevices?: AdminEventDeviceChip[];
    source: string;
    retentionDays: number;
    userId: string;
    phone: string | null;
    displayName: string | null;
    filter?: { deviceId?: string | null; installId?: string | null };
  }>(`/users/${encodeURIComponent(userId)}/events?${q}`);
}

/** App funnel logs for a single enrolled edge device. */
export function fetchDeviceEvents(
  deviceId: string,
  opts?: { limit?: number; userId?: string | null; installId?: string | null },
) {
  const limit = opts?.limit ?? 250;
  const q = new URLSearchParams({ limit: String(limit) });
  if (opts?.userId) q.set("userId", opts.userId);
  if (opts?.installId) q.set("installId", opts.installId);
  return json<{
    ok: boolean;
    events: AdminAppEvent[];
    journey?: AdminJourneySummary;
    devices?: AdminEventDeviceChip[];
    source: string;
    retentionDays: number;
    deviceId: string;
    deviceName?: string | null;
    userId?: string | null;
    installId?: string | null;
    scope?: string;
  }>(`/devices/${encodeURIComponent(deviceId)}/events?${q}`);
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

/** Full infrastructure status (admin only). Prefer /api/status/admin. */
export function fetchAdminSystemStatus() {
  const t = token();
  return fetch("/api/status/admin", {
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { error?: string }).error ||
          `Admin status failed (${res.status})`,
      );
    }
    return data as {
      status: string;
      time: string;
      message?: string;
      checks: Record<string, { ok: boolean; detail: string }>;
      stripe?: {
        configured: boolean;
        mode: "test" | "live" | "none";
        detail: string;
      };
      fleet: Record<string, number>;
      proxy: Record<string, number | boolean>;
      metrics: Record<string, unknown>;
    };
  });
}
