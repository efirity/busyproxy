import { F as require_jsx_runtime, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as SectionLabel, r as Card } from "./primitives-DhCi6SOs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/docs-CVAXUKrb.js
var import_jsx_runtime = require_jsx_runtime();
var guides = [
	{
		title: "How earnings work",
		points: [
			"Share Wi‑Fi or mobile data when you choose",
			"Earn per GB shared ($0.20 Wi‑Fi · $0.12 mobile)",
			"Cash out from $20 via PayPal, bank, or card",
			"You control start / stop anytime"
		]
	},
	{
		title: "Getting paid",
		points: [
			"PayPal — email only, works worldwide",
			"Bank / Wise — local account details",
			"Card or bank — one-time secure setup",
			"Minimum withdraw $20"
		]
	},
	{
		title: "Safety & control",
		points: [
			"Visible notification while sharing",
			"Pick network mode (Wi‑Fi only, mobile only…)",
			"Daily data caps and stop anytime",
			"Operators manage access — you never see proxy passwords"
		]
	}
];
function DocsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-6xl px-4 py-10 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Help" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 text-3xl font-semibold tracking-tight",
				children: "How BusyProxy works"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-2xl text-fg-muted",
				children: "Simple guides for earners. Share bandwidth when you want, get paid for the traffic you share."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid gap-4 md:grid-cols-3",
				children: guides.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "flex flex-col p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: d.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 flex-1 space-y-1.5 text-sm text-fg-muted",
						children: d.points.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["· ", p] }, p))
					})]
				}, d.title))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "mt-8 p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: "Get started"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg-muted",
						children: "Sign in with your phone, start sharing from the app, and cash out when you hit $20."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-4 text-sm text-fg-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/app",
								className: "text-primary hover:underline",
								children: "Open earner app"
							}),
							" · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/dashboard",
								className: "text-primary hover:underline",
								children: "Dashboard"
							})
						]
					})
				]
			})
		]
	});
}
/**
* Internal project specs — not linked from public marketing nav. noindex.
*/
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "min-h-dvh bg-bg text-fg",
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "border-b border-border px-4 py-2 text-center text-[11px] text-fg-subtle",
		children: "Internal project docs · not part of public marketing site"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocsPage, {})]
});
//#endregion
export { SplitComponent as component };
