import { i as __toESM } from "../_runtime.mjs";
import { F as require_jsx_runtime, P as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as cn, i as Input, n as Button, o as SectionLabel, r as Card } from "./primitives-DhCi6SOs.mjs";
import { _ as LoaderCircle } from "../_libs/lucide-react.mjs";
import { a as getStoredToken, c as startOtp, n as fetchAuthConfig, u as verifyOtp } from "./shell-CXFbm1r0.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/format-BaMZjTgJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function OtpLogin({ onSuccess, variant = "web", defaultPhone, className }) {
	const [step, setStep] = (0, import_react.useState)("phone");
	const [phone, setPhone] = (0, import_react.useState)(defaultPhone || "");
	const [code, setCode] = (0, import_react.useState)("");
	const [testNumber, setTestNumber] = (0, import_react.useState)("+37368182830");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [info, setInfo] = (0, import_react.useState)(null);
	const [twilioOk, setTwilioOk] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		fetchAuthConfig().then((c) => {
			setTestNumber(c.testNumber);
			setTwilioOk(c.twilioConfigured);
			if (!phone) setPhone(c.testNumber);
		}).catch(() => setTwilioOk(false));
	}, []);
	const sendCode = async () => {
		setBusy(true);
		setError(null);
		setInfo(null);
		try {
			const res = await startOtp(phone);
			setPhone(res.phone);
			setStep("code");
			setInfo(res.message);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	const verify = async () => {
		setBusy(true);
		setError(null);
		try {
			onSuccess((await verifyOtp(phone, code)).user);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	if (variant === "mobile") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex flex-1 flex-col px-5 pb-8 pt-6", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold",
				children: "Relay"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-8 text-2xl font-semibold tracking-tight",
				children: step === "phone" ? "Enter your phone" : "Enter the code"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-fg-muted",
				children: step === "phone" ? "We’ll text a one-time code via Twilio." : `6-digit SMS to ${phone}`
			}),
			step === "phone" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "mt-8 h-12 w-full rounded-xl border border-border bg-surface px-4 font-mono text-sm outline-none focus:border-primary",
				placeholder: testNumber,
				value: phone,
				onChange: (e) => setPhone(e.target.value),
				inputMode: "tel",
				autoComplete: "tel"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "mt-8 h-12 w-full rounded-xl border border-border bg-surface px-4 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-primary",
				placeholder: "••••••",
				value: code,
				onChange: (e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6)),
				inputMode: "numeric",
				autoComplete: "one-time-code",
				maxLength: 6
			}),
			(error || info) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-3 text-xs leading-relaxed", error ? "text-danger" : "text-fg-muted"),
				children: error || info
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-[11px] text-fg-subtle",
				children: [
					"Test SMS only to",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-fg-muted",
						children: testNumber
					}),
					twilioOk === false && " · Twilio not configured"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-auto space-y-2",
				children: [step === "code" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					className: "w-full",
					disabled: busy,
					onClick: () => {
						setStep("phone");
						setCode("");
						setError(null);
					},
					children: "Change number"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					size: "lg",
					disabled: busy || step === "code" && code.length !== 6,
					onClick: () => void (step === "phone" ? sendCode() : verify()),
					children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : step === "phone" ? "Send code" : "Verify & continue"
				})]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: cn("mx-auto w-full max-w-md p-6", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Sign in" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 text-2xl font-semibold tracking-tight",
				children: step === "phone" ? "Phone number" : "SMS code"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-fg-muted",
				children: "Same OTP login as the mobile app. Email/password can be added later on your profile."
			}),
			step === "phone" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "block text-xs text-fg-muted",
					children: "Phone"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: phone,
					onChange: (e) => setPhone(e.target.value),
					placeholder: testNumber,
					className: "font-mono",
					inputMode: "tel"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-xs text-fg-muted",
					children: ["Code sent to ", phone]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: code,
					onChange: (e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6)),
					placeholder: "6-digit code",
					className: "text-center font-mono text-lg tracking-widest",
					inputMode: "numeric",
					maxLength: 6
				})]
			}),
			(error || info) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-3 text-xs leading-relaxed", error ? "text-danger" : "text-fg-muted"),
				children: error || info
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-[11px] text-fg-subtle",
				children: [
					"Live Twilio SMS to ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono",
						children: testNumber
					}),
					" only during testing."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 flex flex-wrap gap-2",
				children: [step === "code" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					disabled: busy,
					onClick: () => {
						setStep("phone");
						setCode("");
					},
					children: "Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "flex-1",
					disabled: busy || step === "code" && code.length !== 6,
					onClick: () => void (step === "phone" ? sendCode() : verify()),
					children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : step === "phone" ? "Send code" : "Verify"
				})]
			})
		]
	});
}
async function json(path, init) {
	const token = getStoredToken();
	const res = await fetch(`/api/stripe${path}`, {
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
function fetchStripeConfig() {
	return json("/config");
}
function fetchWallet() {
	return json("/wallet");
}
function refreshConnectStatus() {
	return json("/connect/refresh", {
		method: "POST",
		body: "{}"
	});
}
function startConnectOnboarding(origin) {
	return json("/connect/onboard", {
		method: "POST",
		body: JSON.stringify({ origin: origin || window.location.origin })
	});
}
function openStripeDashboard() {
	return json("/connect/dashboard", {
		method: "POST",
		body: "{}"
	});
}
function requestWithdraw(amountCents, opts) {
	return json("/withdraw", {
		method: "POST",
		body: JSON.stringify({
			amountCents,
			method: "stripe",
			...opts
		})
	});
}
function fundPlatformTest(amountCents = 1e4) {
	return json("/fund-platform", {
		method: "POST",
		body: JSON.stringify({ amountCents })
	});
}
function creditDemoBalance(cents = 1e3) {
	return json("/credit-demo", {
		method: "POST",
		body: JSON.stringify({ cents })
	});
}
function verifyStripe() {
	return json("/status");
}
async function fetchAccountBundle() {
	const token = getStoredToken();
	const res = await fetch("/api/account", { headers: token ? { authorization: `Bearer ${token}` } : {} });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
	return data;
}
function useStripeWallet() {
	const [wallet, setWallet] = (0, import_react.useState)(null);
	const [config, setConfig] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [stripeOk, setStripeOk] = (0, import_react.useState)(null);
	const reload = (0, import_react.useCallback)(async () => {
		try {
			const [w, c, v] = await Promise.all([
				fetchWallet(),
				fetchStripeConfig(),
				verifyStripe().catch(() => ({ ok: false }))
			]);
			setWallet(w);
			setConfig(c);
			setStripeOk(Boolean(v.ok));
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		reload();
	}, [reload]);
	(0, import_react.useEffect)(() => {
		const flag = new URLSearchParams(window.location.search).get("stripe");
		if (flag === "return" || flag === "refresh") {
			setMessage(flag === "return" ? "Back from Stripe — checking your debit card…" : "Refreshing card status…");
			refreshConnectStatus().then((w) => {
				setWallet(w);
				setMessage(w.payoutsEnabled ? "Debit card linked. You can cash out when balance ≥ $20." : "Almost done — finish any remaining steps if cash-out is still locked.");
			}).catch((err) => setError(err instanceof Error ? err.message : String(err)));
		}
	}, []);
	const connectStripe = async () => {
		setBusy(true);
		setError(null);
		try {
			const result = await startConnectOnboarding(window.location.origin);
			setWallet(result.wallet);
			setMessage("Opening secure Stripe card setup…");
			window.location.href = result.url;
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setBusy(false);
		}
	};
	const openDashboard = async () => {
		setBusy(true);
		setError(null);
		try {
			const { url } = await openStripeDashboard();
			window.open(url, "_blank", "noopener,noreferrer");
			setMessage("Opened Stripe to manage your card");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	const withdraw = async (amountCents) => {
		if (!wallet) return;
		const amount = amountCents ?? wallet.availableCents;
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			const result = await requestWithdraw(amount, { method: "stripe" });
			setWallet(result.wallet);
			if (result.ok) setMessage(result.message || `$${(amount / 100).toFixed(2)} sent to your debit card.`);
			else setError(result.error || "Cash-out pending platform funds");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	const fundPlatform = async () => {
		setBusy(true);
		setError(null);
		try {
			const result = await fundPlatformTest(1e4);
			setMessage(`Platform funded (test). Available may take a moment to settle. ${result.note || ""}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	const addDemoFunds = async (cents = 1e3) => {
		setBusy(true);
		setError(null);
		try {
			const w = await creditDemoBalance(cents);
			setWallet(w);
			setMessage(`Added $${(cents / 100).toFixed(2)} earnings`);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};
	const refresh = async () => {
		setBusy(true);
		try {
			const w = await refreshConnectStatus();
			setWallet(w);
			setMessage(w.payoutsEnabled ? "Card status updated — ready to cash out" : "Status updated");
		} catch {
			await reload();
		} finally {
			setBusy(false);
		}
	};
	return {
		wallet,
		config,
		loading,
		busy,
		message,
		error,
		stripeOk,
		connectStripe,
		openDashboard,
		withdraw,
		savePaypal: async () => {},
		fundPlatform,
		addDemoFunds,
		refresh,
		reload,
		setMessage,
		setError
	};
}
function money(cents) {
	return `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;
}
function gb(bytes) {
	const g = bytes / (1024 * 1024 * 1024);
	if (g < .01) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${g.toFixed(2)} GB`;
}
function shortDate(iso) {
	return new Date(iso).toLocaleDateString(void 0, {
		month: "short",
		day: "numeric"
	});
}
//#endregion
export { shortDate as a, money as i, fetchAccountBundle as n, useStripeWallet as o, gb as r, OtpLogin as t };
