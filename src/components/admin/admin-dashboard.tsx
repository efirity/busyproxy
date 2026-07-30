import { useCallback, useEffect, useState } from "react";
import {
  Activity,
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
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Money,
  SectionLabel,
} from "@/components/ui/primitives";
import {
  type AdminOverview,
  type AdminUserRow,
  type AdminWithdrawalRow,
  fetchAdminOverview,
} from "@/lib/admin-client";
import {
  type DeviceProbeIpResult,
  type DeviceTrafficResult,
  type EdgeCredential,
  type EdgeDevice,
  type EdgeSnapshot,
  type ProxyExitTestResult,
  type StickySession,
  connectCheck,
  fetchEdgeSnapshot,
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

type Section =
  | "overview"
  | "gateway"
  | "proxies"
  | "users"
  | "devices"
  | "traffic"
  | "withdrawals"
  | "risk";

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
  operatorUser,
  onLogout,
}: {
  operatorUser?: { phone?: string; displayName?: string | null } | null;
  onLogout?: () => void;
} = {}) {
  // Default to live devices (real enrollments only)
  const [section, setSection] = useState<Section>("devices");
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
              onClick={() => setSection(n.id)}
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
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface hover:text-fg"
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
                onClick={() => setSection(n.id)}
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
              setSection("devices");
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
              setSection("devices");
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
            onTraffic={(d) =>
              void (async () => {
                const id = d.deviceId;
                // Only this device is busy — other devices stay free
                setTrafficBusy((p) => ({ ...p, [id]: true }));
                setErr(null);
                try {
                  const started = await runDeviceTraffic(id, {
                    durationSec: 180,
                    targetMb: 100,
                    chunkMb: 3,
                  });
                  setTrafficByDevice((p) => ({ ...p, [id]: started }));
                  setMsg(
                    `${d.name}: traffic started (${started.jobId || "—"}) · ~100 MB`,
                  );
                  const jobId = started.jobId;
                  if (!jobId) return;
                  const deadline = Date.now() + 6 * 60 * 1000;
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

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-fg-muted">
            All earners platform-wide — wallets, devices, Stripe status (not
            just the signed-in admin)
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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !busy ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-fg-muted">
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
                        liveMatch && "cursor-pointer hover:bg-surface/50",
                      )}
                      onClick={() => liveMatch && onSelectDevice(liveMatch.deviceId)}
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
                      <td className="px-4 py-2.5 text-xs text-fg-muted">
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
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
  onTraffic: (d: EdgeDevice) => void;
  onRemove: (d: EdgeDevice) => void;
  onRefresh: () => void;
}) {
  const sorted = [...devices].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0);
  });
  const selected = sorted.find((d) => d.deviceId === selectedId) || null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Real devices
          </h1>
          <p className="text-sm text-fg-muted">
            Only phones that enrolled via the app ({devices.length} total) ·
            click for IP check & traffic
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center text-sm text-fg-muted">
          <p className="font-medium text-fg">No real devices online yet</p>
          <p className="mt-2">
            Mock seed devices were removed. Sign in on Android, accept consent,
            then <strong className="text-fg">Start sharing</strong> so the phone
            calls <code className="text-fg">/api/edge/agent/hello</code>.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,400px)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {sorted.map((d) => {
              const job = trafficByDevice[d.deviceId];
              const running =
                trafficBusy[d.deviceId] || job?.status === "running";
              return (
                <button
                  key={d.deviceId}
                  type="button"
                  onClick={() => onSelect(d.deviceId)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    selectedId === d.deviceId
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{d.name}</p>
                      <p className="truncate font-mono text-[11px] text-fg-subtle">
                        {d.deviceId}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-fg-muted">
                        user: {d.userId || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={d.online ? "success" : "neutral"}>
                        {d.online ? "online" : "offline"}
                      </Badge>
                      {running && (
                        <Badge tone="primary">traffic…</Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-fg-muted">
                    {formatLocation(d)}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {d.ipType || d.network}
                    {d.isp ? ` · ${d.isp}` : d.carrier ? ` · ${d.carrier}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-fg">
                    IP {d.lastPublicIp || "—"}
                  </p>
                  {d.asn && (
                    <p className="font-mono text-[10px] text-fg-subtle">
                      {d.asn}
                      {d.asOrg ? ` · ${d.asOrg}` : ""}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-[11px] text-fg-muted">
                    ↑ {formatBytesAdmin(d.bytesUp)} · ↓{" "}
                    {formatBytesAdmin(d.bytesDown)}
                    {d.exitEnabled ? "" : " · exit off"}
                    {job?.progress?.mb != null
                      ? ` · job ${job.progress.mb} MB`
                      : ""}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            {!selected ? (
              <Card className="p-5 text-sm text-fg-muted">
                Select a device to see details, check exit IP via BusyProxy
                whoami, and run a traffic job.
              </Card>
            ) : (
              <DeviceDetailPanel
                device={selected}
                probeBusy={!!probeBusy[selected.deviceId]}
                trafficBusy={
                  !!trafficBusy[selected.deviceId] ||
                  trafficByDevice[selected.deviceId]?.status === "running"
                }
                err={err}
                probeResult={probeByDevice[selected.deviceId] || null}
                trafficResult={trafficByDevice[selected.deviceId] || null}
                onClose={onCloseDetail}
                onToggleExit={() =>
                  onToggleExit(selected, !selected.exitEnabled)
                }
                onProbeIp={() => onProbeIp(selected)}
                onTraffic={() => onTraffic(selected)}
                onRemove={() => onRemove(selected)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DeviceDetailPanel({
  device,
  probeBusy,
  trafficBusy,
  err,
  probeResult,
  trafficResult,
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
  onClose: () => void;
  onToggleExit: () => void;
  onProbeIp: () => void;
  onTraffic: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-subtle">
            Device detail
          </p>
          <h2 className="text-lg font-semibold">{device.name}</h2>
          <p className="font-mono text-[11px] text-fg-muted">{device.deviceId}</p>
        </div>
        <button
          type="button"
          className="text-xs text-fg-muted hover:text-fg"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <dl className="space-y-1.5 text-sm">
        <DetailRow label="User id" value={device.userId || "—"} mono />
        <DetailRow label="Platform" value={device.platform} />
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
        <DetailRow label="ISP" value={device.isp || device.carrier || "—"} />
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

      <div className="flex flex-col gap-2">
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
          onClick={onTraffic}
        >
          {trafficBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Activity className="h-3.5 w-3.5" />
          )}
          {trafficBusy
            ? "Traffic running on this device…"
            : "Generate traffic (~100 MB)"}
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

      {probeResult && probeResult.device.deviceId === device.deviceId && (
        <div className="rounded-xl border border-border bg-bg p-3 text-xs">
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
              MB · {trafficResult.progress?.okCount ?? trafficResult.summary?.okCount ?? 0} ok ·{" "}
              {Math.round(
                (trafficResult.progress?.elapsedMs ||
                  trafficResult.summary?.durationMs ||
                  0) / 1000,
              )}
              s
            </p>
            {trafficResult.device && (
              <p className="mt-1 text-fg-muted">
                Device counters: ↑ {formatBytesAdmin(trafficResult.device.bytesUp)} · ↓{" "}
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
    </Card>
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
