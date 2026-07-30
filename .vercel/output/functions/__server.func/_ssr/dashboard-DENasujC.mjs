import { i as __toESM } from "../_runtime.mjs";
import { F as require_jsx_runtime, P as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Money, c as cn, n as Button, o as SectionLabel, r as Card, s as StatusDot, t as Badge } from "./primitives-DhCi6SOs.mjs";
import { C as ExternalLink, M as ArrowDownToLine, _ as LoaderCircle, d as RefreshCw, r as Wallet, s as Smartphone, w as CreditCard, x as History, y as LayoutDashboard } from "../_libs/lucide-react.mjs";
import { o as getStoredUser, r as fetchSession, s as logout, t as MarketingShell } from "./shell-CXFbm1r0.mjs";
import { a as shortDate, i as money, n as fetchAccountBundle, o as useStripeWallet, r as gb, t as OtpLogin } from "./format-BaMZjTgJ.mjs";
import { a as DEMO_HISTORY, i as DEMO_DEVICES, s as DEMO_USER } from "./demo-BRmbEJzo.mjs";
import { a as ResponsiveContainer, i as Area, n as YAxis, o as Tooltip, r as XAxis, t as AreaChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-DENasujC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Stripe-only wallet: link debit card via Connect Express, Instant Payout cash-out.
*/
function StripeWalletPanel({ compact = false, className }) {
	const { wallet, config, loading, busy, message, error, connectStripe, openDashboard, withdraw, fundPlatform, addDemoFunds, refresh } = useStripeWallet();
	if (loading || !wallet) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: cn("flex items-center gap-2 p-5 text-sm text-fg-muted", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), "Loading wallet…"]
	});
	const progress = Math.min(1, wallet.availableCents / Math.max(1, wallet.minWithdrawCents));
	const need = Math.max(0, wallet.minWithdrawCents - wallet.availableCents);
	const linked = Boolean(wallet.stripeAccountId);
	const ready = Boolean(wallet.payoutsEnabled);
	const canCashOut = wallet.availableCents >= wallet.minWithdrawCents && ready;
	const primaryCard = (wallet.payoutMethods || []).filter((m) => m.type === "card")[0];
	const testMode = config?.mode === "test";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("space-y-3", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Your wallet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-fg-muted",
							children: ["Cash out to your debit card · min $", (wallet.minWithdrawCents / 100).toFixed(0)]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: ready ? "success" : linked ? "warning" : "neutral",
							children: ready ? "Card linked" : linked ? "Finish card setup" : "No card yet"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-xs text-fg-muted",
						children: "Available balance"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
						cents: wallet.availableCents,
						size: "xl",
						className: "mt-1 block"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full rounded-full bg-primary transition-all",
							style: { width: `${progress * 100}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[11px] text-fg-subtle",
						children: need > 0 ? `$${(need / 100).toFixed(2)} more to reach $${(wallet.minWithdrawCents / 100).toFixed(0)} minimum` : ready ? "Minimum reached — you can cash out instantly" : "Minimum reached — link a debit card to cash out"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 rounded-xl border border-border bg-bg px-3.5 py-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "h-5 w-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "min-w-0 flex-1",
								children: primaryCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm font-medium capitalize",
									children: [
										primaryCard.brand || "Card",
										" · •••• ",
										primaryCard.last4
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[11px] text-fg-muted",
									children: [primaryCard.funding === "debit" ? "Debit · instant payouts" : primaryCard.funding ? `${primaryCard.funding} card` : "Linked for payouts", primaryCard.expMonth ? ` · exp ${primaryCard.expMonth}/${primaryCard.expYear}` : ""]
								})] }) : ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: "Payout method ready"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-fg-muted",
									children: "Managed securely by Stripe"
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: "No debit card linked"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-fg-muted",
									children: "You’ll add it in a secure Stripe screen — we never see the full card number"
								})] })
							})]
						})
					}),
					wallet.pendingWithdrawCents > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-warning",
						children: [
							"Pending:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono",
								children: ["$", (wallet.pendingWithdrawCents / 100).toFixed(2)]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [!ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => void connectStripe(),
							disabled: busy,
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "h-4 w-4" }), linked ? "Finish linking card" : "Link debit card"]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: () => void withdraw(wallet.availableCents),
							disabled: busy || !canCashOut,
							children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownToLine, { className: "h-4 w-4" }), canCashOut ? `Cash out $${(wallet.availableCents / 100).toFixed(2)}` : `Need $${(wallet.minWithdrawCents / 100).toFixed(0)} min`]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							onClick: () => void openDashboard(),
							disabled: busy,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-4 w-4" }), "Manage card"]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => void refresh(),
							disabled: busy,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" }), "Refresh"]
						})]
					}),
					(message || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed", error ? "border-danger/40 bg-danger-soft/40 text-danger" : "border-border bg-bg text-fg-muted"),
						children: [userFacingError(error) || message, error?.toLowerCase().includes("connect") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2",
							children: [
								"Platform setup (one time):",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: testMode ? "https://dashboard.stripe.com/test/connect" : "https://dashboard.stripe.com/connect",
									target: "_blank",
									rel: "noreferrer",
									className: "font-medium underline",
									children: "Enable Stripe Connect →"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-[11px] text-fg-subtle",
						children: ["Account · ", wallet.phone]
					})
				]
			}),
			!compact && testMode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Test helpers" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-fg-muted",
						children: "Add demo earnings or fund the platform float so Instant Payouts can run in test mode."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "secondary",
							disabled: busy,
							onClick: () => void addDemoFunds(1e3),
							children: "+ $10 earnings"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "secondary",
							disabled: busy,
							onClick: () => void fundPlatform(),
							children: "Fund payout balance"
						})]
					})
				]
			}),
			!compact && wallet.withdrawals?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "overflow-hidden p-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-b border-border px-4 py-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Withdrawal history" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-border",
					children: wallet.withdrawals.slice(0, 8).map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center justify-between gap-3 px-4 py-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-fg-muted",
							children: ["Instant card · ", new Date(w.createdAt).toLocaleString()]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
								cents: -Math.abs(w.amountCents),
								size: "sm"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-0.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									tone: w.status === "paid" ? "success" : w.status === "failed" ? "danger" : "warning",
									children: w.status.replaceAll("_", " ")
								})
							})]
						})]
					}, w.id))
				})]
			})
		]
	});
}
function userFacingError(error) {
	if (!error) return null;
	const lower = error.toLowerCase();
	if (lower.includes("connect") || lower.includes("signed up")) return "Card payouts need Stripe Connect enabled once on the company account. Use the link below, then try “Link debit card” again.";
	if (lower.includes("platform") && lower.includes("balance")) return error;
	return error;
}
var nav = [
	{
		id: "overview",
		label: "Overview",
		icon: LayoutDashboard
	},
	{
		id: "history",
		label: "History",
		icon: History
	},
	{
		id: "wallet",
		label: "Wallet",
		icon: Wallet
	},
	{
		id: "devices",
		label: "Devices",
		icon: Smartphone
	}
];
function UserDashboard() {
	const [authReady, setAuthReady] = (0, import_react.useState)(false);
	const [user, setUser] = (0, import_react.useState)(null);
	const { wallet, loading, reload } = useStripeWallet();
	const [section, setSection] = (0, import_react.useState)("overview");
	const [ledger, setLedger] = (0, import_react.useState)([]);
	const [devices, setDevices] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		fetchSession().then((s) => {
			setUser(s?.user || getStoredUser());
			setAuthReady(true);
		});
	}, []);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		reload();
	}, [user?.id]);
	(0, import_react.useEffect)(() => {
		if (new URLSearchParams(window.location.search).get("stripe")) setSection("wallet");
	}, []);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		fetchAccountBundle().then((b) => {
			setLedger(b.ledger || []);
			setDevices(b.devices || []);
		}).catch(() => {});
	}, [user?.id, wallet?.availableCents]);
	if (!authReady) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-[50vh] items-center justify-center text-sm text-fg-muted",
		children: "Loading…"
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl px-4 py-12 sm:px-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-8 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "User dashboard" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-3xl font-semibold tracking-tight",
					children: "Sign in with phone"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mt-2 max-w-md text-sm text-fg-muted",
					children: "Twilio OTP — same account as the mobile app."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OtpLogin, {
			variant: "web",
			defaultPhone: "+37368182830",
			onSuccess: (u) => setUser(u)
		})]
	});
	const chartData = [...DEMO_HISTORY].reverse().map((d) => ({
		day: shortDate(d.day),
		earn: d.earnCents / 100,
		gb: d.bytes / 1024 ** 3
	}));
	const available = wallet?.availableCents ?? 0;
	const lifetime = wallet?.lifetimeEarnCents ?? 0;
	const displayName = user.displayName || wallet?.displayName || "Earner";
	const now = Date.now();
	const dayMs = 864e5;
	const todayEarn = ledger.filter((e) => e.amountCents > 0 && now - new Date(e.at).getTime() < dayMs && e.type !== "withdrawal").reduce((s, e) => s + e.amountCents, 0);
	const weekEarn = ledger.filter((e) => e.amountCents > 0 && now - new Date(e.at).getTime() < 7 * dayMs && e.type !== "withdrawal").reduce((s, e) => s + e.amountCents, 0);
	const deviceList = devices.length > 0 ? devices.map((d) => ({
		id: d.id,
		name: d.name,
		status: d.status,
		lastSeen: d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "—",
		platform: d.platform || "android"
	})) : DEMO_DEVICES.map((d) => ({
		id: d.id,
		name: d.name,
		status: d.status,
		lastSeen: d.lastSeen,
		platform: d.platform
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl gap-0 md:gap-6 md:px-6 md:py-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden w-56 shrink-0 flex-col border-r border-border p-4 md:flex md:rounded-2xl md:border md:bg-surface",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-wider text-fg-subtle",
					children: "Account"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-semibold",
					children: displayName
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-fg-muted",
					children: user.phone
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: "success",
					className: "mt-2 w-fit",
					children: "OTP session"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "mt-6 space-y-1",
					children: nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSection(n.id),
						className: cn("flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm", section === n.id ? "bg-primary/10 text-fg" : "text-fg-muted hover:text-fg"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(n.icon, { className: "h-4 w-4" }), n.label]
					}, n.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-auto space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border border-border bg-bg p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-fg-muted",
							children: "Available"
						}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-fg-subtle",
							children: "…"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
							cents: available,
							size: "md",
							className: "mt-1 block"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						size: "sm",
						className: "w-full",
						onClick: async () => {
							await logout();
							setUser(null);
						},
						children: "Log out"
					})]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "min-w-0 flex-1 space-y-4 p-4 md:p-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 md:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: displayName
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-fg-muted",
						children: user.phone
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						onClick: async () => {
							await logout();
							setUser(null);
						},
						children: "Log out"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1 overflow-x-auto md:hidden",
					children: nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setSection(n.id),
						className: cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", section === n.id ? "bg-surface text-fg" : "text-fg-muted"),
						children: n.label
					}, n.id))
				}),
				section === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-semibold tracking-tight",
						children: "Overview"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-fg-muted",
						children: ["Live wallet for ", user.phone]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
								label: "Available",
								cents: available
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
								label: "Today",
								cents: todayEarn || DEMO_USER.todayEarnCents,
								sub: todayEarn ? "From ledger" : gb(DEMO_USER.todayBytes)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
								label: "This week",
								cents: weekEarn || DEMO_USER.weekEarnCents,
								sub: weekEarn ? "From ledger" : gb(DEMO_USER.weekBytes)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
								label: "Lifetime",
								cents: lifetime
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StripeWalletPanel, { compact: true }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Earnings (7 days)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs text-fg-muted",
								children: [
									"Rate ",
									money(DEMO_USER.rateCentsPerGb),
									"/GB"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 h-56 w-full",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
									data: chartData,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
											id: "earnFill",
											x1: "0",
											y1: "0",
											x2: "0",
											y2: "1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "0%",
												stopColor: "#3b82f6",
												stopOpacity: .35
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
												offset: "100%",
												stopColor: "#3b82f6",
												stopOpacity: 0
											})]
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "day",
											tick: {
												fill: "#5c6a82",
												fontSize: 11
											},
											axisLine: false,
											tickLine: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											tick: {
												fill: "#5c6a82",
												fontSize: 11
											},
											axisLine: false,
											tickLine: false,
											width: 36,
											tickFormatter: (v) => `$${v}`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
											background: "#141a24",
											border: "1px solid #273244",
											borderRadius: 12,
											fontSize: 12
										} }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
											type: "monotone",
											dataKey: "earn",
											stroke: "#3b82f6",
											fill: "url(#earnFill)",
											strokeWidth: 2
										})
									]
								})
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Devices" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 space-y-2",
							children: deviceList.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status: d.status }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-medium",
										children: d.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[11px] text-fg-subtle",
										children: [
											d.status,
											" · ",
											d.lastSeen
										]
									})] })]
								})
							}, d.id))
						})]
					})
				] }),
				section === "wallet" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold tracking-tight",
					children: "Wallet"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-fg-muted",
					children: "Your earnings and cash-out"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StripeWalletPanel, {})] }),
				section === "history" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold tracking-tight",
					children: "History"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-fg-muted",
					children: ledger.length ? "Recent earnings activity" : "No earnings history yet — share to start earning"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "overflow-hidden p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[480px] text-left text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "text-xs text-fg-subtle",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-border",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-5 py-2.5 font-medium",
											children: "When"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-5 py-2.5 font-medium",
											children: "Description"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-5 py-2.5 font-medium",
											children: "Type"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "px-5 py-2.5 font-medium text-right",
											children: "Amount"
										})
									]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [ledger.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-border/70",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-5 py-3 text-fg-muted",
										children: new Date(e.at).toLocaleString()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-5 py-3",
										children: e.description || e.type
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-5 py-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											tone: e.type === "withdrawal" ? "warning" : e.type === "bonus" ? "primary" : "success",
											children: e.type.replace("_", " ")
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-5 py-3 text-right",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
											cents: e.amountCents,
											size: "sm",
											className: e.amountCents >= 0 ? "text-success" : ""
										})
									})
								]
							}, e.id)), !ledger.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 4,
								className: "px-5 py-8 text-center text-sm text-fg-muted",
								children: "No ledger rows yet — use +$10 on Wallet to credit."
							}) })] })]
						})
					})
				})] }),
				section === "devices" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold tracking-tight",
					children: "Devices"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-fg-muted",
					children: "Phones linked to your account"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "p-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2",
						children: deviceList.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status: d.status }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: d.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[11px] text-fg-subtle",
									children: [
										d.platform,
										" · ",
										d.lastSeen
									]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: d.status === "sharing" ? "success" : "neutral",
								children: d.status
							})]
						}, d.id))
					})
				})] })
			]
		})]
	});
}
function Kpi({ label, cents, sub }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-fg-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
				cents,
				size: "md",
				className: "mt-1 block"
			}),
			sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 font-mono text-[11px] text-fg-subtle",
				children: sub
			})
		]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketingShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserDashboard, {}) });
//#endregion
export { SplitComponent as component };
