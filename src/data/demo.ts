/** Demo dataset shared by mobile mock, user dashboard — aligned with official PRICING */

import { PRICING } from "./pricing";

export const DEMO_USER = {
  id: "u_demo",
  phone: "+373 60 123 456",
  displayName: "Alex M.",
  email: null as string | null,
  country: "MD",
  countryName: "Moldova",
  memberSince: "2026-07-01",
  availableCents: 1420,
  pendingWithdrawCents: 0,
  lifetimeEarnCents: 6830,
  lifetimeWithdrawnCents: 4000,
  todayEarnCents: 84,
  weekEarnCents: 412,
  todayBytes: 2.1 * 1024 ** 3,
  weekBytes: 11.4 * 1024 ** 3,
  minWithdrawCents: PRICING.minWithdrawCents,
  rateCentsPerGb: PRICING.wifiCentsPerGb,
  mobileRateCentsPerGb: PRICING.mobileCentsPerGb,
  sharing: true,
  wifiOnly: false,
  network: "cellular" as "wifi" | "cellular",
  payoutReady: false,
};

export const DEMO_LEDGER = [
  {
    id: "1",
    type: "traffic_earn" as const,
    description: "Bandwidth shared · Wi‑Fi",
    amountCents: 12,
    at: "2026-07-29T22:10:00Z",
    gb: 0.6,
  },
  {
    id: "2",
    type: "traffic_earn" as const,
    description: "Bandwidth shared · Wi‑Fi",
    amountCents: 28,
    at: "2026-07-29T18:00:00Z",
    gb: 1.4,
  },
  {
    id: "3",
    type: "traffic_earn" as const,
    description: "Bandwidth shared · mobile",
    amountCents: 24,
    at: "2026-07-29T12:00:00Z",
    gb: 2.0,
  },
  {
    id: "4",
    type: "withdrawal" as const,
    description: "Withdrawal · Stripe",
    amountCents: -2000,
    at: "2026-07-20T09:00:00Z",
    gb: 0,
  },
  {
    id: "5",
    type: "bonus" as const,
    description: "Welcome bonus",
    amountCents: PRICING.welcomeBonusCents,
    at: "2026-07-01T10:00:00Z",
    gb: 0,
  },
];

export const DEMO_HISTORY = [
  { day: "2026-07-29", bytes: 2.1 * 1024 ** 3, earnCents: 84 },
  { day: "2026-07-28", bytes: 1.8 * 1024 ** 3, earnCents: 72 },
  { day: "2026-07-27", bytes: 2.4 * 1024 ** 3, earnCents: 96 },
  { day: "2026-07-26", bytes: 1.2 * 1024 ** 3, earnCents: 48 },
  { day: "2026-07-25", bytes: 1.6 * 1024 ** 3, earnCents: 64 },
  { day: "2026-07-24", bytes: 0.9 * 1024 ** 3, earnCents: 36 },
  { day: "2026-07-23", bytes: 1.4 * 1024 ** 3, earnCents: 56 },
];

export const DEMO_DEVICES = [
  {
    id: "d1",
    name: "Pixel 8",
    status: "sharing" as const,
    lastSeen: "Just now",
    platform: "android",
    todayGb: 1.2,
  },
  {
    id: "d2",
    name: "Old phone (home Wi‑Fi)",
    status: "online" as const,
    lastSeen: "2h ago",
    platform: "android",
    todayGb: 0.4,
  },
];

/** Portal / admin demo KPIs */
export const ADMIN_KPIS = [
  { label: "Active earners", value: "1,284", delta: "+42 today", tone: "success" as const },
  { label: "Sharing now", value: "612", delta: "47% online", tone: "primary" as const },
  { label: "Traffic 24h", value: "18.4 TB", delta: "Wi‑Fi 81%", tone: "neutral" as const },
  { label: "Earn cost 24h", value: "$3,680", delta: "@ $0.20 Wi‑Fi", tone: "warning" as const },
  { label: "Pending withdraw", value: "$12.4k", delta: "38 requests", tone: "warning" as const },
  { label: "Paid out 7d", value: "$48.2k", delta: "Stripe", tone: "success" as const },
];

export const ADMIN_USERS = [
  {
    phone: "+15550100001",
    name: "Play Reviewer A",
    country: "US",
    devices: 1,
    status: "active" as const,
    balance: 0,
    lifetime: 0,
  },
  {
    phone: "+15550100002",
    name: "Play Reviewer B",
    country: "US",
    devices: 2,
    status: "active" as const,
    balance: 1420,
    lifetime: 6830,
  },
  {
    phone: "+40 721 000 112",
    name: "Mihai R.",
    country: "RO",
    devices: 1,
    status: "active" as const,
    balance: 2210,
    lifetime: 9100,
  },
  {
    phone: "+49 151 000000",
    name: "Lena K.",
    country: "DE",
    devices: 3,
    status: "suspended" as const,
    balance: 800,
    lifetime: 4200,
  },
];

export const ADMIN_WITHDRAWALS = [
  {
    id: "w1",
    phone: "+373 60 123 456",
    amount: 2000,
    status: "paid" as const,
    at: "2026-07-20",
  },
  {
    id: "w2",
    phone: "+40 721 000 112",
    amount: 2500,
    status: "pending" as const,
    at: "2026-07-29",
  },
  {
    id: "w3",
    phone: "+49 151 000000",
    amount: 2000,
    status: "review" as const,
    at: "2026-07-28",
  },
];
