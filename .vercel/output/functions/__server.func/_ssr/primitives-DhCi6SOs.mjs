import { F as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/primitives-DhCi6SOs.js
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Button({ variant = "primary", size = "md", className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45", size === "sm" && "h-9 px-3 text-sm", size === "md" && "h-11 px-4 text-sm", size === "lg" && "h-12 px-5 text-[15px]", variant === "primary" && "bg-primary text-primary-fg hover:bg-primary/90", variant === "secondary" && "border border-border bg-surface-2 text-fg hover:bg-surface-3", variant === "ghost" && "text-fg-muted hover:bg-surface hover:text-fg", variant === "danger" && "bg-danger text-white hover:bg-danger/90", variant === "success" && "bg-success text-white hover:bg-success/90", className),
		...props
	});
}
function Card({ className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rounded-2xl border border-border bg-surface p-4", className),
		children
	});
}
function Badge({ tone = "neutral", children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", tone === "neutral" && "bg-surface-3 text-fg-muted", tone === "success" && "bg-success-soft text-success", tone === "warning" && "bg-warning-soft text-warning", tone === "danger" && "bg-danger-soft text-danger", tone === "primary" && "bg-primary-soft text-primary", className),
		children
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-primary", className),
		...props
	});
}
function SectionLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle",
		children
	});
}
function Money({ cents, className, size = "md" }) {
	const value = `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("font-mono font-semibold tabular tracking-tight", size === "sm" && "text-sm", size === "md" && "text-lg", size === "lg" && "text-3xl", size === "xl" && "text-4xl", cents < 0 ? "text-danger" : "text-fg", className),
		children: value
	});
}
function StatusDot({ status }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("inline-block h-2 w-2 rounded-full", status === "sharing" && "bg-success status-pulse", status === "online" && "bg-primary", status === "offline" && "bg-fg-subtle", status === "pending" && "bg-warning", status === "banned" && "bg-danger") });
}
//#endregion
export { Money as a, cn as c, Input as i, Button as n, SectionLabel as o, Card as r, StatusDot as s, Badge as t };
