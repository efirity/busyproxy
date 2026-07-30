//#region node_modules/.nitro/vite/services/ssr/assets/demo-BRmbEJzo.js
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
var PRICING = {
	brand: "BusyProxy",
	currency: "USD",
	/** Wi‑Fi / unlimited fixed broadband — headline rate */
	wifiCentsPerGb: 20,
	/** Cellular / mobile data */
	mobileCentsPerGb: 12,
	/** Minimum cash-out */
	minWithdrawCents: 2e3,
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
	tagline: "Up to $0.20 per GB on Wi‑Fi — among the highest clear rates in the category."
};
function moneyFromCents(cents) {
	const neg = cents < 0;
	const n = Math.abs(cents);
	const s = `$${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;
	return neg ? `−${s}` : s;
}
function earnCentsForGb(gb, network) {
	const rate = network === "wifi" ? PRICING.wifiCentsPerGb : PRICING.mobileCentsPerGb;
	return Math.round(gb * rate);
}
/** Marketing estimates (not guarantees). */
function estimateMonthlyCents(opts) {
	const days = opts.days ?? 30;
	return earnCentsForGb(opts.wifiGbPerDay, "wifi") * days + earnCentsForGb(opts.mobileGbPerDay, "mobile") * days;
}
var PRICING_FAQ = [
	{
		q: "How much do I earn per GB?",
		a: `On Wi‑Fi you earn ${moneyFromCents(PRICING.wifiCentsPerGb)} per GB shared. On mobile data you earn ${moneyFromCents(PRICING.mobileCentsPerGb)} per GB — lower so your paid mobile plan stays protected.`
	},
	{
		q: "Why is mobile paid less than Wi‑Fi?",
		a: "Mobile data is expensive for you. We pay a fair rate for mobile IPs but encourage Wi‑Fi as the default so earnings feel “free” spare capacity — not something that burns your plan."
	},
	{
		q: "When can I withdraw?",
		a: `When your available balance reaches ${moneyFromCents(PRICING.minWithdrawCents)}, you can cash out with Stripe to your bank or supported payout method.`
	},
	{
		q: "Are rates guaranteed forever?",
		a: "Launch rates are fixed as published here. We may add regional bonuses when demand is high; we won’t silently cut your base rate without notice in the app."
	},
	{
		q: "What can I do to earn more?",
		a: "Keep sharing on overnight Wi‑Fi, leave the app running, and invite friends — you earn a referral bonus on their first month of earnings."
	}
];
var WHY_USERS_HAPPY = [
	{
		t: "Clear pay, no mystery credits",
		d: "Real $ per GB on Wi‑Fi and mobile — not opaque “points.”"
	},
	{
		t: "You control the switch",
		d: "Share only when you want. Wi‑Fi-only mode. One-tap stop."
	},
	{
		t: "Phone login, Stripe cash-out",
		d: "OTP verified account. Withdraw from $20 with Stripe Connect."
	}
];
/** Demo dataset shared by mobile mock, user dashboard — aligned with official PRICING */
var DEMO_USER = {
	id: "u_demo",
	phone: "+373 60 123 456",
	displayName: "Alex M.",
	email: null,
	country: "MD",
	countryName: "Moldova",
	memberSince: "2026-07-01",
	availableCents: 1420,
	pendingWithdrawCents: 0,
	lifetimeEarnCents: 6830,
	lifetimeWithdrawnCents: 4e3,
	todayEarnCents: 84,
	weekEarnCents: 412,
	todayBytes: 2.1 * 1024 ** 3,
	weekBytes: 11.4 * 1024 ** 3,
	minWithdrawCents: PRICING.minWithdrawCents,
	rateCentsPerGb: PRICING.wifiCentsPerGb,
	mobileRateCentsPerGb: PRICING.mobileCentsPerGb,
	sharing: true,
	wifiOnly: false,
	network: "cellular",
	payoutReady: false
};
var DEMO_LEDGER = [
	{
		id: "1",
		type: "traffic_earn",
		description: "Bandwidth shared · Wi‑Fi",
		amountCents: 12,
		at: "2026-07-29T22:10:00Z",
		gb: .6
	},
	{
		id: "2",
		type: "traffic_earn",
		description: "Bandwidth shared · Wi‑Fi",
		amountCents: 28,
		at: "2026-07-29T18:00:00Z",
		gb: 1.4
	},
	{
		id: "3",
		type: "traffic_earn",
		description: "Bandwidth shared · mobile",
		amountCents: 24,
		at: "2026-07-29T12:00:00Z",
		gb: 2
	},
	{
		id: "4",
		type: "withdrawal",
		description: "Withdrawal · Stripe",
		amountCents: -2e3,
		at: "2026-07-20T09:00:00Z",
		gb: 0
	},
	{
		id: "5",
		type: "bonus",
		description: "Welcome bonus",
		amountCents: PRICING.welcomeBonusCents,
		at: "2026-07-01T10:00:00Z",
		gb: 0
	}
];
var DEMO_HISTORY = [
	{
		day: "2026-07-29",
		bytes: 2.1 * 1024 ** 3,
		earnCents: 84
	},
	{
		day: "2026-07-28",
		bytes: 1.8 * 1024 ** 3,
		earnCents: 72
	},
	{
		day: "2026-07-27",
		bytes: 2.4 * 1024 ** 3,
		earnCents: 96
	},
	{
		day: "2026-07-26",
		bytes: 1.2 * 1024 ** 3,
		earnCents: 48
	},
	{
		day: "2026-07-25",
		bytes: 1.6 * 1024 ** 3,
		earnCents: 64
	},
	{
		day: "2026-07-24",
		bytes: .9 * 1024 ** 3,
		earnCents: 36
	},
	{
		day: "2026-07-23",
		bytes: 1.4 * 1024 ** 3,
		earnCents: 56
	}
];
var DEMO_DEVICES = [{
	id: "d1",
	name: "Pixel 8",
	status: "sharing",
	lastSeen: "Just now",
	platform: "android",
	todayGb: 1.2
}, {
	id: "d2",
	name: "Old phone (home Wi‑Fi)",
	status: "online",
	lastSeen: "2h ago",
	platform: "android",
	todayGb: .4
}];
/** Portal / admin demo KPIs */
var ADMIN_KPIS = [
	{
		label: "Active earners",
		value: "1,284",
		delta: "+42 today",
		tone: "success"
	},
	{
		label: "Sharing now",
		value: "612",
		delta: "47% online",
		tone: "primary"
	},
	{
		label: "Traffic 24h",
		value: "18.4 TB",
		delta: "Wi‑Fi 81%",
		tone: "neutral"
	},
	{
		label: "Earn cost 24h",
		value: "$3,680",
		delta: "@ $0.20 Wi‑Fi",
		tone: "warning"
	},
	{
		label: "Pending withdraw",
		value: "$12.4k",
		delta: "38 requests",
		tone: "warning"
	},
	{
		label: "Paid out 7d",
		value: "$48.2k",
		delta: "Stripe",
		tone: "success"
	}
];
var ADMIN_USERS = [
	{
		phone: "+37368182830",
		name: "Earner",
		country: "MD",
		devices: 1,
		status: "active",
		balance: 0,
		lifetime: 0
	},
	{
		phone: "+373 60 123 456",
		name: "Alex M.",
		country: "MD",
		devices: 2,
		status: "active",
		balance: 1420,
		lifetime: 6830
	},
	{
		phone: "+40 721 000 112",
		name: "Mihai R.",
		country: "RO",
		devices: 1,
		status: "active",
		balance: 2210,
		lifetime: 9100
	},
	{
		phone: "+49 151 000000",
		name: "Lena K.",
		country: "DE",
		devices: 3,
		status: "suspended",
		balance: 800,
		lifetime: 4200
	}
];
var ADMIN_WITHDRAWALS = [
	{
		id: "w1",
		phone: "+373 60 123 456",
		amount: 2e3,
		status: "paid",
		at: "2026-07-20"
	},
	{
		id: "w2",
		phone: "+40 721 000 112",
		amount: 2500,
		status: "pending",
		at: "2026-07-29"
	},
	{
		id: "w3",
		phone: "+49 151 000000",
		amount: 2e3,
		status: "review",
		at: "2026-07-28"
	}
];
//#endregion
export { DEMO_HISTORY as a, PRICING as c, estimateMonthlyCents as d, moneyFromCents as f, DEMO_DEVICES as i, PRICING_FAQ as l, ADMIN_USERS as n, DEMO_LEDGER as o, ADMIN_WITHDRAWALS as r, DEMO_USER as s, ADMIN_KPIS as t, WHY_USERS_HAPPY as u };
