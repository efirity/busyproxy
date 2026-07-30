import { getStoredToken } from "@/lib/auth-client";

export type PayoutMethod = {
  id: string;
  type: "card" | "bank_account" | string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  funding?: string;
  bankName?: string;
  currency?: string;
  default?: boolean;
};

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
  cardLinked?: boolean;
  payoutMethodLinked?: boolean;
  payoutMethods?: PayoutMethod[];
  pendingVerification?: boolean;
  requirementsDisabled?: string | null;
  minWithdrawCents: number;
  currency?: string;
  storage?: "supabase" | "local";
  canWithdraw: boolean;
  canWithdrawStripe?: boolean;
  sandboxPayouts?: boolean;
  payoutMode?: string;
  withdrawals: Array<{
    id: string;
    amountCents: number;
    status: string;
    method?: string;
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
  payoutMode?: string;
  message?: string;
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

export function requestWithdraw(
  amountCents: number,
  opts?: {
    method?: string;
    paypalEmail?: string;
    bankNote?: string;
  },
) {
  return json<{
    ok: boolean;
    code?: string;
    error?: string;
    method?: string;
    message?: string;
    wallet: StripeWallet;
    withdrawal?: {
      id: string;
      amountCents: number;
      status: string;
      method?: string;
      destination?: { type?: string; brand?: string; last4?: string };
    };
  }>("/withdraw", {
    method: "POST",
    body: JSON.stringify({ amountCents, method: "stripe", ...opts }),
  });
}

export function savePayoutPreference(body: {
  paypalEmail?: string;
  email?: string;
}) {
  return json<{ ok: boolean; wallet: StripeWallet }>("/payout-preference", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fundPlatformTest(amountCents = 10000) {
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
    connectSetupUrl?: string;
    currency?: string;
    payoutMode?: string;
    note?: string;
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
  };
}

export async function fetchSupabaseHealth() {
  const res = await fetch("/api/supabase/health");
  return res.json();
}


/** Fetch payout receipt JSON */
export async function fetchPayoutReceipt(withdrawalId: string) {
  return json<Record<string, unknown>>(
    `/receipts/${encodeURIComponent(withdrawalId)}`,
  );
}

/** Open printable HTML receipt (Save as PDF via browser print). */
export async function openPayoutReceipt(withdrawalId: string) {
  const token = getStoredToken();
  const res = await fetch(
    `/api/stripe/receipts/${encodeURIComponent(withdrawalId)}.html`,
    {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      credentials: "include",
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || `Receipt failed (${res.status})`,
    );
  }
  const html = await res.text();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `BusyProxy-receipt-${withdrawalId.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
