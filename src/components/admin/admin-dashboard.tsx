import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Flag,
  LayoutDashboard,
  Loader2,
  LogOut,
  Network,
  Smartphone,
  Users,
  Wallet,
  Copy,
  Plus,
  RefreshCw,
  Shield,
  Link2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Money,
  SectionLabel,
} from "@/components/ui/primitives";
import { useOperatorSession } from "@/components/admin/operator-shell";
import {
  type AdminAppEvent,
  type AdminEventDeviceChip,
  type AdminJourneySummary,
  type AdminOverview,
  type AdminUserRow,
  type AdminWithdrawalRow,
  fetchAdminOverview,
  fetchDeviceEvents,
  fetchUserEvents,
} from "@/lib/admin-client";
import {
  type AdminSection,
  parseAdminSection,
} from "@/lib/admin-sections";
import {
  type DeviceProbeIpResult,
  type DeviceTrafficResult,
  type DeviceProxyAccess,
  type EdgeCredential,
  type EdgeDevice,
  type EdgeSnapshot,
  type FleetProxyAccess,
  type ProxyExitTestResult,
  type StickySession,
  connectCheck,
  fetchDeviceProxyAccess,
  fetchEdgeSnapshot,
  fetchFleetProxyAccess,
  fetchTrafficJob,
  mintCredential,
  patchCredential,
  probeDeviceIp,
  refreshDeviceGeo,
  releaseSticky,
  removeDevice,
  revokeCredential,
  runDeviceTraffic,
  setDeviceExit,
  testProxyExit,
} from "@/lib/edge-client";
import { cn } from "@/lib/utils";

type Section = AdminSection;

const nav: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "proxies", label: "Proxy access", icon: Link2 },
  { id: "gateway", label: "Fleet & tunnels", icon: Network },
  { id: "users", label: "Users", icon: Users },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "traffic", label: "Traffic", icon: Activity },
  { id: "withdrawals", label: "Withdrawals", icon: Wallet },
  { id: "risk", label: "Risk", icon: Flag },
];

