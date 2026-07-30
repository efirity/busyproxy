import { i as __toESM } from "../_runtime.mjs";
import { F as require_jsx_runtime, P as require_react, g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as cn, n as Button } from "./primitives-DhCi6SOs.mjs";
import { O as ChevronDown, f as Radio, h as LogOut, o as UserRound } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/shell-CXFbm1r0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TOKEN_KEY = "relay_session_token";
var USER_KEY = "relay_session_user";
var AUTH_EVENT = "relay-auth-changed";
function notifyAuthChanged() {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(AUTH_EVENT));
}
function getStoredToken() {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(TOKEN_KEY);
}
function getStoredUser() {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(USER_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function persistSession(token, user) {
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(USER_KEY, JSON.stringify(user));
	notifyAuthChanged();
}
function clearSession() {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
	notifyAuthChanged();
}
async function api(path, init) {
	const token = getStoredToken();
	const res = await fetch(`/api/auth${path}`, {
		...init,
		headers: {
			"content-type": "application/json",
			...token ? { authorization: `Bearer ${token}` } : {},
			...init?.headers ?? {}
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
	return data;
}
function fetchAuthConfig() {
	return api("/config");
}
function startOtp(phone) {
	return api("/otp/start", {
		method: "POST",
		body: JSON.stringify({ phone })
	});
}
async function verifyOtp(phone, code) {
	const result = await api("/otp/verify", {
		method: "POST",
		body: JSON.stringify({
			phone,
			code
		})
	});
	persistSession(result.token, result.user);
	return result;
}
async function fetchSession() {
	const token = getStoredToken();
	if (!token) return null;
	try {
		const session = await api("/session");
		persistSession(token, session.user);
		return session;
	} catch {
		clearSession();
		return null;
	}
}
async function logout() {
	try {
		await api("/logout", {
			method: "POST",
			body: "{}"
		});
	} catch {}
	clearSession();
}
/** Mask phone for UI: +373•••2830 */
function formatPhoneShort(phone) {
	if (!phone) return "Account";
	const d = phone.replace(/\s/g, "");
	if (d.length < 6) return d;
	return `${d.slice(0, 4)}···${d.slice(-4)}`;
}
function useAuthSession() {
	const [user, setUser] = (0, import_react.useState)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const refresh = (0, import_react.useCallback)(async () => {
		const stored = getStoredUser();
		if (!getStoredToken() || !stored) {
			setUser(null);
			setReady(true);
			return;
		}
		setUser(stored);
		setReady(true);
		const session = await fetchSession();
		setUser(session?.user ?? null);
	}, []);
	(0, import_react.useEffect)(() => {
		refresh();
		const onChange = () => {
			setUser(getStoredUser());
		};
		window.addEventListener(AUTH_EVENT, onChange);
		window.addEventListener("storage", onChange);
		return () => {
			window.removeEventListener(AUTH_EVENT, onChange);
			window.removeEventListener("storage", onChange);
		};
	}, [refresh]);
	const logout$1 = (0, import_react.useCallback)(async () => {
		setBusy(true);
		try {
			await logout();
			setUser(null);
		} finally {
			setBusy(false);
		}
	}, []);
	const signOutLocal = (0, import_react.useCallback)(() => {
		clearSession();
		setUser(null);
	}, []);
	return {
		user,
		isLoggedIn: Boolean(user),
		ready,
		busy,
		refresh,
		logout: logout$1,
		signOutLocal
	};
}
/** Public marketing nav only — no admin / design / internal specs. */
var links = [
	{
		href: "/",
		label: "Home"
	},
	{
		href: "/#how-it-works",
		label: "How it works"
	},
	{
		href: "/#pricing",
		label: "Pay rates"
	},
	{
		href: "/#earnings",
		label: "Estimator"
	},
	{
		href: "/app",
		label: "App"
	}
];
function SiteNav() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { user, isLoggedIn, ready, busy, logout } = useAuthSession();
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const menuRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!menuOpen) return;
		const onDoc = (e) => {
			if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [menuOpen]);
	const label = user?.displayName?.trim() || formatPhoneShort(user?.phone) || "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "sticky top-0 z-40 border-b border-border/80 bg-bg/80 backdrop-blur-xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "flex items-center gap-2 font-semibold tracking-tight",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "h-4 w-4" })
					}), "BusyProxy"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "hidden items-center gap-1 md:flex",
					"aria-label": "Primary",
					children: links.map((l) => {
						const active = (l.href.split("#")[0] || "/") === "/app" ? pathname.startsWith("/app") : pathname === "/" && (l.href === "/" || l.href.startsWith("/#"));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: l.href,
							className: cn("rounded-lg px-3 py-1.5 text-sm transition", active && l.href === "/" ? "bg-surface text-fg" : pathname.startsWith("/app") && l.href === "/app" ? "bg-surface text-fg" : "text-fg-muted hover:text-fg"),
							children: l.label
						}, l.label);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-2",
					children: !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-8 w-24 animate-pulse rounded-full bg-surface",
						"aria-hidden": true
					}) : isLoggedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/dashboard",
						className: "hidden sm:block",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							children: "Dashboard"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						ref: menuRef,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setMenuOpen((o) => !o),
							className: cn("flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm transition hover:border-border-strong", menuOpen && "border-primary/40"),
							"aria-expanded": menuOpen,
							"aria-haspopup": "menu",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRound, { className: "h-3.5 w-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden max-w-[9rem] truncate font-medium sm:inline",
									children: label
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: cn("h-3.5 w-3.5 text-fg-muted transition", menuOpen && "rotate-180") })
							]
						}), menuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							role: "menu",
							className: "absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-lg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-b border-border px-3 py-2.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-fg-subtle",
										children: "Signed in"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm font-medium",
										children: label
									}),
									user?.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate font-mono text-[11px] text-fg-muted",
										children: user.phone
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/dashboard",
										role: "menuitem",
										className: "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface",
										onClick: () => setMenuOpen(false),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRound, { className: "h-4 w-4 text-fg-muted" }), "Account & dashboard"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/app",
										role: "menuitem",
										className: "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface",
										onClick: () => setMenuOpen(false),
										children: "Open app"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "menuitem",
										disabled: busy,
										className: "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft/40",
										onClick: () => {
											setMenuOpen(false);
											logout();
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), "Log out"]
									})
								]
							})]
						})]
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/dashboard",
						className: "hidden sm:block",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							children: "Log in"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/app",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							children: "Start earning"
						})
					})] })
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-1 overflow-x-auto border-t border-border/60 px-3 py-2 md:hidden",
			children: [links.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: l.href,
				className: "shrink-0 rounded-full px-3 py-1 text-xs text-fg-muted",
				children: l.label
			}, l.label)), isLoggedIn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/dashboard",
				className: "shrink-0 rounded-full bg-surface px-3 py-1 text-xs text-fg",
				children: "Account"
			})]
		})]
	});
}
function MarketingShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteNav, {}), children]
	});
}
//#endregion
export { getStoredToken as a, startOtp as c, formatPhoneShort as i, useAuthSession as l, fetchAuthConfig as n, getStoredUser as o, fetchSession as r, logout as s, MarketingShell as t, verifyOtp as u };
