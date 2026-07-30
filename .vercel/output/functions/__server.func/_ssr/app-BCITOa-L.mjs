import { i as __toESM } from "../_runtime.mjs";
import { F as require_jsx_runtime, P as require_react, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Money, c as cn, n as Button, o as SectionLabel, s as StatusDot, t as Badge } from "./primitives-DhCi6SOs.mjs";
import { D as ChevronLeft, M as ArrowDownToLine, _ as LoaderCircle, a as User, b as House, c as Signal, f as Radio, n as Wifi, r as Wallet, u as Settings, w as CreditCard, x as History } from "../_libs/lucide-react.mjs";
import { o as getStoredUser, r as fetchSession, s as logout, t as MarketingShell } from "./shell-CXFbm1r0.mjs";
import { a as shortDate, i as money, o as useStripeWallet, r as gb, t as OtpLogin } from "./format-BaMZjTgJ.mjs";
import { a as DEMO_HISTORY, o as DEMO_LEDGER, s as DEMO_USER } from "./demo-BRmbEJzo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-BCITOa-L.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Mobile earner wallet — Stripe Instant Payouts only */
function MobileStripeWallet({ showHistory = true }) {
	const { wallet, loading, busy, message, error, connectStripe, withdraw, addDemoFunds, refresh } = useStripeWallet();
	if (loading || !wallet) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-4 text-sm text-fg-muted",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), "Loading wallet…"]
	});
	const progress = Math.min(1, wallet.availableCents / Math.max(1, wallet.minWithdrawCents));
	const need = Math.max(0, wallet.minWithdrawCents - wallet.availableCents);
	const ready = wallet.payoutsEnabled;
	const linked = Boolean(wallet.stripeAccountId);
	const canCashOut = wallet.availableCents >= wallet.minWithdrawCents && ready;
	const card = (wallet.payoutMethods || []).find((m) => m.type === "card");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl border border-border bg-surface p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-fg-muted",
						children: "Available balance"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: ready ? "success" : linked ? "warning" : "neutral",
						children: ready ? "Card linked" : linked ? "Finish setup" : "No card"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
					cents: wallet.availableCents,
					size: "xl",
					className: "mt-1 block"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full rounded-full bg-primary",
						style: { width: `${progress * 100}%` }
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-[11px] text-fg-subtle",
					children: need > 0 ? `${money(need)} more to reach $20` : ready ? "Ready for instant cash-out" : "Link a debit card to cash out"
				}),
				card && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 rounded-xl border border-border bg-bg px-3 py-2 text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "capitalize",
							children: card.brand || "Card"
						}),
						" · ••••",
						" ",
						card.last4
					]
				}),
				!ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "mt-4 w-full",
					disabled: busy,
					onClick: () => void connectStripe(),
					children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "h-4 w-4" }), linked ? "Finish linking card" : "Link debit card"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "mt-4 w-full",
					disabled: busy || !canCashOut,
					onClick: () => void withdraw(),
					children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownToLine, { className: "h-4 w-4" }), canCashOut ? "Cash out instantly" : "Need $20 min"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						className: "flex-1",
						disabled: busy,
						onClick: () => void addDemoFunds(),
						children: "+$10"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "ghost",
						className: "flex-1",
						disabled: busy,
						onClick: () => void refresh(),
						children: "Refresh"
					})]
				}),
				(message || error) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: cn("mt-3 text-[11px] leading-relaxed", error ? "text-danger" : "text-fg-muted"),
					children: error || message
				})
			]
		}), showHistory && wallet.withdrawals.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl border border-border bg-surface",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border-b border-border px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle",
				children: "Withdrawals"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-border",
				children: wallet.withdrawals.slice(0, 5).map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between px-3.5 py-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-fg-muted",
						children: new Date(w.createdAt).toLocaleDateString()
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: w.status === "paid" ? "success" : w.status === "failed" ? "danger" : "warning",
						children: w.status.replaceAll("_", " ")
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
						cents: -Math.abs(w.amountCents),
						size: "sm"
					})]
				}, w.id))
			})]
		})]
	});
}
function networkLabel(sharing, network, wifiOnly) {
	if (!sharing) return "Any network when on";
	if (wifiOnly) return "Wi‑Fi only";
	return network === "wifi" ? "Wi‑Fi · mobile allowed" : "Mobile data · Wi‑Fi allowed";
}
function networkShort(network, wifiOnly) {
	if (wifiOnly) return "Wi‑Fi only";
	return network === "wifi" ? "Wi‑Fi" : "Mobile";
}
function EarnerMobileApp() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [user, setUser] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("home");
	const [screen, setScreen] = (0, import_react.useState)("home");
	const [sharing, setSharing] = (0, import_react.useState)(true);
	const [wifiOnly, setWifiOnly] = (0, import_react.useState)(false);
	const [network, setNetwork] = (0, import_react.useState)("cellular");
	(0, import_react.useEffect)(() => {
		fetchSession().then((s) => {
			setUser(s?.user || getStoredUser());
			setReady(true);
		});
	}, []);
	const goTab = (id) => {
		setTab(id);
		setScreen(id);
	};
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-1 items-center justify-center text-sm text-fg-muted",
		children: "Loading…"
	}) });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OtpLogin, {
		variant: "mobile",
		defaultPhone: "+37368182830",
		onSuccess: (u) => {
			setUser(u);
			setScreen("home");
			setTab("home");
		}
	}) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhoneChrome, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			screen === "account" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountScreen, {
				user,
				onBack: () => setScreen(tab),
				onLogout: async () => {
					await logout();
					setUser(null);
					setScreen("home");
					setTab("home");
				},
				onUser: setUser
			}),
			screen === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeTab, {
				user,
				sharing,
				network,
				wifiOnly,
				onToggleShare: () => setSharing((s) => !s),
				onOpenAccount: () => setScreen("account"),
				onOpenWallet: () => goTab("wallet"),
				onCycleNetwork: () => setNetwork((n) => n === "wifi" ? "cellular" : "wifi")
			}),
			screen === "history" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryTab, {}),
			screen === "wallet" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WalletTab, {}),
			screen === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsTab, {
				user,
				wifiOnly,
				onWifiOnly: setWifiOnly,
				onOpenAccount: () => setScreen("account"),
				onLogout: async () => {
					await logout();
					setUser(null);
				}
			}),
			screen !== "account" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "grid shrink-0 grid-cols-4 border-t border-border bg-bg-elevated/95 px-1 pb-2 pt-1",
				children: [
					[
						"home",
						"Home",
						House
					],
					[
						"history",
						"History",
						History
					],
					[
						"wallet",
						"Wallet",
						Wallet
					],
					[
						"settings",
						"Settings",
						Settings
					]
				].map(([id, label, Icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => goTab(id),
					className: cn("flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium", tab === id ? "text-fg" : "text-fg-subtle"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
						className: cn("h-5 w-5", tab === id && "text-primary"),
						strokeWidth: tab === id ? 2.25 : 1.75
					}), label]
				}, id))
			})
		]
	}) });
}
function PhoneChrome({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-[390px] flex-col overflow-hidden rounded-phone border border-border-strong bg-bg phone-shadow sm:h-[min(780px,calc(100dvh-8rem))]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex shrink-0 items-center justify-between px-5 pt-3 text-[11px] text-fg-muted tabular",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "9:41" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 w-3.5 rounded-sm border border-fg-muted/60" })]
		}), children]
	});
}
function AccountAvatarButton({ user, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		"aria-label": "Account",
		className: "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-fg transition hover:border-border-strong hover:bg-surface-2",
		children: (user.displayName || user.phone || "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4" })
	});
}
function AccountScreen({ user, onBack, onLogout }) {
	const { wallet } = useStripeWallet();
	const name = user.displayName || wallet?.displayName || "Earner";
	const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onBack,
					className: "flex h-10 w-10 items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg",
					"aria-label": "Back",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-lg font-semibold tracking-tight",
					children: "Account"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-col items-center text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-primary/15 text-lg font-semibold text-primary",
						children: initials
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-lg font-semibold",
						children: name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 font-mono text-sm text-fg-muted",
						children: user.phone
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: "success",
							children: "OTP verified"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-0 overflow-hidden rounded-2xl border border-border bg-surface",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "Phone",
						value: user.phone,
						mono: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "Display name",
						value: name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "Email",
						value: user.email || "Not set (optional)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "Password",
						value: "Not set · phone OTP only for now"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "User ID",
						value: user.id,
						mono: true,
						last: true
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 space-y-0 overflow-hidden rounded-2xl border border-border bg-surface",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "Available balance",
						value: money(wallet?.availableCents ?? 0),
						mono: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "Lifetime earned",
						value: money(wallet?.lifetimeEarnCents ?? 0),
						mono: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoRow, {
						label: "Payout method",
						value: wallet?.payoutsEnabled ? "Stripe connected" : wallet?.stripeAccountId ? "Stripe onboarding…" : "Not set up",
						last: true
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-center text-[11px] leading-relaxed text-fg-subtle",
				children: "Login is phone + OTP via Twilio. Email/password fields exist for later."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				className: "mt-4 w-full",
				onClick: onLogout,
				children: "Log out"
			})
		]
	});
}
function InfoRow({ label, value, mono, last }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex items-start justify-between gap-3 px-3.5 py-3", !last && "border-b border-border"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "shrink-0 text-sm text-fg-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("max-w-[60%] break-all text-right text-sm font-medium text-fg", mono && "font-mono text-xs"),
			children: value
		})]
	});
}
function HomeTab({ user, sharing, network, wifiOnly, onToggleShare, onOpenAccount, onOpenWallet, onCycleNetwork }) {
	const { wallet, loading, reload } = useStripeWallet();
	(0, import_react.useEffect)(() => {
		reload();
	}, [user.id]);
	const available = wallet?.availableCents ?? 0;
	const minW = wallet?.minWithdrawCents ?? 2e3;
	const progress = Math.min(1, available / Math.max(1, minW));
	const left = Math.max(0, minW - available);
	const NetIcon = network === "wifi" ? Wifi : Signal;
	const name = user.displayName || "Earner";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-lg font-semibold tracking-tight",
					children: "Home"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-fg-muted",
					children: name
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status: sharing ? "sharing" : "offline" }), sharing ? "Sharing" : "Paused"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountAvatarButton, {
						user,
						onClick: onOpenAccount
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-fg-muted",
						children: "Available balance"
					}),
					loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-2xl text-fg-subtle",
						children: "…"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
						cents: available,
						size: "xl",
						className: "mt-1 block"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full rounded-full bg-primary",
							style: { width: `${progress * 100}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[11px] text-fg-subtle",
						children: left > 0 ? `${money(left)} more to reach $20` : "Min withdraw reached"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-4 w-full",
						variant: "secondary",
						onClick: onOpenWallet,
						children: "Open wallet · Stripe"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("mt-5 rounded-2xl border p-4", sharing ? "border-success/30 bg-success-soft/35" : "border-border bg-surface"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: sharing ? "Sharing is on" : "Sharing is off"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 flex items-center gap-1 text-xs text-fg-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NetIcon, { className: "h-3.5 w-3.5" }), networkLabel(sharing, network, wifiOnly)]
						}),
						!wifiOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[11px] text-fg-subtle",
							children: "Works on Wi‑Fi and mobile data"
						})
					] }), sharing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onCycleNetwork,
						className: "rounded-lg border border-border bg-bg/50 px-2 py-1 text-[10px] font-medium text-fg-muted",
						children: networkShort(network, wifiOnly)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-3 w-full",
					variant: sharing ? "danger" : "success",
					onClick: onToggleShare,
					children: sharing ? "Stop sharing" : "Start sharing"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Today",
					cents: DEMO_USER.todayEarnCents,
					sub: gb(DEMO_USER.todayBytes)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "This week",
					cents: DEMO_USER.weekEarnCents,
					sub: gb(DEMO_USER.weekBytes)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle",
				children: "Recent activity"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-2",
				children: DEMO_LEDGER.filter((e) => e.type === "traffic_earn").slice(0, 3).map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: ["+", gb(e.gb * 1024 ** 3)]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-fg-subtle",
						children: "Shared bandwidth"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
						cents: e.amountCents,
						size: "sm",
						className: "text-success"
					})]
				}, e.id))
			})
		]
	});
}
function Stat({ label, cents, sub }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-surface px-3 py-2.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[10px] uppercase tracking-wider text-fg-subtle",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
				cents,
				size: "sm",
				className: "mt-1 block"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 font-mono text-[11px] text-fg-muted",
				children: sub
			})
		]
	});
}
function HistoryTab() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "History"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-fg-muted",
				children: "Daily traffic & earnings"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 divide-y divide-border rounded-2xl border border-border bg-surface",
				children: DEMO_HISTORY.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between px-3.5 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: shortDate(d.day)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-[11px] text-fg-muted",
						children: gb(d.bytes)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
						cents: d.earnCents,
						size: "sm",
						className: "text-success"
					})]
				}, d.day))
			})
		]
	});
}
function WalletTab() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Wallet"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 text-xs text-fg-muted",
				children: "Your balance · cash out from $20"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileStripeWallet, {})
		]
	});
}
function SettingsTab({ user, wifiOnly, onWifiOnly, onOpenAccount, onLogout }) {
	const name = user.displayName || "Earner";
	const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Settings"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onOpenAccount,
				className: "mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition hover:bg-surface-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary",
						children: initials
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate font-mono text-xs text-fg-muted",
							children: user.phone
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4 shrink-0 text-fg-subtle" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 space-y-2 rounded-2xl border border-border bg-surface p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RowToggle, {
					label: "Wi‑Fi only",
					hint: wifiOnly ? "Sharing only on Wi‑Fi (mobile data off)" : "Share on Wi‑Fi and mobile data",
					checked: wifiOnly,
					onChange: onWifiOnly
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-1.5 text-sm font-medium",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "h-3.5 w-3.5 text-primary" }), "Networks"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-fg-muted",
						children: wifiOnly ? "Only Wi‑Fi is used for sharing." : "Any available network — Wi‑Fi and mobile — is used when sharing is on."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				className: "mt-4 w-full",
				onClick: onLogout,
				children: "Log out"
			})
		]
	});
}
function RowToggle({ label, hint, checked, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-3 py-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-medium",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] text-fg-subtle",
			children: hint
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			role: "switch",
			"aria-checked": checked,
			onClick: () => onChange(!checked),
			className: cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-surface-3"),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform", checked && "translate-x-5") })
		})]
	});
}
function AppPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketingShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl px-4 py-8 sm:px-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-8 max-w-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Earner app" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
					children: "Simple client — money & traffic only"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm leading-relaxed text-fg-muted",
					children: [
						"Sign in with phone OTP, share on any network, watch your balance grow. Withdraw from $20.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/dashboard",
							className: "text-primary hover:underline",
							children: "Same account on the web dashboard →"
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-center pb-12",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EarnerMobileApp, {})
		})]
	}) });
}
//#endregion
export { AppPage as component };