export function AdminDashboard({
  section: sectionProp,
  operatorUser: operatorUserProp,
  onLogout: onLogoutProp,
}: {
  /** Preferred: from /portal/$section route param */
  section?: Section;
  operatorUser?: { phone?: string; displayName?: string | null } | null;
  onLogout?: () => void;
} = {}) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { section?: string };
  const operator = useOperatorSession();
  const operatorUser = operatorUserProp ?? operator?.user ?? null;
  const onLogout = onLogoutProp ?? operator?.onLogout;

  // URL path is source of truth: /portal/devices etc.
  const section = parseAdminSection(sectionProp ?? params.section);

  const goSection = useCallback(
    (id: Section) => {
      void navigate({
        to: "/portal/$section",
        params: { section: id },
      });
    },
    [navigate],
  );
  const [edge, setEdge] = useState<EdgeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  /** Per-device probe results / busy flags (independent jobs) */
  const [probeByDevice, setProbeByDevice] = useState<
    Record<string, DeviceProbeIpResult>
  >({});
  const [probeBusy, setProbeBusy] = useState<Record<string, boolean>>({});
  /** Per-device traffic job state — never share one spinner across devices */
  const [trafficByDevice, setTrafficByDevice] = useState<
    Record<string, DeviceTrafficResult>
  >({});
  const [trafficBusy, setTrafficBusy] = useState<Record<string, boolean>>({});
  const [minted, setMinted] = useState<{
    user: string;
    pass: string;
    id: string;
    endpoints?: EdgeCredential["endpoints"];
  } | null>(null);
  const [allowlistDraft, setAllowlistDraft] = useState("89.28.43.197");
  const [testSourceIp, setTestSourceIp] = useState("89.28.43.197");
  const [sessionId, setSessionId] = useState("mysession01");
  const [bindDevice, setBindDevice] = useState("");

  const reload = useCallback(async () => {
    try {
      const snap = await fetchEdgeSnapshot();
      setEdge(snap);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 8000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    if (!bindDevice && edge?.devices?.length) {
      const pref =
        edge.devices.find(
          (d) => d.online && (d.ipType === "mobile" || d.network === "cellular"),
        ) || edge.devices.find((d) => d.online);
      if (pref) setBindDevice(pref.deviceId);
    }
  }, [edge, bindDevice]);

  const run = async (fn: () => Promise<void>) => {
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

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1400px]">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-bg-elevated p-4 lg:flex">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          BusyProxy Portal
        </p>
        <nav className="mt-6 space-y-0.5">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => goSection(n.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                section === n.id
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </nav>
        {onLogout && (
          <div className="mt-auto border-t border-border pt-4">
            {operatorUser?.phone && (
              <p className="mb-2 truncate font-mono text-[11px] text-fg-muted">
                {operatorUser.phone}
              </p>
            )}
            <button
              type="button"
              onClick={onLogout}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface hover:text-fg",
              )}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 lg:hidden">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => goSection(n.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  section === n.id ? "bg-surface text-fg" : "text-fg-muted",
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
          {onLogout && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="ml-auto lg:hidden"
              onClick={onLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </Button>
          )}
        </div>

        {section === "overview" && <OverviewSection edge={edge} />}
        {section === "proxies" && (
          <ProxyAccessSection
            edge={edge}
            busy={busy}
            msg={msg}
            err={err}
            minted={minted}
            allowlistDraft={allowlistDraft}
            testSourceIp={testSourceIp}
            sessionId={sessionId}
            bindDevice={bindDevice}
            setAllowlistDraft={setAllowlistDraft}
            setTestSourceIp={setTestSourceIp}
            setSessionId={setSessionId}
            setBindDevice={setBindDevice}
            onRefresh={() => void run(async () => {})}
            onMint={() =>
              void run(async () => {
                const ips = allowlistDraft
                  .split(/[\s,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const cred = await mintCredential({
                  label: "Mobile rotating/sticky",
                  allowlistIps: ips,
                  defaultMode: "rotate",
                  defaultType: "mobile",
                });
                if (cred.password) {
                  setMinted({
                    user: cred.username,
                    pass: cred.password,
                    id: cred.id,
                    endpoints: cred.endpoints,
                  });
                }
                setMsg(`Minted ${cred.username} (mobile pool default)`);
              })
            }
            onTest={(mode) =>
              void run(async () => {
                if (!minted) throw new Error("Mint a credential first");
                const user =
                  mode === "sticky"
                    ? `${minted.user}-session-${sessionId}-type-mobile-mode-sticky`
                    : `${minted.user}-type-mobile-mode-rotate`;
                const result = await connectCheck({
                  username: user,
                  password: minted.pass,
                  sourceIp: testSourceIp,
                  targetHost: "busyproxy.net",
                });
                setMsg(JSON.stringify(result, null, 2));
              })
            }
            onRelease={() =>
              void run(async () => {
                if (!minted) throw new Error("Mint first");
                await releaseSticky({
                  username: minted.user,
                  sessionId,
                });
                setMsg(`Released sticky session ${sessionId}`);
              })
            }
            onToggleExit={(d, enabled) =>
              void run(async () => {
                await setDeviceExit(d.deviceId, enabled);
                setMsg(`${d.name}: exit ${enabled ? "on" : "off"}`);
              })
            }
            onRevoke={(c) =>
              void run(async () => {
                await revokeCredential(c.id);
                if (minted?.id === c.id) setMinted(null);
                setMsg(`Revoked ${c.username}`);
              })
            }
            onPatchAllowlist={(c) =>
              void run(async () => {
                await patchCredential(c.id, {
                  allowlistIps: allowlistDraft
                    .split(/[\s,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                });
                setMsg("Allowlist updated");
              })
            }
          />
        )}
        {section === "gateway" && (
          <FleetSection
            edge={edge}
            busy={busy}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              goSection("devices");
            }}
            onToggleExit={(d, enabled) =>
              void run(async () => {
                await setDeviceExit(d.deviceId, enabled);
              })
            }
            onRefresh={() => void run(async () => {})}
          />
        )}
        {section === "users" && (
          <UsersSection
            devices={edge?.devices || []}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              goSection("devices");
            }}
          />
        )}
        {section === "devices" && (
          <DevicesSection
            devices={edge?.devices || []}
            selectedId={selectedDeviceId}
            probeByDevice={probeByDevice}
            probeBusy={probeBusy}
            trafficByDevice={trafficByDevice}
            trafficBusy={trafficBusy}
            err={err}
            onSelect={(id) => {
              setSelectedDeviceId(id);
              setErr(null);
            }}
            onCloseDetail={() => {
              setSelectedDeviceId(null);
            }}
            onToggleExit={(d, enabled) =>
              void run(async () => {
                await setDeviceExit(d.deviceId, enabled);
              })
            }
            onProbeIp={(d) =>
              void (async () => {
                const id = d.deviceId;
                setProbeBusy((p) => ({ ...p, [id]: true }));
                setErr(null);
                try {
                  const r = await probeDeviceIp(id);
                  setProbeByDevice((p) => ({ ...p, [id]: r }));
                  // Refresh geo for this IP (city/country/ISP)
                  try {
                    await refreshDeviceGeo(id);
                  } catch {
                    /* optional */
                  }
                  setMsg(
                    `${d.name}: ` +
                      (r.match === true
                        ? `IP match ${r.seenIp}`
                        : r.seenIp
                          ? `Seen ${r.seenIp} (expected ${r.expectedEgressIp || "—"})`
                          : "Probe finished"),
                  );
                  await reload();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                } finally {
                  setProbeBusy((p) => ({ ...p, [id]: false }));
                }
              })()
            }
            onTraffic={(d, opts) =>
              void (async () => {
                const id = d.deviceId;
                const targetMb = opts?.targetMb ?? 100;
                const durationSec =
                  opts?.durationSec ??
                  (targetMb >= 1024 ? 3600 : targetMb >= 500 ? 900 : 180);
                const label =
                  targetMb >= 1024 ? "1 GB" : `~${targetMb} MB`;
                // Only this device is busy — other devices stay free
                setTrafficBusy((p) => ({ ...p, [id]: true }));
                setErr(null);
                try {
                  const started = await runDeviceTraffic(id, {
                    durationSec,
                    targetMb,
                    chunkMb: targetMb >= 1024 ? 2 : 1.5,
                    // ~10 concurrent CONNECTs → phone Streams should spike
                    parallel: 10,
                  });
                  setTrafficByDevice((p) => ({ ...p, [id]: started }));
                  setMsg(
                    `${d.name}: traffic started (${started.jobId || "—"}) · ${label} · 10 parallel streams`,
                  );
                  const jobId = started.jobId;
                  if (!jobId) return;
                  // Poll until done — longer window for 1 GB jobs
                  const pollMs =
                    targetMb >= 1024
                      ? 70 * 60 * 1000
                      : targetMb >= 500
                        ? 20 * 60 * 1000
                        : 8 * 60 * 1000;
                  const deadline = Date.now() + pollMs;
                  while (Date.now() < deadline) {
                    await new Promise((r) => setTimeout(r, 2000));
                    const j = await fetchTrafficJob(jobId);
                    setTrafficByDevice((p) => ({ ...p, [id]: j }));
                    await reload();
                    const mb = j.progress?.mb ?? 0;
                    setMsg(
                      `${d.name}: ${j.status} · ${mb} MB · ${j.progress?.okCount ?? 0} ok · ${Math.round((j.progress?.elapsedMs || 0) / 1000)}s`,
                    );
                    if (
                      j.status === "done" ||
                      j.status === "error" ||
                      j.status === "cancelled"
                    ) {
                      break;
                    }
                  }
                  await reload();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : String(e));
                } finally {
                  setTrafficBusy((p) => ({ ...p, [id]: false }));
                }
              })()
            }
            onRemove={(d) =>
              void run(async () => {
                await removeDevice(d.deviceId);
                if (selectedDeviceId === d.deviceId) setSelectedDeviceId(null);
                setMsg(`Removed ${d.name}`);
              })
            }
            onRefresh={() => void run(async () => {})}
          />
        )}
        {section === "traffic" && (
          <Card className="p-5">
            <SectionLabel>Live edge events</SectionLabel>
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {(edge?.events || []).map((ev) => (
                <li
                  key={String(ev.id)}
                  className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[11px] text-fg-muted"
                >
                  {JSON.stringify(ev)}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {section === "withdrawals" && <WithdrawalsSection />}
        {section === "risk" && (
          <Card className="p-5">
            <SectionLabel>Risk</SectionLabel>
            <p className="mt-2 text-sm text-fg-muted">
              Disable exit on abused devices without showing proxy details to
              earners. Prefer type=mobile only so Wi‑Fi residential cannot enter
              “mobile” product SKUs.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}

function OverviewSection({ edge }: { edge: EdgeSnapshot | null }) {
  const devices = edge?.devices ?? [];
  const online = devices.filter((d) => d.online).length;
  const users = new Set(devices.map((d) => d.userId).filter(Boolean)).size;
  const creds = edge?.credentials?.length ?? 0;
  const [admin, setAdmin] = useState<AdminOverview | null>(null);

  useEffect(() => {
    void fetchAdminOverview()
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  const liveKpis = [
    { label: "Devices (all users)", value: String(devices.length) },
    { label: "Online now", value: String(edge?.stats.online ?? online) },
    {
      label: "Mobile online",
      value: String(edge?.stats.mobileOnline ?? "—"),
    },
    { label: "Distinct users (fleet)", value: String(users) },
    { label: "Proxy credentials", value: String(edge?.stats.credentials ?? creds) },
    {
      label: "Sticky sessions",
      value: String(edge?.stats.stickySessions ?? "—"),
    },
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Operator overview
        </h1>
        <p className="text-sm text-fg-muted">
          Platform console: all earners, devices, and payouts — not a single-user
          wallet
        </p>
      </div>
      {admin && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Registered users</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular">
              {admin.totals.users}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Available (all wallets)</p>
            <Money cents={admin.totals.walletsAvailableCents} size="md" className="mt-1 block" />
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Paid withdrawals</p>
            <Money cents={admin.totals.paidWithdrawCents} size="md" className="mt-1 block" />
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Pending withdrawals</p>
            <Money cents={admin.totals.pendingWithdrawCents} size="md" className="mt-1 block" />
          </Card>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {liveKpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-fg-muted">{k.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular">
              {k.value}
            </p>
          </Card>
        ))}
      </div>
      {!edge && (
        <Card className="p-4">
          <p className="text-sm text-fg-muted">
            Loading live edge status… If this stays empty, check{" "}
            <code className="text-fg">/api/edge/status</code> on this host.
          </p>
        </Card>
      )}
      <Card className="p-5">
        <SectionLabel>How to use this console</SectionLabel>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-fg-muted">
          <li>
            <strong className="text-fg">Fleet &amp; tunnels</strong> — every
            enrolled phone (all users), online/offline, exit toggle
          </li>
          <li>
            <strong className="text-fg">Devices</strong> — same fleet as cards
          </li>
          <li>
            <strong className="text-fg">Proxy access</strong> — mint operator
            credentials (sticky / rotate); earners never see these URIs
          </li>
        </ul>
      </Card>
    </>
  );
}

function ProxyAccessSection(props: {
  edge: EdgeSnapshot | null;
  busy: boolean;
  msg: string | null;
  err: string | null;
  minted: {
    user: string;
    pass: string;
    id: string;
    endpoints?: EdgeCredential["endpoints"];
  } | null;
  allowlistDraft: string;
  testSourceIp: string;
  sessionId: string;
  bindDevice: string;
  setAllowlistDraft: (s: string) => void;
  setTestSourceIp: (s: string) => void;
  setSessionId: (s: string) => void;
  setBindDevice: (s: string) => void;
  onRefresh: () => void;
  onMint: () => void;
  onTest: (mode: "rotate" | "sticky") => void;
  onRelease: () => void;
  onToggleExit: (d: EdgeDevice, enabled: boolean) => void;
  onRevoke: (c: EdgeCredential) => void;
  onPatchAllowlist: (c: EdgeCredential) => void;
}) {
  const { edge, minted, busy } = props;
  const arch = edge?.architecture;
  const gate = arch?.hosts?.gateHttp || "gate.busyproxy.net:18080";
  const socks = arch?.hosts?.gateSocks || "gate.busyproxy.net:11080";

  const rotateUser = minted
    ? `${minted.user}-type-mobile-mode-rotate`
    : "bp_USER-type-mobile-mode-rotate";
  const stickyUser = minted
    ? `${minted.user}-session-${props.sessionId}-type-mobile-mode-sticky`
    : `bp_USER-session-${props.sessionId}-type-mobile-mode-sticky`;
  const pass = minted?.pass || "PASSWORD";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Proxy access
          </h1>
          <p className="text-sm text-fg-muted">
            Stable gate URI · rotating vs sticky · mobile pool by default
          </p>
        </div>
        <Button size="sm" variant="secondary" disabled={busy} onClick={props.onRefresh}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      <Card className="p-5">
        <SectionLabel>Operator rules</SectionLabel>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Note
            title="Never dial phone IP"
            body="Customers only hit gate.busyproxy.net. Phones open reverse tunnels. Mobile IP changes do not change your URI."
          />
          <Note
            title="Rotating"
            body="No session (or mode=rotate): each connect picks a healthy cellular exit. If that phone drops, the next request auto-uses another."
          />
          <Note
            title="Sticky"
            body="session-{id} pins one device. If offline → error (no silent IP swap). Change session id manually for a new sticky IP."
          />
        </div>
        <p className="mt-4 text-sm text-fg-muted">
          <strong className="text-fg">Mobile by default:</strong>{" "}
          {arch?.mobileByDefault ||
            "type=mobile uses only cellular exits so proxy checkers classify carrier/mobile."}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <CopyRow label="HTTP gate" value={gate} />
          <CopyRow label="SOCKS5 gate" value={socks} />
        </div>
        <p className="mt-2 font-mono text-[11px] text-fg-subtle">
          Grammar: {arch?.usernameGrammar}
        </p>
      </Card>

      <Card className="p-5">
        <SectionLabel>1. Mint credential</SectionLabel>
        <p className="mt-2 text-xs text-fg-muted">
          Password shown once. Earner never sees this. Default type=mobile,
          mode=rotate.
        </p>
        <label className="mt-3 block text-xs text-fg-muted">
          Source IP allowlist
          <input
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm"
            value={props.allowlistDraft}
            onChange={(e) => props.setAllowlistDraft(e.target.value)}
          />
        </label>
        <div className="mt-3">
          <Button disabled={busy} onClick={props.onMint}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Mint mobile credential
          </Button>
        </div>
        {minted && (
          <div className="mt-4 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">
              Store password in vault — shown once
            </p>
            <CopyRow label="Base user" value={minted.user} />
            <CopyRow label="Password" value={minted.pass} />
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Badge tone="primary">Rotating</Badge>
            <SectionLabel>Mobile pool</SectionLabel>
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            Auto re-route when a phone disconnects. New connection → next healthy
            cellular exit.
          </p>
          <div className="mt-3 space-y-2">
            <CopyRow
              label="HTTP URI"
              value={`http://${rotateUser}:${pass}@${gate}`}
            />
            <CopyRow
              label="SOCKS5 URI"
              value={`socks5://${rotateUser}:${pass}@${socks}`}
            />
            <CopyRow
              label="curl"
              value={`curl -x http://${rotateUser}:${pass}@${gate} https://busyproxy.net/api/whoami`}
            />
          </div>
          <Button
            className="mt-4"
            size="sm"
            variant="secondary"
            disabled={busy || !minted}
            onClick={() => props.onTest("rotate")}
          >
            Test rotating route
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Badge tone="success">Sticky</Badge>
            <SectionLabel>Single exit</SectionLabel>
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            Same session id → same device. Offline → hard fail (change session
            for a new sticky IP).
          </p>
          <label className="mt-3 block text-xs text-fg-muted">
            Session id
            <input
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm"
              value={props.sessionId}
              onChange={(e) => props.setSessionId(e.target.value)}
            />
          </label>
          <div className="mt-3 space-y-2">
            <CopyRow
              label="HTTP URI"
              value={`http://${stickyUser}:${pass}@${gate}`}
            />
            <CopyRow
              label="SOCKS5 URI"
              value={`socks5://${stickyUser}:${pass}@${socks}`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !minted}
              onClick={() => props.onTest("sticky")}
            >
              Test sticky route
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || !minted}
              onClick={props.onRelease}
            >
              Release session
            </Button>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <SectionLabel>Active sticky sessions</SectionLabel>
        </div>
        <StickyTable sessions={edge?.stickySessions || []} />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <SectionLabel>Credentials</SectionLabel>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Defaults</th>
                <th className="px-4 py-2 font-medium">Allowlist</th>
                <th className="px-4 py-2 font-medium">Uses</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(edge?.credentials || []).map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="px-4 py-2.5 font-mono text-xs">{c.username}</td>
                  <td className="px-4 py-2.5 text-xs text-fg-muted">
                    {c.defaultType}/{c.defaultMode}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-fg-muted">
                    {c.allowlistIps.length ? c.allowlistIps.join(", ") : "any"}
                  </td>
                  <td className="px-4 py-2.5">{c.useCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => props.onPatchAllowlist(c)}
                      >
                        <Shield className="h-3 w-3" />
                        Allowlist
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => props.onRevoke(c)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!edge?.credentials?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-muted">
                    Mint a credential to get proxy URIs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <SectionLabel>Authorize test source IP</SectionLabel>
        <input
          className="mt-2 w-full max-w-xs rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm"
          value={props.testSourceIp}
          onChange={(e) => props.setTestSourceIp(e.target.value)}
        />
      </Card>

      <LiveExitTestSection
        edge={edge}
        minted={minted}
        sessionId={props.sessionId}
        setSessionId={props.setSessionId}
        onAfterTest={() => props.onRefresh()}
      />

      {(props.msg || props.err) && (
        <pre
          className={cn(
            "max-h-72 overflow-auto rounded-xl border px-4 py-3 text-xs",
            props.err
              ? "border-danger/40 bg-danger-soft/30 text-danger"
              : "border-border bg-bg text-fg-muted",
          )}
        >
          {props.err || props.msg}
        </pre>
      )}
    </>
  );
}

function LiveExitTestSection(props: {
  edge: EdgeSnapshot | null;
  minted: {
    user: string;
    pass: string;
    id: string;
    endpoints?: EdgeCredential["endpoints"];
  } | null;
  sessionId: string;
  setSessionId: (s: string) => void;
  onAfterTest: () => void;
}) {
  const { edge, minted } = props;
  const creds = edge?.credentials || [];
  const devices = edge?.devices || [];
  const online = devices.filter((d) => d.online);

  const [credId, setCredId] = useState<string>("");
  const [mode, setMode] = useState<"sticky" | "rotate">("sticky");
  const [poolType, setPoolType] = useState<"any" | "mobile" | "residential">(
    "any",
  );
  const [deviceId, setDeviceId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProxyExitTestResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Prefer minted / latest cred
  useEffect(() => {
    if (credId) return;
    if (minted?.id) setCredId(minted.id);
    else if (creds[0]?.id) setCredId(creds[0].id);
  }, [minted, creds, credId]);

  useEffect(() => {
    if (deviceId) return;
    const pref =
      online.find(
        (d) => d.network === "cellular" || d.ipType === "mobile",
      ) || online[0];
    if (pref) setDeviceId(pref.deviceId);
  }, [online, deviceId]);

  const selectedCred =
    creds.find((c) => c.id === credId) ||
    (minted?.id === credId
      ? ({
          id: minted.id,
          username: minted.user,
          password: minted.pass,
        } as EdgeCredential)
      : null);

  const runTest = async (opts?: {
    pinDevice?: boolean;
    forceMode?: "sticky" | "rotate";
  }) => {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const m = opts?.forceMode || mode;
      let body: Parameters<typeof testProxyExit>[0];

      if (opts?.pinDevice) {
        if (!deviceId) throw new Error("Pick a phone to pin");
        body = {
          deviceId,
          mode: "sticky",
          type: poolType,
          sessionId: props.sessionId || "phonetest1",
        };
      } else {
        const pass =
          selectedCred?.password ||
          (minted && selectedCred?.username === minted.user
            ? minted.pass
            : null) ||
          minted?.pass;
        const baseUser = selectedCred?.username || minted?.user;
        if (!baseUser || !pass) {
          throw new Error(
            "Mint a credential (or pick one with a known password) first",
          );
        }
        body = {
          credentialId: selectedCred?.id || minted?.id,
          username: baseUser,
          password: pass,
          mode: m,
          type: poolType,
          sessionId:
            m === "sticky"
              ? props.sessionId || "mysession01"
              : undefined,
        };
      }

      const r = await testProxyExit(body);
      setResult(r);
      props.onAfterTest();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cls = result?.classification;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>2. Live exit test</SectionLabel>
          <p className="mt-1 max-w-2xl text-xs text-fg-muted">
            Runs traffic through the real HTTP gate (sticky or rotate), then
            checks exit IP and geo via{" "}
            <code className="text-fg">busyproxy.net/api/whoami</code>.
            Switch a phone to mobile data, wait until Fleet shows{" "}
            <strong className="text-fg">cellular</strong>, re-test — ASN/org
            should show the carrier, not Wi‑Fi ISP.
          </p>
        </div>
      </div>

      {/* Fleet network snapshot */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-fg-subtle">
            Online phones
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {online.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-fg-subtle">
            Cellular
          </p>
          <p className="text-lg font-semibold tabular-nums text-success">
            {
              online.filter(
                (d) => d.network === "cellular" || d.ipType === "mobile",
              ).length
            }
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-fg-subtle">
            Wi‑Fi
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {
              online.filter(
                (d) => d.network === "wifi" || d.ipType === "residential",
              ).length
            }
          </p>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Device</th>
                <th className="px-3 py-2 font-medium">Net</th>
                <th className="px-3 py-2 font-medium">Exit IP</th>
                <th className="px-3 py-2 font-medium">Geo / ISP</th>
                <th className="px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr
                  key={d.deviceId}
                  className={cn(
                    "border-b border-border/50",
                    deviceId === d.deviceId && "bg-primary/5",
                  )}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => setDeviceId(d.deviceId)}
                    >
                      {d.name}
                    </button>
                    <span
                      className={cn(
                        "ml-2 inline-block h-1.5 w-1.5 rounded-full",
                        d.online ? "bg-success" : "bg-fg-subtle",
                      )}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {d.network || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">
                    {d.lastPublicIp || "—"}
                  </td>
                  <td className="px-3 py-2 text-fg-muted">
                    {[d.city, d.countryName || d.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                    {d.isp ? ` · ${d.isp}` : ""}
                    {d.asn ? ` · ${d.asn}` : ""}
                  </td>
                  <td className="px-3 py-2">{d.ipType || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-fg-muted">
          Credential
          <select
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            value={credId}
            onChange={(e) => setCredId(e.target.value)}
          >
            <option value="">— select —</option>
            {minted && !creds.some((c) => c.id === minted.id) && (
              <option value={minted.id}>
                {minted.user} (just minted)
              </option>
            )}
            {creds.map((c) => (
              <option key={c.id} value={c.id}>
                {c.username}
                {c.password ? "" : " (no pass in mem)"} — {c.defaultType}/
                {c.defaultMode}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-fg-muted">
          Mode
          <select
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            value={mode}
            onChange={(e) =>
              setMode(e.target.value === "sticky" ? "sticky" : "rotate")
            }
          >
            <option value="sticky">Sticky (pin session)</option>
            <option value="rotate">Rotating (pool)</option>
          </select>
        </label>
        <label className="block text-xs text-fg-muted">
          Pool type
          <select
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            value={poolType}
            onChange={(e) =>
              setPoolType(
                e.target.value as "any" | "mobile" | "residential",
              )
            }
          >
            <option value="any">any (Wi‑Fi + cellular)</option>
            <option value="mobile">mobile (cellular only)</option>
            <option value="residential">residential (Wi‑Fi only)</option>
          </select>
        </label>
        <label className="block text-xs text-fg-muted">
          Sticky session id
          <input
            className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm"
            value={props.sessionId}
            onChange={(e) => props.setSessionId(e.target.value)}
            disabled={mode === "rotate"}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() => void runTest({ forceMode: "sticky" })}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Network className="h-4 w-4" />
          )}
          Test sticky exit
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void runTest({ forceMode: "rotate" })}
        >
          Test rotate exit
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !deviceId}
          onClick={() => void runTest({ pinDevice: true })}
        >
          Test selected phone
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => props.onAfterTest()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh fleet
        </Button>
      </div>

      {err && (
        <p className="mt-3 rounded-xl border border-danger/40 bg-danger-soft/30 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              result.ok
                ? "border-success/40 bg-success/5"
                : "border-danger/40 bg-danger-soft/20",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={result.ok ? "success" : "danger"}>
                {result.ok ? "PASS" : "FAIL"}
              </Badge>
              <span className="text-sm font-medium">
                {result.matchNote}
              </span>
              {result.durationMs != null && (
                <span className="text-xs text-fg-subtle">
                  {result.durationMs} ms
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Meta label="Exit IP" value={result.seenIp || "—"} mono />
              <Meta
                label="Mode / type"
                value={`${result.mode || "—"} · ${result.type || "—"}`}
              />
              <Meta
                label="Looks mobile?"
                value={
                  cls?.looksMobile
                    ? "Yes (carrier-like)"
                    : cls?.deviceNetwork === "wifi"
                      ? "No (Wi‑Fi / residential)"
                      : "—"
                }
              />
              <Meta
                label="Phone network"
                value={
                  result.device
                    ? `${result.device.name} · ${result.device.network}/${result.device.ipType}`
                    : "—"
                }
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-bg p-4">
              <SectionLabel>Exit classification</SectionLabel>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Meta
                  label="IP"
                  value={String(cls?.ip || result.seenIp || "—")}
                  mono
                />
                <Meta
                  label="Country"
                  value={String(cls?.country || cls?.countryCode || "—")}
                />
                <Meta label="City" value={String(cls?.city || "—")} />
                <Meta label="ASN" value={String(cls?.asn || "—")} mono />
                <Meta
                  label="Org / ISP"
                  value={String(cls?.org || cls?.isp || "—")}
                />
                <Meta label="Region" value={String(cls?.region || "—")} />
              </div>
              {cls && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-border/60 bg-bg-elevated p-2 font-mono text-[10px] text-fg-muted">
                  {JSON.stringify(cls, null, 2)}
                </pre>
              )}
              {!cls && (
                <p className="mt-2 text-xs text-fg-muted">
                  No classification yet. Re-run the test with a phone sharing
                  on.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-bg p-4">
              <SectionLabel>Copy for your client</SectionLabel>
              <div className="mt-3 space-y-2">
                {result.endpoints?.http && (
                  <CopyRow
                    label="HTTP URI"
                    value={result.endpoints.http}
                  />
                )}
                {result.endpoints?.curlWhoami && (
                  <CopyRow
                    label="curl whoami (BusyProxy)"
                    value={result.endpoints.curlWhoami}
                  />
                )}
                {result.username && (
                  <CopyRow label="Full username" value={result.username} />
                )}
              </div>
              {result.note && (
                <p className="mt-3 text-xs text-fg-muted">{result.note}</p>
              )}
              {result.error && (
                <p className="mt-2 text-xs text-danger">{result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function Meta(props: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-fg-subtle">
        {props.label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm text-fg",
          props.mono && "font-mono text-xs",
        )}
      >
        {props.value}
      </p>
    </div>
  );
}

function StickyTable({ sessions }: { sessions: StickySession[] }) {
  if (!sessions.length) {
    return (
      <p className="px-4 py-6 text-sm text-fg-muted">No sticky sessions yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs text-fg-subtle">
          <tr className="border-b border-border">
            <th className="px-4 py-2 font-medium">Session</th>
            <th className="px-4 py-2 font-medium">Device</th>
            <th className="px-4 py-2 font-medium">Exit IP meta</th>
            <th className="px-4 py-2 font-medium">Carrier</th>
            <th className="px-4 py-2 font-medium">Hits</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.key} className="border-b border-border/60">
              <td className="px-4 py-2.5 font-mono text-xs">{s.sessionId}</td>
              <td className="px-4 py-2.5 font-mono text-[10px]">{s.deviceId}</td>
              <td className="px-4 py-2.5 font-mono text-[10px] text-fg-muted">
                {s.exitIp || "—"}
              </td>
              <td className="px-4 py-2.5 text-xs">{s.carrier || "—"}</td>
              <td className="px-4 py-2.5">{s.hits}</td>
              <td className="px-4 py-2.5">
                <Badge tone={s.deviceOnline ? "success" : "danger"}>
                  {s.deviceOnline ? "online" : "offline"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FleetSection({
  edge,
  busy,
  onToggleExit,
  onRefresh,
  onSelectDevice,
}: {
  edge: EdgeSnapshot | null;
  busy: boolean;
  onToggleExit: (d: EdgeDevice, enabled: boolean) => void;
  onRefresh: () => void;
  onSelectDevice: (id: string) => void;
}) {
  const devices = edge?.devices || [];
  return (
    <>
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fleet & tunnels
          </h1>
          <p className="text-sm text-fg-muted">
            Real phones only (agent hello) · click a row for probe / traffic
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      {devices.length === 0 ? (
        <Card className="p-8 text-center text-sm text-fg-muted">
          No real devices enrolled. Start sharing from the Android app — mock
          fleet has been removed.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-xs text-fg-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-medium">Device</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">IP meta</th>
                  <th className="px-4 py-2 font-medium">Exit</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr
                    key={d.deviceId}
                    className="cursor-pointer border-b border-border/60 hover:bg-surface/60"
                    onClick={() => onSelectDevice(d.deviceId)}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{d.name}</p>
                      <p className="font-mono text-[10px] text-fg-subtle">
                        {d.deviceId}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px]">
                      {d.userId || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        tone={
                          d.ipType === "mobile" || d.network === "cellular"
                            ? "primary"
                            : "neutral"
                        }
                      >
                        {d.ipType || d.network}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-fg-subtle">
                      {d.lastPublicIp || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExit(d, !d.exitEnabled);
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                          d.exitEnabled
                            ? "bg-success-soft text-success"
                            : "bg-surface-3 text-fg-muted",
                        )}
                      >
                        {d.exitEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={d.online ? "success" : "neutral"}>
                        {d.online ? "online" : "offline"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {edge?.proxyListeners && (
        <Card className="p-4">
          <SectionLabel>Gate listeners</SectionLabel>
          <pre className="mt-2 overflow-auto text-[11px] text-fg-muted">
            {JSON.stringify(edge.proxyListeners, null, 2)}
          </pre>
        </Card>
      )}
    </>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-3">
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular">{value}</p>
    </Card>
  );
}

/**
 * Admin-only rotating fleet URI — any online phone, any network.
 * Not shown to earners.
 */
function FleetProxyUriCard({ onlineCount }: { onlineCount: number }) {
  const [access, setAccess] = useState<FleetProxyAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchFleetProxyAccess();
      setAccess(data);
    } catch (e) {
      setAccess(null);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, onlineCount]);

  const http =
    access?.http ||
    access?.endpoints?.httpDisplay ||
    access?.endpoints?.http ||
    "";
  const socks =
    access?.socks5 ||
    access?.endpoints?.socks5Display ||
    access?.endpoints?.socks5 ||
    "";
  const fullUser =
    access?.endpoints?.username ||
    (access
      ? `${access.username}-type-any-mode-rotate`
      : "");

  const copyHttp = async () => {
    if (!http) return;
    await navigator.clipboard.writeText(http);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="border-primary/30 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SectionLabel>Fleet proxy (admin only)</SectionLabel>
            <Badge tone="warning">operators only</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-fg-muted">
            One global rotating URI across <strong className="text-fg">all
            online devices</strong> (any user, Wi‑Fi or mobile). Earners never
            see this — mint/copy only from this console.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          <Button
            size="sm"
            disabled={!http || busy}
            onClick={() => void copyHttp()}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied HTTP" : "Copy HTTP URI"}
          </Button>
        </div>
      </div>

      {err && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {err}
        </p>
      )}

      {busy && !access && (
        <p className="mt-3 flex items-center gap-2 text-xs text-fg-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading fleet URI…
        </p>
      )}

      {access && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={access.ready ? "success" : "warning"}>
              {access.ready ? "ready" : "no exits online"}
            </Badge>
            <span className="text-[11px] text-fg-subtle">
              type-any · rotate · {access.onlineCount ?? onlineCount} online
            </span>
          </div>
          {access.readyNote && (
            <p className="text-[11px] text-fg-muted">{access.readyNote}</p>
          )}
          {http && <CopyRow label="HTTP (fleet · any network)" value={http} />}
          {socks && (
            <CopyRow label="SOCKS5 (fleet · any network)" value={socks} />
          )}
          {access.password && fullUser && (
            <>
              <CopyRow label="Username" value={fullUser} />
              <CopyRow label="Password" value={access.password} />
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Auto-loads one sticky proxy URI pinned to this device.
 * type=any — same URI works on Wi‑Fi or mobile; exit IP follows the phone tunnel.
 */
function DeviceProxyUriCard({
  device,
  compact,
}: {
  device: EdgeDevice;
  compact?: boolean;
}) {
  const [access, setAccess] = useState<DeviceProxyAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchDeviceProxyAccess(device.deviceId);
      setAccess(data);
    } catch (e) {
      setAccess(null);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [device.deviceId]);

  useEffect(() => {
    void load();
  }, [load, device.online, device.exitEnabled, device.network, device.ipType]);

  const http =
    access?.http ||
    access?.endpoints?.httpDisplay ||
    access?.endpoints?.http ||
    "";
  const socks =
    access?.socks5 ||
    access?.endpoints?.socks5Display ||
    access?.endpoints?.socks5 ||
    "";
  const fullUser =
    access?.endpoints?.username ||
    (access
      ? `${access.username}-session-${access.sessionId}-type-any-mode-sticky`
      : "");
  const netNow =
    access?.networkNow ||
    (device.ipType === "mobile" || device.network === "cellular"
      ? "mobile"
      : device.network === "wifi" || device.ipType === "residential"
        ? "wifi"
        : device.network || "—");

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-4",
        compact && "p-3",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <SectionLabel>Proxy for this device</SectionLabel>
          <p className="mt-1 text-xs text-fg-muted">
            <strong className="font-medium text-fg">One URI</strong> pinned to{" "}
            <span className="font-medium text-fg">{device.name}</span>
            {" · "}
            works on <strong className="text-fg">Wi‑Fi or mobile</strong>
            {device.online && device.exitEnabled
              ? " · ready while online"
              : " · needs sharing on"}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh URI
        </Button>
      </div>

      {err && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {err}
        </p>
      )}

      {busy && !access && (
        <p className="mt-3 flex items-center gap-2 text-xs text-fg-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparing device proxy…
        </p>
      )}

      {access && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={access.ready ? "success" : "warning"}>
              {access.ready ? "ready" : "not ready"}
            </Badge>
            <span className="text-[11px] text-fg-subtle">
              type-any · sticky · phone now on {netNow} · session{" "}
              {access.sessionId}
            </span>
          </div>
          {access.readyNote && (
            <p className="text-[11px] text-fg-muted">{access.readyNote}</p>
          )}
          {http && <CopyRow label="HTTP proxy (any network)" value={http} />}
          {socks && <CopyRow label="SOCKS5 (any network)" value={socks} />}
          {access.username && access.password && (
            <>
              <CopyRow label="Username" value={fullUser} />
              <CopyRow label="Password" value={access.password} />
            </>
          )}
          {access.curlExample && (
            <CopyRow label="curl whoami" value={access.curlExample} />
          )}
          <p className="text-[10px] text-fg-subtle">
            Exit IP follows this phone’s tunnel ({netNow}). Same URI if the
            device switches Wi‑Fi ↔ mobile.
          </p>
        </div>
      )}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase text-fg-subtle">{label}</p>
        <p className="break-all font-mono text-xs text-fg">{value}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg border border-border p-1.5 text-fg-muted hover:text-fg"
        onClick={() => void navigator.clipboard.writeText(value)}
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function UsersSection({
  devices,
  onSelectDevice,
}: {
  devices: EdgeDevice[];
  onSelectDevice: (id: string) => void;
}) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [totals, setTotals] = useState<AdminOverview["totals"] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [logsUserId, setLogsUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AdminAppEvent[]>([]);
  const [journey, setJourney] = useState<AdminJourneySummary | null>(null);
  const [logsMeta, setLogsMeta] = useState<{
    source: string;
    retentionDays: number;
  } | null>(null);
  const [logsBusy, setLogsBusy] = useState(false);
  const [logsErr, setLogsErr] = useState<string | null>(null);
  /** null = all phones for this user */
  const [logsDeviceFilter, setLogsDeviceFilter] = useState<string | null>(null);
  const [logsInstallFilter, setLogsInstallFilter] = useState<string | null>(
    null,
  );
  const [logsDeviceChips, setLogsDeviceChips] = useState<
    AdminEventDeviceChip[]
  >([]);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchAdminOverview();
      setRows(data.users);
      setTotals(data.totals);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const loadLogs = useCallback(
    async (
      userId: string,
      filter?: { deviceId?: string | null; installId?: string | null },
    ) => {
      setLogsBusy(true);
      setLogsErr(null);
      try {
        const data = await fetchUserEvents(userId, {
          limit: 250,
          deviceId: filter?.deviceId,
          installId: filter?.installId,
        });
        setLogs(data.events || []);
        setJourney(data.journey || null);
        setLogsMeta({
          source: data.source,
          retentionDays: data.retentionDays,
        });
        // Chips: live fleet devices + installs seen in events
        const fromEvents = data.devices || [];
        const fromLive = (data.liveDevices || []).map((d) => ({
          installId: d.installId || d.deviceId || "live",
          deviceId: d.deviceId,
          name: d.name,
          online: d.online,
          deviceModel: d.deviceModel,
          count: undefined,
          lastAt: undefined,
        }));
        const merged = new Map<string, AdminEventDeviceChip>();
        for (const c of [...fromLive, ...fromEvents]) {
          const key = c.deviceId || c.installId || "unknown";
          const prev = merged.get(key);
          merged.set(key, {
            ...prev,
            ...c,
            installId: c.installId || prev?.installId || key,
            deviceId: c.deviceId || prev?.deviceId,
            name: c.name || prev?.name,
            count: (prev?.count || 0) + (c.count || 0) || c.count,
          });
        }
        setLogsDeviceChips([...merged.values()]);
      } catch (e) {
        setLogsErr(e instanceof Error ? e.message : String(e));
        setLogs([]);
        setJourney(null);
        setLogsDeviceChips([]);
      } finally {
        setLogsBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (logsUserId) {
      void loadLogs(logsUserId, {
        deviceId: logsDeviceFilter,
        installId: logsInstallFilter,
      });
    }
  }, [logsUserId, logsDeviceFilter, logsInstallFilter, loadLogs]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-fg-muted">
            All earners platform-wide — wallets, devices, Stripe status, and
            mobile app event logs (install → online)
          </p>
        </div>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {totals && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Total users</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{totals.users}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Available balances</p>
            <Money cents={totals.walletsAvailableCents} size="md" className="mt-1 block" />
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Lifetime earned</p>
            <Money cents={totals.lifetimeEarnCents} size="md" className="mt-1 block" />
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Live devices</p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {totals.onlineDevices}/{totals.liveDevices}
            </p>
          </Card>
        </div>
      )}

      {err && (
        <p className="rounded-xl border border-danger/40 bg-danger-soft/30 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">Phone / name</th>
                <th className="px-4 py-2 font-medium">Country</th>
                <th className="px-4 py-2 font-medium">Available</th>
                <th className="px-4 py-2 font-medium">Lifetime</th>
                <th className="px-4 py-2 font-medium">Withdrawn</th>
                <th className="px-4 py-2 font-medium">Devices</th>
                <th className="px-4 py-2 font-medium">Stripe</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Logs</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !busy ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-fg-muted">
                    No users in the database yet.
                  </td>
                </tr>
              ) : (
                rows.map((u) => {
                  const liveMatch = devices.find((d) => d.userId === u.id);
                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        "border-b border-border/60",
                        liveMatch && "hover:bg-surface/50",
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-xs">{u.phone}</p>
                        <p className="text-[11px] text-fg-muted">
                          {u.displayName || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted">{u.country || "—"}</td>
                      <td className="px-4 py-2.5">
                        <Money cents={u.wallet.availableCents} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted">
                        <Money cents={u.wallet.lifetimeEarnCents} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted">
                        <Money cents={u.wallet.lifetimeWithdrawnCents} size="sm" />
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-xs text-fg-muted",
                          liveMatch && "cursor-pointer",
                        )}
                        onClick={() => liveMatch && onSelectDevice(liveMatch.deviceId)}
                      >
                        {u.devices.online} online · {u.devices.live} live ·{" "}
                        {u.devices.enrolled} enrolled
                        {u.devices.liveNames.length > 0 && (
                          <span className="mt-0.5 block text-[10px]">
                            {u.devices.liveNames.join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={u.stripeConnected ? "success" : "neutral"}>
                          {u.stripeConnected ? "connected" : "none"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={
                            u.devices.online > 0
                              ? "success"
                              : u.status === "active"
                                ? "primary"
                                : "warning"
                          }
                        >
                          {u.devices.online > 0 ? "online" : u.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Button
                          size="sm"
                          variant={logsUserId === u.id ? "primary" : "secondary"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogsUserId((cur) => {
                              if (cur === u.id) return null;
                              setLogsDeviceFilter(null);
                              setLogsInstallFilter(null);
                              return u.id;
                            });
                          }}
                        >
                          {logsUserId === u.id ? "Hide logs" : "App logs"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {logsUserId && (
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <SectionLabel>User journey & app events</SectionLabel>
              <p className="mt-1 text-xs text-fg-muted">
                Install → consent → login → home → share → online ·{" "}
                <span className="font-mono text-fg">
                  {rows.find((r) => r.id === logsUserId)?.phone || logsUserId}
                </span>
                {logsMeta && (
                  <span>
                    {" "}
                    · source {logsMeta.source} · retain {logsMeta.retentionDays}
                    d
                  </span>
                )}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={logsBusy}
              onClick={() =>
                logsUserId &&
                void loadLogs(logsUserId, {
                  deviceId: logsDeviceFilter,
                  installId: logsInstallFilter,
                })
              }
            >
              {logsBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh logs
            </Button>
          </div>

          {/* Per-device filter (multi-device users) */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-fg-subtle">Show:</span>
            <button
              type="button"
              onClick={() => {
                setLogsDeviceFilter(null);
                setLogsInstallFilter(null);
              }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                !logsDeviceFilter && !logsInstallFilter
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-surface text-fg-muted hover:text-fg",
              )}
            >
              All devices
            </button>
            {logsDeviceChips.map((c) => {
              const key = c.deviceId || c.installId;
              const active =
                (c.deviceId && logsDeviceFilter === c.deviceId) ||
                (!c.deviceId &&
                  c.installId &&
                  logsInstallFilter === c.installId);
              const label =
                c.name ||
                c.deviceModel ||
                (c.deviceId ? c.deviceId.slice(0, 12) : c.installId.slice(0, 12));
              return (
                <button
                  key={key}
                  type="button"
                  title={[
                    c.deviceId && `device ${c.deviceId}`,
                    c.installId && `install ${c.installId}`,
                    c.count != null && `${c.count} events`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onClick={() => {
                    if (c.deviceId) {
                      setLogsDeviceFilter(c.deviceId);
                      setLogsInstallFilter(c.installId || null);
                    } else {
                      setLogsDeviceFilter(null);
                      setLogsInstallFilter(c.installId);
                    }
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    active
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-surface text-fg-muted hover:text-fg",
                  )}
                >
                  {label}
                  {c.online ? " · live" : ""}
                  {c.count != null ? ` (${c.count})` : ""}
                </button>
              );
            })}
            {(logsDeviceFilter || logsInstallFilter) && (
              <span className="font-mono text-[10px] text-fg-subtle">
                filter: {logsDeviceFilter || logsInstallFilter}
              </span>
            )}
          </div>

          {journey && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={journey.fullyFunctional ? "success" : "warning"}>
                  {journey.fullyFunctional
                    ? "Fully functional"
                    : journey.droppedAt
                      ? `Dropped before: ${journey.droppedAt}`
                      : "In progress"}
                </Badge>
                {journey.lastStepKey && (
                  <span className="text-xs text-fg-muted">
                    Last step:{" "}
                    <strong className="text-fg">{journey.lastStepKey}</strong>{" "}
                    ({journey.lastStep}/9)
                  </span>
                )}
                {journey.notLoggedInReason && (
                  <Badge tone="warning">
                    not logged in: {journey.notLoggedInReason}
                  </Badge>
                )}
                {journey.lastBlock && (
                  <span className="text-xs text-fg-muted">
                    Last block:{" "}
                    <strong className="text-fg">{journey.lastBlock.type}</strong>
                    {journey.lastBlock.reason
                      ? ` (${journey.lastBlock.reason})`
                      : ""}
                    {journey.lastBlock.message
                      ? ` — ${journey.lastBlock.message}`
                      : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {journey.milestones.map((m) => (
                  <span
                    key={m.key}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      m.done
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-surface text-fg-subtle",
                    )}
                    title={`Step ${m.step}`}
                  >
                    {m.step}. {m.key}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-fg-subtle">
                Funnel: install → open → consent → login → OTP → signed in →
                home → share → online. Use event reasons below to see why
                someone stopped.
              </p>
            </div>
          )}

          {logsErr && (
            <p className="mt-2 text-sm text-danger">{logsErr}</p>
          )}
          <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-surface text-fg-subtle">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Message / reason</th>
                  <th className="px-3 py-2 font-medium">Phone / model</th>
                  <th className="px-3 py-2 font-medium">Device id</th>
                  <th className="px-3 py-2 font-medium">Install</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && !logsBusy ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-fg-muted"
                    >
                      {logsDeviceFilter || logsInstallFilter
                        ? "No events for this device filter. Try All devices, or open that phone so it reports events."
                        : "No events yet for this user. Open the Android app to generate funnel logs."}
                    </td>
                  </tr>
                ) : (
                  logs.map((e, i) => (
                    <tr
                      key={e.id || `${e.createdAt}-${e.eventType}-${i}`}
                      className="border-b border-border/50"
                    >
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[10px] text-fg-muted">
                        {e.createdAt
                          ? new Date(e.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-fg">
                        {e.eventType}
                      </td>
                      <td className="px-3 py-1.5 text-fg-muted">
                        {e.eventCategory}
                      </td>
                      <td className="max-w-[280px] px-3 py-1.5 text-fg-muted">
                        <span className="block truncate">
                          {e.message || "—"}
                        </span>
                        {e.props &&
                          (e.props.reason != null ||
                            e.props.reasonCode != null ||
                            e.props.error != null) && (
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-warning">
                              {String(
                                e.props.reason ??
                                  e.props.reasonCode ??
                                  e.props.error,
                              )}
                            </span>
                          )}
                      </td>
                      <td className="px-3 py-1.5 text-fg-subtle">
                        {e.deviceModel || e.platform || "—"}
                      </td>
                      <td className="max-w-[110px] truncate px-3 py-1.5 font-mono text-[10px] text-fg-subtle">
                        {e.deviceId || "—"}
                      </td>
                      <td className="max-w-[100px] truncate px-3 py-1.5 font-mono text-[10px] text-fg-subtle">
                        {e.installId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function DevicesSection({
  devices,
  selectedId,
  probeByDevice,
  probeBusy,
  trafficByDevice,
  trafficBusy,
  err,
  onSelect,
  onCloseDetail,
  onToggleExit,
  onProbeIp,
  onTraffic,
  onRemove,
  onRefresh,
}: {
  devices: EdgeDevice[];
  selectedId: string | null;
  probeByDevice: Record<string, DeviceProbeIpResult>;
  probeBusy: Record<string, boolean>;
  trafficByDevice: Record<string, DeviceTrafficResult>;
  trafficBusy: Record<string, boolean>;
  err: string | null;
  onSelect: (id: string) => void;
  onCloseDetail: () => void;
  onToggleExit: (d: EdgeDevice, enabled: boolean) => void;
  onProbeIp: (d: EdgeDevice) => void;
  onTraffic: (
    d: EdgeDevice,
    opts?: { targetMb?: number; durationSec?: number },
  ) => void;
  onRemove: (d: EdgeDevice) => void;
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">(
    "all",
  );
  const [query, setQuery] = useState("");
  /** "panel" = table + right inspector; "full" = single-device detail page */
  const [viewMode, setViewMode] = useState<"panel" | "full">("panel");
  const [copyBusyId, setCopyBusyId] = useState<string | null>(null);
  const [copyFlashId, setCopyFlashId] = useState<string | null>(null);
  const [listMsg, setListMsg] = useState<string | null>(null);

  const copyDeviceUri = async (d: EdgeDevice) => {
    setCopyBusyId(d.deviceId);
    setListMsg(null);
    try {
      const access = await fetchDeviceProxyAccess(d.deviceId);
      const uri =
        access.http ||
        access.endpoints?.httpDisplay ||
        access.endpoints?.http ||
        "";
      if (!uri) throw new Error("No URI returned");
      await navigator.clipboard.writeText(uri);
      setCopyFlashId(d.deviceId);
      setListMsg(`Copied any-network URI for ${d.name}`);
      window.setTimeout(() => setCopyFlashId(null), 1500);
    } catch (e) {
      setListMsg(
        e instanceof Error ? e.message : "Could not copy device URI",
      );
    } finally {
      setCopyBusyId(null);
    }
  };

  const sorted = [...devices].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0);
  });

  const q = query.trim().toLowerCase();
  const filtered = sorted.filter((d) => {
    if (statusFilter === "online" && !d.online) return false;
    if (statusFilter === "offline" && d.online) return false;
    if (!q) return true;
    const hay = [
      d.name,
      d.deviceId,
      d.userId,
      d.lastPublicIp,
      d.city,
      d.region,
      d.country,
      d.countryName,
      d.isp,
      d.carrier,
      d.asn,
      d.platform,
      d.network,
      d.ipType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  const selected = devices.find((d) => d.deviceId === selectedId) || null;
  const onlineCount = devices.filter((d) => d.online).length;
  const panelOpen = !!selected && viewMode === "panel";

  const openFull = (id: string) => {
    onSelect(id);
    setViewMode("full");
  };

  const selectInPanel = (id: string) => {
    onSelect(id);
    setViewMode("panel");
  };

  const closeAll = () => {
    setViewMode("panel");
    onCloseDetail();
  };

  if (viewMode === "full" && selected) {
    return (
      <DeviceFullDetailPage
        device={selected}
        probeBusy={!!probeBusy[selected.deviceId]}
        trafficBusy={
          !!trafficBusy[selected.deviceId] ||
          trafficByDevice[selected.deviceId]?.status === "running"
        }
        err={err}
        probeResult={probeByDevice[selected.deviceId] || null}
        trafficResult={trafficByDevice[selected.deviceId] || null}
        onBack={() => setViewMode("panel")}
        onClose={closeAll}
        onToggleExit={() => onToggleExit(selected, !selected.exitEnabled)}
        onProbeIp={() => onProbeIp(selected)}
        onTraffic={(opts) => onTraffic(selected, opts)}
        onRemove={() => {
          onRemove(selected);
          setViewMode("panel");
        }}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
          <p className="text-sm text-fg-muted">
            Fleet table · {onlineCount} online / {devices.length} enrolled ·
            click a row for the inspector, or open full details
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Admin-only global rotating URI (any phone, any network) */}
      <FleetProxyUriCard onlineCount={onlineCount} />

      {listMsg && (
        <p className="text-xs text-fg-muted" role="status">
          {listMsg}
        </p>
      )}

      {devices.length === 0 ? (
        <Card className="p-8 text-center text-sm text-fg-muted">
          <p className="font-medium text-fg">No real devices enrolled yet</p>
          <p className="mt-2">
            Sign in on Android, accept consent, then{" "}
            <strong className="text-fg">Start sharing</strong> so the phone
            enrolls via <code className="text-fg">/api/edge/agent/hello</code>.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border bg-surface p-0.5">
              {(
                [
                  ["all", "All"],
                  ["online", "Online"],
                  ["offline", "Offline"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition",
                    statusFilter === id
                      ? "bg-primary/15 text-primary"
                      : "text-fg-muted hover:text-fg",
                  )}
                >
                  {label}
                  {id === "online" ? ` (${onlineCount})` : ""}
                  {id === "all" ? ` (${devices.length})` : ""}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter name, IP, user, city, ISP…"
              className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
            />
            {panelOpen && (
              <span className="text-[11px] text-fg-subtle">
                Inspector open · Esc / Close to dismiss
              </span>
            )}
          </div>

          <div
            className={cn(
              "grid gap-3",
              panelOpen
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]"
                : "grid-cols-1",
            )}
          >
            <Card className="min-w-0 overflow-hidden p-0">
              <div className="max-h-[min(70vh,720px)] overflow-auto">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-border bg-surface text-[11px] uppercase tracking-wide text-fg-subtle">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Device</th>
                      <th className="px-3 py-2.5 font-medium">User</th>
                      <th className="px-3 py-2.5 font-medium">Location</th>
                      <th className="px-3 py-2.5 font-medium">Network</th>
                      <th className="px-3 py-2.5 font-medium">Public IP</th>
                      <th className="px-3 py-2.5 font-medium">Traffic</th>
                      <th className="px-3 py-2.5 font-medium">Exit</th>
                      <th className="px-3 py-2.5 font-medium">Job</th>
                      <th className="px-3 py-2.5 font-medium">Proxy</th>
                      <th className="px-3 py-2.5 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-3 py-8 text-center text-fg-muted"
                        >
                          No devices match this filter.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((d) => {
                        const job = trafficByDevice[d.deviceId];
                        const running =
                          trafficBusy[d.deviceId] || job?.status === "running";
                        const active = selectedId === d.deviceId;
                        const copying = copyBusyId === d.deviceId;
                        const copied = copyFlashId === d.deviceId;
                        return (
                          <tr
                            key={d.deviceId}
                            onClick={() => selectInPanel(d.deviceId)}
                            onDoubleClick={() => openFull(d.deviceId)}
                            className={cn(
                              "cursor-pointer border-b border-border/50 transition",
                              active
                                ? "bg-primary/10"
                                : "hover:bg-surface-2/60",
                            )}
                          >
                            <td className="whitespace-nowrap px-3 py-2">
                              <Badge tone={d.online ? "success" : "neutral"}>
                                {d.online ? "online" : "offline"}
                              </Badge>
                            </td>
                            <td className="max-w-[160px] px-3 py-2">
                              <p className="truncate font-medium text-fg">
                                {d.name || "—"}
                              </p>
                              <p className="truncate font-mono text-[10px] text-fg-subtle">
                                {d.deviceId}
                              </p>
                            </td>
                            <td className="max-w-[120px] px-3 py-2">
                              <p className="truncate font-mono text-[11px] text-fg-muted">
                                {d.userId || "—"}
                              </p>
                            </td>
                            <td className="max-w-[140px] truncate px-3 py-2 text-fg-muted">
                              {formatLocation(d)}
                            </td>
                            <td className="max-w-[140px] px-3 py-2 text-fg-muted">
                              <p className="truncate">
                                {d.ipType || d.network || "—"}
                              </p>
                              <p className="truncate text-[10px] text-fg-subtle">
                                {d.isp || d.carrier || ""}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-fg">
                              {d.lastPublicIp || "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-fg-muted">
                              ↑{formatBytesAdmin(d.bytesUp)} · ↓
                              {formatBytesAdmin(d.bytesDown)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              <Badge
                                tone={d.exitEnabled ? "success" : "warning"}
                              >
                                {d.exitEnabled ? "on" : "off"}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {running ? (
                                <Badge tone="primary">
                                  {job?.progress?.mb != null
                                    ? `${job.progress.mb} MB`
                                    : "running"}
                                </Badge>
                              ) : job?.status ? (
                                <span className="text-[10px] text-fg-subtle">
                                  {job.status}
                                </span>
                              ) : (
                                <span className="text-fg-subtle">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 gap-1 px-2 text-[11px]"
                                disabled={copying}
                                title="Copy sticky type-any URI for this phone (Wi‑Fi or mobile)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void copyDeviceUri(d);
                                }}
                              >
                                {copying ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                {copied ? "Copied" : "URI"}
                              </Button>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFull(d.deviceId);
                                  }}
                                >
                                  Full
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-fg-subtle">
                <span>
                  Showing {filtered.length} of {devices.length}
                </span>
                <span>
                  URI = copy any-network sticky · Double-click / Full for detail
                </span>
              </div>
            </Card>

            {panelOpen && selected && (
              <div className="lg:sticky lg:top-4 lg:self-start">
                <DeviceDetailPanel
                  device={selected}
                  compact
                  probeBusy={!!probeBusy[selected.deviceId]}
                  trafficBusy={
                    !!trafficBusy[selected.deviceId] ||
                    trafficByDevice[selected.deviceId]?.status === "running"
                  }
                  err={err}
                  probeResult={probeByDevice[selected.deviceId] || null}
                  trafficResult={trafficByDevice[selected.deviceId] || null}
                  onClose={closeAll}
                  onOpenFull={() => setViewMode("full")}
                  onToggleExit={() =>
                    onToggleExit(selected, !selected.exitEnabled)
                  }
                  onProbeIp={() => onProbeIp(selected)}
                  onTraffic={(opts) => onTraffic(selected, opts)}
                  onRemove={() => onRemove(selected)}
                />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function DeviceFullDetailPage({
  device,
  probeBusy,
  trafficBusy,
  err,
  probeResult,
  trafficResult,
  onBack,
  onClose,
  onToggleExit,
  onProbeIp,
  onTraffic,
  onRemove,
}: {
  device: EdgeDevice;
  probeBusy: boolean;
  trafficBusy: boolean;
  err: string | null;
  probeResult: DeviceProbeIpResult | null;
  trafficResult: DeviceTrafficResult | null;
  onBack: () => void;
  onClose: () => void;
  onToggleExit: () => void;
  onProbeIp: () => void;
  onTraffic: (opts?: { targetMb?: number; durationSec?: number }) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to table
          </Button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-fg-subtle">
              Device details
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              {device.name}
            </h1>
          </div>
          <Badge tone={device.online ? "success" : "neutral"}>
            {device.online ? "online" : "offline"}
          </Badge>
          <Badge tone={device.exitEnabled ? "success" : "warning"}>
            exit {device.exitEnabled ? "on" : "off"}
          </Badge>
        </div>
        <button
          type="button"
          className="text-xs text-fg-muted hover:text-fg"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <DeviceDetailBody
        device={device}
        layout="full"
        probeBusy={probeBusy}
        trafficBusy={trafficBusy}
        err={err}
        probeResult={probeResult}
        trafficResult={trafficResult}
        onToggleExit={onToggleExit}
        onProbeIp={onProbeIp}
        onTraffic={onTraffic}
        onRemove={onRemove}
      />
    </div>
  );
}

function DeviceDetailPanel({
  device,
  compact,
  probeBusy,
  trafficBusy,
  err,
  probeResult,
  trafficResult,
  onClose,
  onOpenFull,
  onToggleExit,
  onProbeIp,
  onTraffic,
  onRemove,
}: {
  device: EdgeDevice;
  compact?: boolean;
  probeBusy: boolean;
  trafficBusy: boolean;
  err: string | null;
  probeResult: DeviceProbeIpResult | null;
  trafficResult: DeviceTrafficResult | null;
  onClose: () => void;
  onOpenFull?: () => void;
  onToggleExit: () => void;
  onProbeIp: () => void;
  onTraffic: (opts?: { targetMb?: number; durationSec?: number }) => void;
  onRemove: () => void;
}) {
  return (
    <Card className={cn("space-y-3", compact ? "p-4" : "p-5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">
            Inspector
          </p>
          <h2 className="truncate text-base font-semibold">{device.name}</h2>
          <p className="truncate font-mono text-[10px] text-fg-muted">
            {device.deviceId}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onOpenFull && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-[11px]"
              onClick={onOpenFull}
            >
              Full details
            </Button>
          )}
          <button
            type="button"
            className="rounded-md p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
            onClick={onClose}
            aria-label="Close inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DeviceDetailBody
        device={device}
        layout="panel"
        probeBusy={probeBusy}
        trafficBusy={trafficBusy}
        err={err}
        probeResult={probeResult}
        trafficResult={trafficResult}
        onToggleExit={onToggleExit}
        onProbeIp={onProbeIp}
        onTraffic={onTraffic}
        onRemove={onRemove}
      />
    </Card>
  );
}

function DeviceDetailBody({
  device,
  layout,
  probeBusy,
  trafficBusy,
  err,
  probeResult,
  trafficResult,
  onToggleExit,
  onProbeIp,
  onTraffic,
  onRemove,
}: {
  device: EdgeDevice;
  layout: "panel" | "full";
  probeBusy: boolean;
  trafficBusy: boolean;
  err: string | null;
  probeResult: DeviceProbeIpResult | null;
  trafficResult: DeviceTrafficResult | null;
  onToggleExit: () => void;
  onProbeIp: () => void;
  onTraffic: (opts?: { targetMb?: number; durationSec?: number }) => void;
  onRemove: () => void;
}) {
  const full = layout === "full";

  return (
    <div className={cn("space-y-4", full && "space-y-5")}>
      {/* Ready-to-use sticky proxy for this phone */}
      <DeviceProxyUriCard device={device} compact={!full} />

      {/* App funnel logs for this phone only */}
      <DeviceAppLogsCard device={device} compact={!full} />

      <div
        className={cn(
          full
            ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            : "space-y-0",
        )}
      >
        {full ? (
          <>
            <Card className="space-y-2 p-4">
              <SectionLabel>Identity</SectionLabel>
              <dl className="space-y-1.5 text-sm">
                <DetailRow label="Name" value={device.name || "—"} />
                <DetailRow label="Device id" value={device.deviceId} mono />
                <DetailRow label="User id" value={device.userId || "—"} mono />
                <DetailRow label="Platform" value={device.platform || "—"} />
                <DetailRow
                  label="Enrolled"
                  value={
                    device.enrolledAt
                      ? new Date(device.enrolledAt).toLocaleString()
                      : "—"
                  }
                />
                <DetailRow
                  label="Source"
                  value={device.source || "agent"}
                  mono
                />
              </dl>
            </Card>
            <Card className="space-y-2 p-4">
              <SectionLabel>Network & geo</SectionLabel>
              <dl className="space-y-1.5 text-sm">
                <DetailRow
                  label="Network"
                  value={device.ipType || device.network || "—"}
                />
                <DetailRow
                  label="Public IP"
                  value={device.lastPublicIp || "—"}
                  mono
                />
                <DetailRow label="City" value={device.city || "—"} />
                <DetailRow label="Region" value={device.region || "—"} />
                <DetailRow
                  label="Country"
                  value={
                    device.countryName
                      ? `${device.countryName}${device.country ? ` (${device.country})` : ""}`
                      : device.country || "—"
                  }
                />
                <DetailRow
                  label="ISP"
                  value={device.isp || device.carrier || "—"}
                />
                <DetailRow label="Org" value={device.org || "—"} />
                <DetailRow
                  label="ASN"
                  value={
                    device.asn
                      ? `${device.asn}${device.asOrg ? ` · ${device.asOrg}` : ""}`
                      : "—"
                  }
                  mono
                />
                {(device.lat != null || device.lon != null) && (
                  <DetailRow
                    label="Coords"
                    value={`${device.lat ?? "—"}, ${device.lon ?? "—"}`}
                    mono
                  />
                )}
              </dl>
            </Card>
            <Card className="space-y-2 p-4">
              <SectionLabel>Tunnel & traffic</SectionLabel>
              <dl className="space-y-1.5 text-sm">
                <DetailRow
                  label="Status"
                  value={`${device.online ? "online" : "offline"} · exit ${device.exitEnabled ? "on" : "off"}`}
                />
                <DetailRow label="Tunnel" value={device.tunnelId || "—"} mono />
                <DetailRow
                  label="Bytes"
                  value={`${formatBytesAdmin(device.bytesUp)} ↑ · ${formatBytesAdmin(device.bytesDown)} ↓`}
                />
                <DetailRow
                  label="Last seen"
                  value={
                    device.lastSeenAt
                      ? new Date(device.lastSeenAt).toLocaleString()
                      : "—"
                  }
                />
                <DetailRow
                  label="Geo at"
                  value={
                    device.geoAt
                      ? new Date(device.geoAt).toLocaleString()
                      : "—"
                  }
                />
              </dl>
            </Card>
          </>
        ) : (
          <dl className="space-y-1.5 text-sm">
            <DetailRow label="User id" value={device.userId || "—"} mono />
            <DetailRow label="Platform" value={device.platform || "—"} />
            <DetailRow
              label="Network"
              value={device.ipType || device.network || "—"}
            />
            <DetailRow
              label="Public IP"
              value={device.lastPublicIp || "—"}
              mono
            />
            <DetailRow label="Location" value={formatLocation(device)} />
            <DetailRow label="ISP" value={device.isp || device.carrier || "—"} />
            <DetailRow
              label="ASN"
              value={
                device.asn
                  ? `${device.asn}${device.asOrg ? ` · ${device.asOrg}` : ""}`
                  : "—"
              }
              mono
            />
            <DetailRow label="Tunnel" value={device.tunnelId || "—"} mono />
            <DetailRow
              label="Bytes"
              value={`${formatBytesAdmin(device.bytesUp)} ↑ · ${formatBytesAdmin(device.bytesDown)} ↓`}
            />
            <DetailRow
              label="Last seen"
              value={
                device.lastSeenAt
                  ? new Date(device.lastSeenAt).toLocaleString()
                  : "—"
              }
            />
            <DetailRow
              label="Status"
              value={`${device.online ? "online" : "offline"} · exit ${device.exitEnabled ? "on" : "off"}`}
            />
          </dl>
        )}
      </div>

      <div
        className={cn(
          "flex gap-2",
          full ? "flex-wrap" : "flex-col",
        )}
      >
        <Button
          size="sm"
          disabled={probeBusy || !device.online}
          onClick={onProbeIp}
        >
          {probeBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
          Check proxy IP
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={trafficBusy || !device.online}
          onClick={() => onTraffic({ targetMb: 100, durationSec: 180 })}
        >
          {trafficBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Activity className="h-3.5 w-3.5" />
          )}
          {trafficBusy
            ? "Traffic running…"
            : "Generate traffic (~100 MB · 10 streams)"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={trafficBusy || !device.online}
          onClick={() => onTraffic({ targetMb: 1024, durationSec: 3600 })}
          title="Admin only — push ~1 GB through this phone exit (10 parallel streams)"
        >
          {trafficBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Activity className="h-3.5 w-3.5" />
          )}
          Generate traffic (~1 GB · 10 streams)
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={probeBusy || trafficBusy}
          onClick={onToggleExit}
        >
          {device.exitEnabled ? "Disable exit" : "Enable exit"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={probeBusy || trafficBusy}
          onClick={onRemove}
          className="text-danger"
        >
          Remove from fleet
        </Button>
      </div>

      {err && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft/20 px-3 py-2 text-xs text-danger">
          {err}
        </p>
      )}

      {probeResult && probeResult.device?.deviceId === device.deviceId && (
        <div
          className={cn(
            "rounded-xl border border-border bg-bg p-3 text-xs",
            full && "sm:col-span-2",
          )}
        >
          <SectionLabel>IP probe result</SectionLabel>
          <p className="mt-2 font-mono text-fg">
            seen: {probeResult.seenIp || "—"}
          </p>
          <p className="font-mono text-fg-muted">
            expected (phone): {probeResult.expectedEgressIp || "—"}
          </p>
          <p className="mt-1 text-fg-muted">{probeResult.matchNote}</p>
          {probeResult.classification && (
            <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-fg-subtle">
              {JSON.stringify(probeResult.classification, null, 2)}
            </pre>
          )}
          {(probeResult.probe?.curlWhoami || probeResult.probe?.curlExample) !=
            null && (
            <p className="mt-2 break-all font-mono text-[10px] text-fg-subtle">
              {String(
                probeResult.probe?.curlWhoami || probeResult.probe?.curlExample,
              )}
            </p>
          )}
          {probeResult.error && (
            <p className="mt-1 text-danger">{probeResult.error}</p>
          )}
        </div>
      )}

      {trafficResult &&
        (trafficResult.deviceId === device.deviceId ||
          trafficResult.device?.deviceId === device.deviceId) && (
          <div className="rounded-xl border border-border bg-bg p-3 text-xs">
            <SectionLabel>Traffic job (live)</SectionLabel>
            <p className="mt-2 text-fg">
              {trafficResult.status || "—"}
              {trafficResult.jobId ? (
                <span className="text-fg-subtle"> · {trafficResult.jobId}</span>
              ) : null}
            </p>
            <p className="mt-1 font-mono text-fg">
              {(
                trafficResult.progress?.mb ??
                trafficResult.summary?.mb ??
                (trafficResult.progress?.totalBytes ||
                  trafficResult.summary?.totalBytes ||
                  0) /
                  (1024 * 1024)
              ).toFixed?.(2) ?? "0"}{" "}
              MB ·{" "}
              {trafficResult.progress?.okCount ??
                trafficResult.summary?.okCount ??
                0}{" "}
              ok ·{" "}
              {Math.round(
                (trafficResult.progress?.elapsedMs ||
                  trafficResult.summary?.durationMs ||
                  0) / 1000,
              )}
              s
            </p>
            <p className="mt-1 font-mono text-[11px] text-fg-muted">
              Parallel: {trafficResult.parallel ?? "—"} · in-flight:{" "}
              {trafficResult.progress?.inFlight ?? 0} · peak:{" "}
              {trafficResult.progress?.peakInFlight ?? 0}
            </p>
            {trafficResult.device && (
              <p className="mt-1 text-fg-muted">
                Device counters: ↑{" "}
                {formatBytesAdmin(trafficResult.device.bytesUp)} · ↓{" "}
                {formatBytesAdmin(trafficResult.device.bytesDown)}
              </p>
            )}
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto font-mono text-[10px] text-fg-muted">
              {(trafficResult.recentHits || trafficResult.hits || [])
                .slice(-15)
                .map((h, i) => (
                  <li key={i}>
                    {h.ok ? "✓" : "✗"} {String(h.url || "").slice(0, 48)} ·{" "}
                    {h.bytes != null ? formatBytesAdmin(Number(h.bytes)) : "—"}
                  </li>
                ))}
            </ul>
          </div>
        )}
    </div>
  );
}

/** App funnel logs scoped to one edge device (not the whole user). */
function DeviceAppLogsCard({
  device,
  compact,
}: {
  device: EdgeDevice;
  compact?: boolean;
}) {
  const [events, setEvents] = useState<AdminAppEvent[]>([]);
  const [journey, setJourney] = useState<AdminJourneySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ source?: string; retentionDays?: number }>(
    {},
  );

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchDeviceEvents(device.deviceId, {
        limit: compact ? 80 : 200,
        userId: device.userId,
        installId: device.installId,
      });
      setEvents(data.events || []);
      setJourney(data.journey || null);
      setMeta({ source: data.source, retentionDays: data.retentionDays });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setEvents([]);
      setJourney(null);
    } finally {
      setBusy(false);
    }
  }, [device.deviceId, device.userId, device.installId, compact]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <SectionLabel>App logs (this device only)</SectionLabel>
          <p className="mt-1 text-[11px] text-fg-muted">
            Funnel for{" "}
            <span className="font-mono text-fg">{device.name}</span>
            {device.installId ? (
              <>
                {" "}
                · install{" "}
                <span className="font-mono">{device.installId.slice(0, 16)}…</span>
              </>
            ) : null}
            {meta.source ? ` · ${meta.source}` : ""}
            {meta.retentionDays ? ` · ${meta.retentionDays}d` : ""}
          </p>
        </div>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {journey && (
        <div className="mt-2 flex flex-wrap gap-1">
          {journey.milestones.map((m) => (
            <span
              key={m.key}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                m.done
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border text-fg-subtle",
              )}
            >
              {m.step}. {m.key}
            </span>
          ))}
          {journey.droppedAt && !journey.fullyFunctional && (
            <Badge tone="warning">dropped: {journey.droppedAt}</Badge>
          )}
        </div>
      )}

      {err && <p className="mt-2 text-xs text-danger">{err}</p>}

      <div
        className={cn(
          "mt-2 overflow-auto rounded-lg border border-border",
          compact ? "max-h-48" : "max-h-72",
        )}
      >
        <table className="w-full min-w-[480px] text-left text-[11px]">
          <thead className="sticky top-0 bg-surface text-fg-subtle">
            <tr className="border-b border-border">
              <th className="px-2 py-1.5 font-medium">Time</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && !busy ? (
              <tr>
                <td colSpan={3} className="px-2 py-4 text-center text-fg-muted">
                  No events for this device yet. Needs app build that reports{" "}
                  <code className="text-fg">deviceId</code> (or linked install
                  id). Open the phone and use the app, then refresh.
                </td>
              </tr>
            ) : (
              events.map((e, i) => (
                <tr
                  key={e.id || `${e.createdAt}-${e.eventType}-${i}`}
                  className="border-b border-border/40"
                >
                  <td className="whitespace-nowrap px-2 py-1 font-mono text-[10px] text-fg-muted">
                    {e.createdAt
                      ? new Date(e.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-2 py-1 font-mono text-fg">{e.eventType}</td>
                  <td className="max-w-[200px] truncate px-2 py-1 text-fg-muted">
                    {e.message ||
                      (e.props?.reason != null
                        ? String(e.props.reason)
                        : "—")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-fg-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-fg",
          mono && "font-mono text-[11px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function formatBytesAdmin(n: number): string {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatLocation(d: EdgeDevice): string {
  const parts = [d.city, d.region, d.countryName || d.country].filter(
    (x) => x && x !== "XX",
  );
  return parts.length ? parts.join(", ") : "Location pending…";
}

function WithdrawalsSection() {
  const [rows, setRows] = useState<AdminWithdrawalRow[]>([]);
  const [totals, setTotals] = useState<{
    paidCents: number;
    pendingCents: number;
    count: number;
  } | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "failed">(
    "all",
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await fetchAdminOverview();
      setRows(data.withdrawals);
      setTotals({
        paidCents: data.totals.paidWithdrawCents,
        pendingCents: data.totals.pendingWithdrawCents,
        count: data.withdrawals.length,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = rows.filter((w) => {
    if (filter === "all") return true;
    if (filter === "pending")
      return w.status === "pending" || w.status === "review";
    return w.status === filter;
  });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Withdrawals</h1>
          <p className="text-sm text-fg-muted">
            Platform-wide payout queue — every earner’s withdrawals, not only
            the admin account
          </p>
        </div>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {totals && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Total requests</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{totals.count}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Paid out</p>
            <Money cents={totals.paidCents} size="md" className="mt-1 block" />
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-muted">Pending / review</p>
            <Money cents={totals.pendingCents} size="md" className="mt-1 block" />
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {(["all", "paid", "pending", "failed"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs capitalize",
              filter === f ? "bg-surface text-fg" : "text-fg-muted",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {err && (
        <p className="rounded-xl border border-danger/40 bg-danger-soft/30 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Processed</th>
                <th className="px-4 py-2 font-medium">Note / Stripe</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !busy ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-fg-muted">
                    No withdrawals yet across all users.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="border-b border-border/60">
                    <td className="px-4 py-2.5">
                      <p className="font-mono text-xs">{w.phone || "—"}</p>
                      <p className="text-[11px] text-fg-muted">
                        {w.displayName || w.userId.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Money cents={w.amountCents} size="sm" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        tone={
                          w.status === "paid"
                            ? "success"
                            : w.status === "pending" || w.status === "review"
                              ? "warning"
                              : w.status === "failed"
                                ? "danger"
                                : "primary"
                        }
                      >
                        {w.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-fg-muted">
                      {w.createdAt
                        ? new Date(w.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-fg-muted">
                      {w.processedAt
                        ? new Date(w.processedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="max-w-[280px] px-4 py-2.5 text-[11px] text-fg-muted">
                      <p className="truncate">{w.reviewNote || "—"}</p>
                      {w.stripeTransferId && (
                        <p className="mt-0.5 truncate font-mono text-[10px]">
                          {w.stripeTransferId}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
