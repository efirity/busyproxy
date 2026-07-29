/**
 * BusyProxy official earner pay schedule (launch).
 * Single source of truth for marketing UI + product copy.
 *
 * Economics (why these numbers):
 * - Typical bandwidth apps pay ~$0.08–$0.12/GB. We lead with $0.20 Wi‑Fi.
 * - Mobile is priced lower so users don’t burn paid data plans by accident.
 * - Proxy resale margin still works if we sell capacity at ~$1.50–$4/GB B2B.
 * - $20 min withdraw keeps Stripe costs sane while matching common market UX.
 */

export const PRICING = {
  brand: "BusyProxy",
  currency: "USD",
  /** Wi‑Fi / unlimited fixed broadband — headline rate */
  wifiCentsPerGb: 20,
  /** Cellular / mobile data */
  mobileCentsPerGb: 12,
  /** Minimum cash-out */
  minWithdrawCents: 2000,
  /** One-time after first successful OTP + first share day */
  welcomeBonusCents: 50,
  /** Referral: % of referee earnings for first 30 days */
  referralPercent: 10,
  referralWindowDays: 30,
  /** Soft daily guide (not a hard cap) for “happy path” marketing */
  typicalWifiGbPerDay: 8,
  typicalMobileGbPerDay: 2,
  /** Copy */
  headlineRateLabel: "$0.20 / GB",
  mobileRateLabel: "$0.12 / GB",
  tagline: "Up to $0.20 per GB on Wi‑Fi — among the highest clear rates in the category.",
} as const;

export function moneyFromCents(cents: number): string {
  const neg = cents < 0;
  const n = Math.abs(cents);
  const s = `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;
  return neg ? `−${s}` : s;
}

export function earnCentsForGb(gb: number, network: "wifi" | "mobile"): number {
  const rate =
    network === "wifi" ? PRICING.wifiCentsPerGb : PRICING.mobileCentsPerGb;
  return Math.round(gb * rate);
}

/** Marketing estimates (not guarantees). */
export function estimateMonthlyCents(opts: {
  wifiGbPerDay: number;
  mobileGbPerDay: number;
  days?: number;
}): number {
  const days = opts.days ?? 30;
  return (
    earnCentsForGb(opts.wifiGbPerDay, "wifi") * days +
    earnCentsForGb(opts.mobileGbPerDay, "mobile") * days
  );
}

export const PRICING_FAQ = [
  {
    q: "How much do I earn per GB?",
    a: `On Wi‑Fi you earn ${moneyFromCents(PRICING.wifiCentsPerGb)} per GB shared. On mobile data you earn ${moneyFromCents(PRICING.mobileCentsPerGb)} per GB — lower so your paid mobile plan stays protected.`,
  },
  {
    q: "Why is mobile paid less than Wi‑Fi?",
    a: "Mobile data is expensive for you. We pay a fair rate for mobile IPs but encourage Wi‑Fi as the default so earnings feel “free” spare capacity — not something that burns your plan.",
  },
  {
    q: "When can I withdraw?",
    a: `When your available balance reaches ${moneyFromCents(PRICING.minWithdrawCents)}, you can cash out with Stripe to your bank or supported payout method.`,
  },
  {
    q: "Are rates guaranteed forever?",
    a: "Launch rates are fixed as published here. We may add regional bonuses when demand is high; we won’t silently cut your base rate without notice in the app.",
  },
  {
    q: "What can I do to earn more?",
    a: "Keep sharing on overnight Wi‑Fi, leave the app running, and invite friends — you earn a referral bonus on their first month of earnings.",
  },
] as const;

export const WHY_USERS_HAPPY = [
  {
    t: "Clear pay, no mystery credits",
    d: "Real $ per GB on Wi‑Fi and mobile — not opaque “points.”",
  },
  {
    t: "You control the switch",
    d: "Share only when you want. Wi‑Fi-only mode. One-tap stop.",
  },
  {
    t: "Phone login, Stripe cash-out",
    d: "OTP verified account. Withdraw from $20 with Stripe Connect.",
  },
] as const;

export const WHY_WE_HAPPY = [
  {
    t: "Healthy resale margin",
    d: "Paying $0.12–$0.20/GB while selling residential capacity B2B leaves room for infra, support, and growth.",
  },
  {
    t: "Wi‑Fi-first fleet quality",
    d: "Better session stability and happier users → more retained devices online.",
  },
  {
    t: "Conversion at $20",
    d: "Min withdraw covers payout ops cost and filters serious earners.",
  },
] as const;
