import { i as __toESM } from "../_runtime.mjs";
import { F as require_jsx_runtime, P as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Money, c as cn, n as Button, o as SectionLabel, r as Card, t as Badge } from "./primitives-DhCi6SOs.mjs";
import { N as Activity, S as Flag, T as Copy, _ as LoaderCircle, d as RefreshCw, i as Users, l as Shield, m as Network, p as Plus, r as Wallet, s as Smartphone, v as Link2, y as LayoutDashboard } from "../_libs/lucide-react.mjs";
import { n as ADMIN_USERS, r as ADMIN_WITHDRAWALS, t as ADMIN_KPIS } from "./demo-BRmbEJzo.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/portal-BhYhqMKH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function json(path, init) {
	const res = await fetch(`/api/edge${path}`, {
		...init,
		headers: {
			"content-type": "application/json",
			...init?.headers ?? {}
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
	return data;
}
function fetchEdgeSnapshot() {
	return json("/status");
}
function setDeviceExit(deviceId, enabled) {
	return json(`/devices/${encodeURIComponent(deviceId)}/exit`, {
		method: "POST",
		body: JSON.stringify({ enabled })
	});
}
function mintCredential(body) {
	return json("/credentials", {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function patchCredential(id, body) {
	return json(`/credentials/${encodeURIComponent(id)}`, {
		method: "PATCH",
		body: JSON.stringify(body)
	});
}
function revokeCredential(id) {
	return json(`/credentials/${encodeURIComponent(id)}`, { method: "DELETE" });
}
function connectCheck(body) {
	return json("/connect-check", {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function releaseSticky(body) {
	return json("/sessions/release", {
		method: "POST",
		body: JSON.stringify(body)
	});
}
var nav = [
	{
		id: "overview",
		label: "Overview",
		icon: LayoutDashboard
	},
	{
		id: "proxies",
		label: "Proxy access",
		icon: Link2
	},
	{
		id: "gateway",
		label: "Fleet & tunnels",
		icon: Network
	},
	{
		id: "users",
		label: "Users",
		icon: Users
	},
	{
		id: "devices",
		label: "Devices",
		icon: Smartphone
	},
	{
		id: "traffic",
		label: "Traffic",
		icon: Activity
	},
	{
		id: "withdrawals",
		label: "Withdrawals",
		icon: Wallet
	},
	{
		id: "risk",
		label: "Risk",
		icon: Flag
	}
];
function AdminDashboard() {
	const [section, setSection] = (0, import_react.useState)("proxies");
	const [edge, setEdge] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [err, setErr] = (0, import_react.useState)(null);
	const [minted, setMinted] = (0, import_react.useState)(null);
	const [allowlistDraft, setAllowlistDraft] = (0, import_react.useState)("89.28.43.197");
	const [testSourceIp, setTestSourceIp] = (0, import_react.useState)("89.28.43.197");
	const [sessionId, setSessionId] = (0, import_react.useState)("mysession01");
	const [bindDevice, setBindDevice] = (0, import_react.useState)("");
	const reload = (0, import_react.useCallback)(async () => {
		try {
			const snap = await fetchEdgeSnapshot();
			setEdge(snap);
		} catch (e) {
			setErr(e instanceof Error ? e.message : String(e));
		}
	}, []);
	(0, import_react.useEffect)(() => {
		reload();
		const t = setInterval(() => void reload(), 8e3);
		return () => clearInterval(t);
	}, [reload]);
	(0, import_react.useEffect)(() => {
		if (!bindDevice && edge?.devices?.length) {
			const pref = edge.devices.find((d) => d.online && (d.ipType === "mobile" || d.network === "cellular")) || edge.devices.find((d) => d.online);
			if (pref) setBindDevice(pref.deviceId);
		}
	}, [edge, bindDevice]);
	const run = async (fn) => {
		setBusy(true);
		setErr(null);
		setMsg(null);
		try {
			await fn();
			await reload();
		} catch (e) {
			setErr(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1400px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "hidden w-56 shrink-0 border-r border-border bg-bg-elevated p-4 lg:block",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-semibold uppercase tracking-wider text-fg-subtle",
				children: "BusyProxy Portal"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "mt-6 space-y-0.5",
				children: nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setSection(n.id),
					className: cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm", section === n.id ? "bg-surface text-fg" : "text-fg-muted hover:text-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(n.icon, { className: "h-4 w-4" }), n.label]
				}, n.id))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "min-w-0 flex-1 space-y-5 p-4 sm:p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-1 lg:hidden",
					children: nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setSection(n.id),
						className: cn("rounded-full px-3 py-1 text-xs", section === n.id ? "bg-surface text-fg" : "text-fg-muted"),
						children: n.label
					}, n.id))
				}),
				section === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewSection, { edge }),
				section === "proxies" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProxyAccessSection, {
					edge,
					busy,
					msg,
					err,
					minted,
					allowlistDraft,
					testSourceIp,
					sessionId,
					bindDevice,
					setAllowlistDraft,
					setTestSourceIp,
					setSessionId,
					setBindDevice,
					onRefresh: () => void run(async () => {}),
					onMint: () => void run(async () => {
						const cred = await mintCredential({
							label: "Mobile rotating/sticky",
							allowlistIps: allowlistDraft.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
							defaultMode: "rotate",
							defaultType: "mobile"
						});
						if (cred.password) setMinted({
							user: cred.username,
							pass: cred.password,
							id: cred.id,
							endpoints: cred.endpoints
						});
						setMsg(`Minted ${cred.username} (mobile pool default)`);
					}),
					onTest: (mode) => void run(async () => {
						if (!minted) throw new Error("Mint a credential first");
						const result = await connectCheck({
							username: mode === "sticky" ? `${minted.user}-session-${sessionId}-type-mobile-mode-sticky` : `${minted.user}-type-mobile-mode-rotate`,
							password: minted.pass,
							sourceIp: testSourceIp,
							targetHost: "api.ipify.org"
						});
						setMsg(JSON.stringify(result, null, 2));
					}),
					onRelease: () => void run(async () => {
						if (!minted) throw new Error("Mint first");
						await releaseSticky({
							username: minted.user,
							sessionId
						});
						setMsg(`Released sticky session ${sessionId}`);
					}),
					onToggleExit: (d, enabled) => void run(async () => {
						await setDeviceExit(d.deviceId, enabled);
						setMsg(`${d.name}: exit ${enabled ? "on" : "off"}`);
					}),
					onRevoke: (c) => void run(async () => {
						await revokeCredential(c.id);
						if (minted?.id === c.id) setMinted(null);
						setMsg(`Revoked ${c.username}`);
					}),
					onPatchAllowlist: (c) => void run(async () => {
						await patchCredential(c.id, { allowlistIps: allowlistDraft.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean) });
						setMsg("Allowlist updated");
					})
				}),
				section === "gateway" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FleetSection, {
					edge,
					busy,
					onToggleExit: (d, enabled) => void run(async () => {
						await setDeviceExit(d.deviceId, enabled);
					}),
					onRefresh: () => void run(async () => {})
				}),
				section === "users" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsersSection, {}),
				section === "devices" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DevicesSection, { devices: edge?.devices || [] }),
				section === "traffic" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Live edge events" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 max-h-96 space-y-2 overflow-y-auto",
						children: (edge?.events || []).map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[11px] text-fg-muted",
							children: JSON.stringify(ev)
						}, String(ev.id)))
					})]
				}),
				section === "withdrawals" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WithdrawalsSection, {}),
				section === "risk" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Risk" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg-muted",
						children: "Disable exit on abused devices without showing proxy details to earners. Prefer type=mobile only so Wi‑Fi residential cannot enter “mobile” product SKUs."
					})]
				})
			]
		})]
	});
}
function OverviewSection({ edge }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-semibold tracking-tight",
			children: "Overview"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-fg-muted",
			children: "Earners, fleet capacity, proxy gate health"
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
			children: ADMIN_KPIS.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-fg-muted",
						children: k.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-mono text-2xl font-semibold tabular",
						children: k.value
					}),
					k.delta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-fg-subtle",
						children: k.delta
					})
				]
			}, k.label))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 sm:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Mobile exits online",
					value: String(edge?.stats.mobileOnline ?? "—")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "All online",
					value: String(edge?.stats.online ?? "—")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Sticky sessions",
					value: String(edge?.stats.stickySessions ?? "—")
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "How to use proxies" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-fg-muted",
				children: [
					"Open ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "Proxy access"
					}),
					" → mint a credential → copy rotating or sticky URI. Default pool is",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
						className: "text-fg",
						children: "mobile/cellular"
					}),
					" so IP checkers see carrier ASN."
				]
			})]
		})
	] });
}
function ProxyAccessSection(props) {
	const { edge, minted, busy } = props;
	const arch = edge?.architecture;
	const gate = arch?.hosts?.gateHttp || "gate.busyproxy.net:18080";
	const socks = arch?.hosts?.gateSocks || "gate.busyproxy.net:11080";
	const rotateUser = minted ? `${minted.user}-type-mobile-mode-rotate` : "bp_USER-type-mobile-mode-rotate";
	const stickyUser = minted ? `${minted.user}-session-${props.sessionId}-type-mobile-mode-sticky` : `bp_USER-session-${props.sessionId}-type-mobile-mode-sticky`;
	const pass = minted?.pass || "PASSWORD";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Proxy access"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-fg-muted",
				children: "Stable gate URI · rotating vs sticky · mobile pool by default"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "secondary",
				disabled: busy,
				onClick: props.onRefresh,
				children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" }), "Refresh"]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Operator rules" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 grid gap-3 md:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Note, {
							title: "Never dial phone IP",
							body: "Customers only hit gate.busyproxy.net. Phones open reverse tunnels. Mobile IP changes do not change your URI."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Note, {
							title: "Rotating",
							body: "No session (or mode=rotate): each connect picks a healthy cellular exit. If that phone drops, the next request auto-uses another."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Note, {
							title: "Sticky",
							body: "session-{id} pins one device. If offline → error (no silent IP swap). Change session id manually for a new sticky IP."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-sm text-fg-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Mobile by default:"
						}),
						" ",
						arch?.mobileByDefault || "type=mobile uses only cellular exits so proxy checkers classify carrier/mobile."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 grid gap-2 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
						label: "HTTP gate",
						value: gate
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
						label: "SOCKS5 gate",
						value: socks
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 font-mono text-[11px] text-fg-subtle",
					children: ["Grammar: ", arch?.usernameGrammar]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "1. Mint credential" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs text-fg-muted",
					children: "Password shown once. Earner never sees this. Default type=mobile, mode=rotate."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-3 block text-xs text-fg-muted",
					children: ["Source IP allowlist", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm",
						value: props.allowlistDraft,
						onChange: (e) => props.setAllowlistDraft(e.target.value)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						disabled: busy,
						onClick: props.onMint,
						children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "Mint mobile credential"]
					})
				}),
				minted && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-primary",
							children: "Store password in vault — shown once"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
							label: "Base user",
							value: minted.user
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
							label: "Password",
							value: minted.pass
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: "primary",
							children: "Rotating"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Mobile pool" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-fg-muted",
						children: "Auto re-route when a phone disconnects. New connection → next healthy cellular exit."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
								label: "HTTP URI",
								value: `http://${rotateUser}:${pass}@${gate}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
								label: "SOCKS5 URI",
								value: `socks5://${rotateUser}:${pass}@${socks}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
								label: "curl",
								value: `curl -x http://${rotateUser}:${pass}@${gate} https://api.ipify.org`
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-4",
						size: "sm",
						variant: "secondary",
						disabled: busy || !minted,
						onClick: () => props.onTest("rotate"),
						children: "Test rotating route"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: "success",
							children: "Sticky"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Single exit" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-fg-muted",
						children: "Same session id → same device. Offline → hard fail (change session for a new sticky IP)."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-3 block text-xs text-fg-muted",
						children: ["Session id", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm",
							value: props.sessionId,
							onChange: (e) => props.setSessionId(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
							label: "HTTP URI",
							value: `http://${stickyUser}:${pass}@${gate}`
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyRow, {
							label: "SOCKS5 URI",
							value: `socks5://${stickyUser}:${pass}@${socks}`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "secondary",
							disabled: busy || !minted,
							onClick: () => props.onTest("sticky"),
							children: "Test sticky route"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "ghost",
							disabled: busy || !minted,
							onClick: props.onRelease,
							children: "Release session"
						})]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "overflow-hidden p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border px-4 py-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Active sticky sessions" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickyTable, { sessions: edge?.stickySessions || [] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "overflow-hidden p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border px-4 py-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Credentials" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[700px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs text-fg-subtle",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "User"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Defaults"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Allowlist"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Uses"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Actions"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [(edge?.credentials || []).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/60",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5 font-mono text-xs",
								children: c.username
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-4 py-2.5 text-xs text-fg-muted",
								children: [
									c.defaultType,
									"/",
									c.defaultMode
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5 font-mono text-[10px] text-fg-muted",
								children: c.allowlistIps.length ? c.allowlistIps.join(", ") : "any"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5",
								children: c.useCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										variant: "ghost",
										disabled: busy,
										onClick: () => props.onPatchAllowlist(c),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3 w-3" }), "Allowlist"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "ghost",
										disabled: busy,
										onClick: () => props.onRevoke(c),
										children: "Revoke"
									})]
								})
							})
						]
					}, c.id)), !edge?.credentials?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 5,
						className: "px-4 py-8 text-center text-sm text-fg-muted",
						children: "Mint a credential to get proxy URIs."
					}) })] })]
				})
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Authorize test source IP" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "mt-2 w-full max-w-xs rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm",
				value: props.testSourceIp,
				onChange: (e) => props.setTestSourceIp(e.target.value)
			})]
		}),
		(props.msg || props.err) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: cn("max-h-72 overflow-auto rounded-xl border px-4 py-3 text-xs", props.err ? "border-danger/40 bg-danger-soft/30 text-danger" : "border-border bg-bg text-fg-muted"),
			children: props.err || props.msg
		})
	] });
}
function StickyTable({ sessions }) {
	if (!sessions.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-4 py-6 text-sm text-fg-muted",
		children: "No sticky sessions yet."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-x-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full min-w-[640px] text-left text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "text-xs text-fg-subtle",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-2 font-medium",
							children: "Session"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-2 font-medium",
							children: "Device"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-2 font-medium",
							children: "Exit IP meta"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-2 font-medium",
							children: "Carrier"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-2 font-medium",
							children: "Hits"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-2 font-medium",
							children: "Status"
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-b border-border/60",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-2.5 font-mono text-xs",
						children: s.sessionId
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-2.5 font-mono text-[10px]",
						children: s.deviceId
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-2.5 font-mono text-[10px] text-fg-muted",
						children: s.exitIp || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-2.5 text-xs",
						children: s.carrier || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-2.5",
						children: s.hits
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-4 py-2.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: s.deviceOnline ? "success" : "danger",
							children: s.deviceOnline ? "online" : "offline"
						})
					})
				]
			}, s.key)) })]
		})
	});
}
function FleetSection({ edge, busy, onToggleExit, onRefresh }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Fleet & tunnels"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-fg-muted",
				children: "Reverse tunnels · lastPublicIp is metadata only"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "secondary",
				onClick: onRefresh,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" }), "Refresh"]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "overflow-hidden p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[800px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs text-fg-subtle",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Device"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Type"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Carrier / ASN"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "CC"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "IP meta"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Exit"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-2 font-medium",
									children: "Status"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (edge?.devices || []).map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/60",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-4 py-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: d.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-[10px] text-fg-subtle",
									children: d.deviceId
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									tone: d.ipType === "mobile" || d.network === "cellular" ? "primary" : "neutral",
									children: d.ipType || d.network
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-4 py-2.5 text-xs text-fg-muted",
								children: [
									d.carrier || "—",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[10px]",
										children: d.asn
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5",
								children: d.country
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5 font-mono text-[10px] text-fg-subtle",
								children: d.lastPublicIp || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy,
									onClick: () => onToggleExit(d, !d.exitEnabled),
									className: cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", d.exitEnabled ? "bg-success-soft text-success" : "bg-surface-3 text-fg-muted"),
									children: d.exitEnabled ? "Enabled" : "Disabled"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									tone: d.online ? "success" : "neutral",
									children: d.online ? "online" : "offline"
								})
							})
						]
					}, d.deviceId)) })]
				})
			})
		}),
		edge?.proxyListeners && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionLabel, { children: "Gate listeners" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "mt-2 overflow-auto text-[11px] text-fg-muted",
				children: JSON.stringify(edge.proxyListeners, null, 2)
			})]
		})
	] });
}
function Note({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-bg px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-semibold",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-[11px] leading-relaxed text-fg-muted",
			children: body
		})]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-fg-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-mono text-xl font-semibold tabular",
			children: value
		})]
	});
}
function CopyRow({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[10px] uppercase text-fg-subtle",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "break-all font-mono text-xs text-fg",
				children: value
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "shrink-0 rounded-lg border border-border p-1.5 text-fg-muted hover:text-fg",
			onClick: () => void navigator.clipboard.writeText(value),
			title: "Copy",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" })
		})]
	});
}
function UsersSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "text-2xl font-semibold tracking-tight",
		children: "Users"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "overflow-hidden p-0",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[640px] text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "text-xs text-fg-subtle",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-2 font-medium",
								children: "Phone"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-2 font-medium",
								children: "Name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-2 font-medium",
								children: "CC"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-2 font-medium text-right",
								children: "Balance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-2 font-medium text-right",
								children: "Lifetime"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-2 font-medium",
								children: "Devices"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-2 font-medium",
								children: "Status"
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: ADMIN_USERS.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-border/60",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-2.5 font-mono text-xs",
							children: u.phone
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-2.5",
							children: u.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-2.5 text-fg-muted",
							children: u.country
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-2.5 text-right",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
								cents: u.balance,
								size: "sm"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-2.5 text-right text-fg-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
								cents: u.lifetime,
								size: "sm"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-2.5",
							children: u.devices
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-2.5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: u.status === "active" ? "success" : "danger",
								children: u.status
							})
						})
					]
				}, u.phone)) })]
			})
		})
	})] });
}
function DevicesSection({ devices }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "text-2xl font-semibold tracking-tight",
		children: "Devices"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-3 sm:grid-cols-2",
		children: devices.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-semibold",
					children: d.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[11px] text-fg-subtle",
					children: d.deviceId
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					tone: d.online ? "success" : "neutral",
					children: d.online ? "online" : "offline"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs text-fg-muted",
				children: [
					d.ipType || d.network,
					" · ",
					d.country,
					" · ",
					d.carrier || "—"
				]
			})]
		}, d.deviceId))
	})] });
}
function WithdrawalsSection() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
		className: "text-2xl font-semibold tracking-tight",
		children: "Withdrawals"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2",
			children: ADMIN_WITHDRAWALS.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "rounded-xl border border-border bg-bg p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs text-fg-muted",
							children: w.phone
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Money, {
							cents: w.amount,
							size: "sm",
							className: "mt-1 block"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-[11px] text-fg-subtle",
							children: w.at
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: w.status === "paid" ? "success" : w.status === "pending" ? "warning" : "primary",
						children: w.status
					})]
				})
			}, w.id))
		})
	})] });
}
/**
* Operator admin console.
* Public site: https://portal.busyproxy.net (and /portal on main host for dev).
* Not linked from marketing navigation.
*/
function PortalPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-border/80 bg-bg/90 backdrop-blur-xl",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary",
						children: "BP"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold leading-none",
						children: "BusyProxy Portal"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] text-fg-subtle",
						children: "Operator console"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hidden text-xs text-fg-muted sm:block",
					children: "portal.busyproxy.net · not linked from marketing"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminDashboard, {})]
	});
}
//#endregion
export { PortalPage as component };
