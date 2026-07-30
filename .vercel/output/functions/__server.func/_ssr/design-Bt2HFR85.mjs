import { F as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Money, i as Input, n as Button, o as SectionLabel, r as Card, s as StatusDot, t as Badge } from "./primitives-DhCi6SOs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/design-Bt2HFR85.js
var import_jsx_runtime = require_jsx_runtime();
function DesignSystemPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Design system" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-3xl font-semibold tracking-tight",
					children: "Relay UI kit"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-fg-muted",
					children: "Shared tokens and components for marketing, earner mobile, user dashboard, and admin — one brand, four densities."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Color" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6",
				children: [
					[
						"bg",
						"bg-bg",
						"border"
					],
					[
						"elevated",
						"bg-bg-elevated",
						"border"
					],
					[
						"surface",
						"bg-surface",
						"border"
					],
					[
						"primary",
						"bg-primary",
						""
					],
					[
						"success",
						"bg-success",
						""
					],
					[
						"danger",
						"bg-danger",
						""
					]
				].map(([name, cls, border]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border p-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-14 rounded-lg ${cls} ${border ? "border border-border" : ""}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs font-medium capitalize",
						children: name
					})]
				}, name))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Typography" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "mt-3 space-y-2 p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-4xl font-semibold tracking-tight",
						children: "Display / DM Sans"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg text-fg-muted",
						children: "Body muted — calm product copy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-sm tabular",
						children: "$14.20 · 3.28 GB · +373"
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Buttons" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Primary" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						children: "Secondary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						children: "Ghost"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "success",
						children: "Success"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "danger",
						children: "Danger"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: true,
						children: "Disabled"
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Badges & status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "neutral" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: "success",
						children: "paid"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: "warning",
						children: "pending"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: "danger",
						children: "banned"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: "primary",
						children: "bonus"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-2 flex items-center gap-1.5 text-sm text-fg-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status: "sharing" }), " Sharing"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5 text-sm text-fg-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusDot, { status: "offline" }), " Offline"]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Money & inputs" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-4 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-fg-muted",
							children: "Available balance"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
							cents: 1420,
							size: "xl",
							className: "mt-1 block"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
							cents: -2e3,
							size: "sm",
							className: "mt-2 block"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "space-y-3 p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Phone number",
						defaultValue: "+373 60 123 456"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "OTP",
						defaultValue: "123456",
						className: "font-mono tracking-widest"
					})]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Domain patterns" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: "BalanceHero"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-fg-muted",
							children: "Large money + withdraw progress to $20"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: "ShareToggleCard"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-fg-muted",
							children: "One primary start/stop control — no proxy jargon"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: "LedgerRow / DataTable"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-fg-muted",
							children: "Shared list patterns for mobile + admin"
						})]
					})
				]
			})] })
		]
	});
}
/**
* Internal project page — design system.
* Not linked from public marketing nav. noindex.
*/
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "min-h-dvh bg-bg text-fg",
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-b border-border px-4 py-2 text-center text-[11px] text-fg-subtle",
		children: "Internal project page · not part of public marketing site"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DesignSystemPage, {})]
});
//#endregion
export { SplitComponent as component };
