import { getStoredToken } from "@/lib/auth-client";

export type StripeWallet = {
  userId: string;
  phone: string;
  displayName: string;
  email?: string | null;
  availableCents: number;
  pendingWithdrawCents: number;
  lifetimeEarnCents: number;
  lifetimeWithdrawnCents: number;
  stripeAccountId: string | null;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  minWithdrawCents: number;
  currency?: string;
  storage?: "supabase" | "local";
  canWithdraw: boolean;
  withdrawals: Array<{
    id: string;
    amountCents: number;
    status: string;
    stripeTransferId?: string;
    error?: string;
    createdAt: string;
  }>;
};

export type StripeConfig = {
  publishableKey: string;
  minWithdrawCents: number;
  mode: string;
  configured: boolean;
  currency?: string;
  supabase?: boolean;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`/api/stripe${path}`, {
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

export function fetchStripeConfig() {
  return json<StripeConfig>("/config");
}

export function fetchWallet() {
  return json<StripeWallet>("/wallet");
}

export function refreshConnectStatus() {
  return json<StripeWallet>("/connect/refresh", { method: "POST", body: "{}" });
}

export function startConnectOnboarding(origin?: string) {
  return json<{ url: string; accountId: string; wallet: StripeWallet }>(
    "/connect/onboard",
    {
      method: "POST",
      body: JSON.stringify({ origin: origin || window.location.origin }),
    },
  );
}

export function openStripeDashboard() {
  return json<{ url: string }>("/connect/dashboard", {
    method: "POST",
    body: "{}",
  });
}

export function requestWithdraw(amountCents: number) {
  return json<{
    ok: boolean;
    code?: string;
    error?: string;
    wallet: StripeWallet;
    withdrawal?: { id: string; amountCents: number; status: string };
  }>("/withdraw", {
    method: "POST",
    body: JSON.stringify({ amountCents }),
  });
}

export function fundPlatformTest(amountCents = 5000) {
  return json<{
    chargeId?: string;
    paymentIntentId?: string;
    status: string;
    available: unknown;
    pending?: unknown;
    note?: string;
  }>("/fund-platform", {
    method: "POST",
    body: JSON.stringify({ amountCents }),
  });
}

export function creditDemoBalance(cents = 1000) {
  return json<StripeWallet>("/credit-demo", {
    method: "POST",
    body: JSON.stringify({ cents }),
  });
}

export function verifyStripe() {
  return json<{
    ok: boolean;
    mode?: string;
    error?: string;
    connectEnabled?: boolean;
    currency?: string;
    supabase?: { ok: boolean; url?: string; error?: string };
  }>("/status");
}

export async function fetchAccountBundle() {
  const token = getStoredToken();
  const res = await fetch("/api/account", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request failed (${res.status})`,
    );
  }
  return data as {
    wallet: StripeWallet;
    ledger: Array<{
      id: string;
      type: string;
      description: string | null;
      amountCents: number;
      balanceAfter: number;
      at: string;
    }>;
    devices: Array<{
      id: string;
      name: string;
      platform: string | null;
      status: string;
      wifiOnly: boolean;
      lastSeen: string | null;
      network: string | null;
      trustScore: number;
    }>;
    supabase: { ok: boolean; url?: string };
  };
}

export async function fetchSupabaseHealth() {
  const res = await fetch("/api/supabase/health");
  return res.json();
}
