import { i as __toESM } from "../_runtime.mjs";
import { F as require_jsx_runtime, P as require_react, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Money, n as Button, o as SectionLabel, r as Card } from "./primitives-DhCi6SOs.mjs";
import { A as BadgeCheck, E as CircleDollarSign, f as Radio, g as Lock, i as Users, j as ArrowRight, k as Calculator, l as Shield, n as Wifi, s as Smartphone, t as Zap } from "../_libs/lucide-react.mjs";
import { i as formatPhoneShort, l as useAuthSession, t as MarketingShell } from "./shell-CXFbm1r0.mjs";
import { c as PRICING, d as estimateMonthlyCents, f as moneyFromCents, l as PRICING_FAQ, s as DEMO_USER, u as WHY_USERS_HAPPY } from "./demo-BRmbEJzo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D3Y54-kO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LandingPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hero, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SocialProofBar, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HowItWorks, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PricingSection, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EarningsCalculator, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafetySection, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaqSection, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinalCta, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, {})
	] });
}
function Hero() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "relative overflow-hidden border-b border-border",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_55%)] opacity-[0.12]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wifi, { className: "h-3.5 w-3.5 text-primary" }), "Residential bandwidth · paid per GB"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-5 text-4xl font-semibold tracking-tight sm:text-5xl",
					children: ["Share your connection.", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-primary",
						children: "Get paid for it."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 max-w-lg text-base leading-relaxed text-fg-muted sm:text-lg",
					children: [
						"BusyProxy turns spare Wi‑Fi or mobile data into earnings.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
							className: "font-medium text-fg",
							children: [moneyFromCents(PRICING.wifiCentsPerGb), "/GB on Wi‑Fi"]
						}),
						",",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
							className: "font-medium text-fg",
							children: [moneyFromCents(PRICING.mobileCentsPerGb), "/GB on mobile"]
						}),
						". Verify your phone, leave sharing on, withdraw from",
						" ",
						moneyFromCents(PRICING.minWithdrawCents),
						"."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex flex-wrap gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "lg",
							children: ["Start earning", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "#pricing",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "lg",
							variant: "secondary",
							children: "See pay rates"
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-8 grid gap-2 text-sm text-fg-muted sm:grid-cols-2",
					children: [
						"Phone OTP login — no password needed",
						"Wi‑Fi + mobile data both supported",
						"You control when sharing is on",
						"Stripe withdrawals from $20"
					].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "mt-0.5 h-4 w-4 shrink-0 text-success" }), t]
					}, t))
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-center lg:justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PhonePreview, {})
			})]
		})]
	});
}
function SocialProofBar() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-b border-border bg-bg-elevated",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 text-sm text-fg-muted sm:px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4 text-primary" }), "Built for earners who want simple cash for spare bandwidth"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "font-mono text-xs text-fg-subtle",
				children: [
					"Min payout ",
					moneyFromCents(PRICING.minWithdrawCents),
					" · Stripe"
				]
			})]
		})
	});
}
function HowItWorks() {
	const steps = [
		{
			icon: Smartphone,
			t: "1. Verify your phone",
			d: "OTP via SMS. One account per number — no complex signup."
		},
		{
			icon: Wifi,
			t: "2. Turn sharing on",
			d: "Use Wi‑Fi at home or mobile data when you’re out. You choose."
		},
		{
			icon: CircleDollarSign,
			t: "3. Get paid per GB",
			d: `Earn ${moneyFromCents(PRICING.wifiCentsPerGb)}/GB Wi‑Fi or ${moneyFromCents(PRICING.mobileCentsPerGb)}/GB mobile. Withdraw via Stripe.`
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "how-it-works",
		className: "border-b border-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-4 py-16 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "How it works" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
					children: "Three steps. No proxy jargon."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-10 grid gap-4 md:grid-cols-3",
					children: steps.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-4 font-semibold",
								children: s.t
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-relaxed text-fg-muted",
								children: s.d
							})
						]
					}, s.t))
				})
			]
		})
	});
}
function PricingSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "pricing",
		className: "border-b border-border bg-bg-elevated",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-4 py-16 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Pay rates" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
					children: "Transparent rates. Paid for every GB shared."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wifi, { className: "h-5 w-5 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle",
									children: "Wi‑Fi"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 font-mono text-3xl font-semibold tabular",
									children: [moneyFromCents(PRICING.wifiCentsPerGb), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-normal text-fg-muted",
										children: "/GB"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "h-5 w-5 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle",
									children: "Mobile data"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 font-mono text-3xl font-semibold tabular",
									children: [moneyFromCents(PRICING.mobileCentsPerGb), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-normal text-fg-muted",
										children: "/GB"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDollarSign, { className: "h-5 w-5 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle",
									children: "Min withdraw"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 font-mono text-3xl font-semibold tabular",
									children: moneyFromCents(PRICING.minWithdrawCents)
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-5 w-5 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle",
									children: "Welcome bonus"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 font-mono text-3xl font-semibold tabular",
									children: moneyFromCents(PRICING.welcomeBonusCents)
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-8 grid gap-3 sm:grid-cols-2",
					children: WHY_USERS_HAPPY.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-start gap-2 rounded-xl border border-border bg-bg px-4 py-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "mt-0.5 h-4 w-4 shrink-0 text-success" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-medium text-fg",
							children: [w.t, ". "]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fg-muted",
							children: w.d
						})] })]
					}, w.t))
				})
			]
		})
	});
}
function EarningsCalculator() {
	const [wifiGb, setWifiGb] = (0, import_react.useState)(PRICING.typicalWifiGbPerDay);
	const [mobileGb, setMobileGb] = (0, import_react.useState)(PRICING.typicalMobileGbPerDay);
	const totalCents = (0, import_react.useMemo)(() => estimateMonthlyCents({
		wifiGbPerDay: wifiGb,
		mobileGbPerDay: mobileGb
	}), [wifiGb, mobileGb]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "earnings",
		className: "border-b border-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-4 py-16 sm:px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Estimator" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
					children: "Rough monthly earnings"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "hidden h-8 w-8 text-fg-subtle sm:block" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "mt-8 p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-6 md:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg-muted",
								children: "Wi‑Fi GB / day"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: 0,
								max: 30,
								value: wifiGb,
								onChange: (e) => setWifiGb(Number(e.target.value)),
								className: "mt-2 w-full accent-[var(--color-primary)]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 block font-mono text-lg tabular",
								children: [wifiGb, " GB/day"]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg-muted",
								children: "Mobile GB / day"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: 0,
								max: 15,
								value: mobileGb,
								onChange: (e) => setMobileGb(Number(e.target.value)),
								className: "mt-2 w-full accent-[var(--color-primary)]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 block font-mono text-lg tabular",
								children: [mobileGb, " GB/day"]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-fg-subtle",
						children: "Estimated ~30 days"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
						cents: totalCents,
						size: "lg",
						className: "mt-1"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-sm text-xs text-fg-muted",
						children: "Illustration only — real earnings depend on demand, quality, and how long you share."
					})]
				})]
			})]
		})
	});
}
function SafetySection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "border-b border-border bg-bg-elevated",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-4 py-16 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Safety" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 text-2xl font-semibold tracking-tight",
					children: "You’re in control"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 grid gap-4 md:grid-cols-3",
					children: [
						{
							icon: Lock,
							t: "You choose when to share",
							d: "One toggle. Off means no traffic is shared."
						},
						{
							icon: Shield,
							t: "No proxy links for earners",
							d: "You only see balance and traffic — not technical proxy URLs."
						},
						{
							icon: Zap,
							t: "Caps & preferences",
							d: "Prefer Wi‑Fi only, or allow mobile when you want higher uptime."
						}
					].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(x.icon, { className: "h-5 w-5 text-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-3 font-semibold",
								children: x.t
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-fg-muted",
								children: x.d
							})
						]
					}, x.t))
				})
			]
		})
	});
}
function FaqSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "border-b border-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-4 py-16 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "FAQ" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 text-2xl font-semibold tracking-tight",
					children: "Common questions"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 space-y-3",
					children: PRICING_FAQ.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
						className: "group rounded-xl border border-border bg-bg-elevated px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
							className: "cursor-pointer list-none font-medium marker:content-none",
							children: f.q
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-fg-muted",
							children: f.a
						})]
					}, f.q))
				})
			]
		})
	});
}
function FinalCta() {
	const { isLoggedIn, ready, user } = useAuthSession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "border-t border-border bg-bg-elevated",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-4 py-16 text-center sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-2xl font-semibold tracking-tight sm:text-3xl",
					children: isLoggedIn ? `Welcome back${user?.displayName ? `, ${user.displayName}` : ""}` : `Ready to earn ${moneyFromCents(PRICING.wifiCentsPerGb)}/GB on Wi‑Fi?`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mt-3 max-w-lg text-fg-muted",
					children: isLoggedIn ? "Open the app to manage sharing, or your dashboard for balance and withdrawals." : `Open the app, verify your number, turn sharing on. Withdraw from ${moneyFromCents(PRICING.minWithdrawCents)}.`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 flex flex-wrap justify-center gap-3",
					children: !ready ? null : isLoggedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "lg",
							children: ["Open app", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/dashboard",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "lg",
							variant: "secondary",
							children: "My account"
						})
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "lg",
							children: ["Start earning", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/dashboard",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "lg",
							variant: "secondary",
							children: "Log in to dashboard"
						})
					})] })
				})
			]
		})
	});
}
function SiteFooter() {
	const { isLoggedIn, user } = useAuthSession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "border-t border-border",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex items-center gap-2 font-semibold",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "h-4 w-4 text-primary" }), "BusyProxy"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 max-w-sm text-sm text-fg-muted",
				children: [
					"Share residential bandwidth. Get paid",
					" ",
					moneyFromCents(PRICING.wifiCentsPerGb),
					"/GB on Wi‑Fi ·",
					" ",
					moneyFromCents(PRICING.mobileCentsPerGb),
					"/GB mobile."
				]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-x-8 gap-y-4 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium uppercase tracking-wider text-fg-subtle",
							children: "Product"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#pricing",
							className: "block text-fg-muted hover:text-fg",
							children: "Pay rates"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#how-it-works",
							className: "block text-fg-muted hover:text-fg",
							children: "How it works"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/app",
							className: "block text-fg-muted hover:text-fg",
							children: "App"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-wider text-fg-subtle",
						children: "Account"
					}), isLoggedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/dashboard",
						className: "block text-fg-muted hover:text-fg",
						children: [formatPhoneShort(user?.phone), " · Dashboard"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app",
						className: "block text-fg-muted hover:text-fg",
						children: "Open app"
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/dashboard",
						className: "block text-fg-muted hover:text-fg",
						children: "Log in"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app",
						className: "block text-fg-muted hover:text-fg",
						children: "Start earning"
					})] })]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border-t border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-fg-subtle sm:flex-row sm:justify-between sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"© ",
					(/* @__PURE__ */ new Date()).getFullYear(),
					" BusyProxy. All rights reserved."
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "busyproxy.net" })]
			})
		})]
	});
}
function PhonePreview() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "w-full max-w-[280px] overflow-hidden rounded-[2rem] border border-border-strong bg-bg phone-shadow",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between px-5 pt-3 text-[10px] text-fg-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "9:41" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-3 rounded-sm border border-fg-muted/50" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-5 pb-6 pt-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold",
						children: "Home"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] text-fg-muted",
						children: "Your balance"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-full border border-success/30 bg-success-soft/40 px-2 py-0.5 text-[10px] text-success",
						children: "Sharing"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 text-[10px] text-fg-muted",
					children: "Available"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
					cents: DEMO_USER.availableCents,
					size: "lg",
					className: "mt-0.5 block"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 h-1 overflow-hidden rounded-full bg-surface-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-[71%] rounded-full bg-primary" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-[10px] text-fg-subtle",
					children: [
						"Toward ",
						moneyFromCents(PRICING.minWithdrawCents),
						" withdraw"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 rounded-xl border border-success/25 bg-success-soft/30 p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-semibold",
						children: [moneyFromCents(PRICING.wifiCentsPerGb), "/GB Wi‑Fi"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 text-[10px] text-fg-muted",
						children: [moneyFromCents(PRICING.mobileCentsPerGb), "/GB mobile · sharing on"]
					})]
				})
			]
		})]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketingShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LandingPage, {}) });
//#endregion
export { SplitComponent as component };
