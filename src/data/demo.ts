/** Demo dataset shared by mobile mock, user dashboard, and admin */

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
  minWithdrawCents: 2000,
  rateCentsPerGb: 20,
  sharing: true,
  /** false = share on Wi‑Fi and mobile data */
  wifiOnly: false,
  network: "cellular" as "wifi" | "cellular",
  payoutReady: false,
};

export const DEMO_LEDGER = [
  {
    id: "1",
    type: "traffic_earn" as const,
    description: "Bandwidth shared",
    amountCents: 12,
    at: "2026-07-29T22:10:00Z",
    gb: 0.4,
  },
  {
    id: "2",
    type: "traffic_earn" as const,
    description: "Bandwidth shared",
    amountCents: 28,
    at: "2026-07-29T18:00:00Z",
    gb: 0.9,
  },
  {
    id: "3",
    type: "traffic_earn" as const,
    description: "Bandwidth shared",
    amountCents: 44,
    at: "2026-07-29T12:00:00Z",
    gb: 1.4,
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
    amountCents: 50,
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
    platform: "android",
    status: "sharing" as const,
    lastSeen: "Just now",
    todayGb: 1.4,
  },
  {
    id: "d2",
    name: "Old Samsung",
    platform: "android",
    status: "offline" as const,
    lastSeen: "2 days ago",
    todayGb: 0,
  },
];

export const ADMIN_KPIS = [
  { label: "Sharing now", value: "1,284", delta: "+6%" },
  { label: "GB (24h)", value: "18.4k", delta: "+12%" },
  { label: "Wallet liability", value: "$42,180", delta: "" },
  { label: "Pending payouts", value: "$3,260", delta: "18 req" },
  { label: "New users (24h)", value: "312", delta: "+4%" },
  { label: "Open risk flags", value: "7", delta: "2 high" },
];

export const ADMIN_USERS = [
  {
    phone: "+37360123456",
    name: "Alex M.",
    country: "MD",
    balance: 1420,
    lifetime: 6830,
    devices: 2,
    status: "active",
  },
  {
    phone: "+40722111222",
    name: "Ioana P.",
    country: "RO",
    balance: 2210,
    lifetime: 15400,
    devices: 1,
    status: "active",
  },
  {
    phone: "+491511234567",
    name: "Mark S.",
    country: "DE",
    balance: 890,
    lifetime: 3200,
    devices: 3,
    status: "active",
  },
  {
    phone: "+905321112233",
    name: "—",
    country: "TR",
    balance: 4500,
    lifetime: 9200,
    devices: 4,
    status: "suspended",
  },
  {
    phone: "+33612345678",
    name: "Camille R.",
    country: "FR",
    balance: 2050,
    lifetime: 11000,
    devices: 1,
    status: "active",
  },
];

export const ADMIN_WITHDRAWALS = [
  { id: "w1", phone: "+40722111222", amount: 2500, status: "pending", at: "2h ago" },
  { id: "w2", phone: "+33612345678", amount: 2000, status: "pending", at: "5h ago" },
  { id: "w3", phone: "+37360123456", amount: 2000, status: "paid", at: "Jul 20" },
  { id: "w4", phone: "+491511234567", amount: 3000, status: "processing", at: "1d ago" },
];
