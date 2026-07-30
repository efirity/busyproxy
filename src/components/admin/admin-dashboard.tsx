import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Flag,
  LayoutDashboard,
  Loader2,
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
import { ADMIN_WITHDRAWALS } from "@/data/demo";
import {
  type DeviceProbeIpResult,
  type DeviceTrafficResult,
  type EdgeCredential,
  type EdgeDevice,
  type EdgeSnapshot,
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

export function AdminDashboard() {
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
      <aside className="hidden w-56 shrink-0 border-r border-border bg-bg-elevated p-4 lg:block">
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
      </aside>

      <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
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
                  targetHost: "api.ipify.org",
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
          Live edge fleet across all earners — not the earner wallet
        </p>
      </div>
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
              value={`curl -x http://${rotateUser}:${pass}@${gate} https://api.ipify.org`}
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
  const byUser = new Map<
    string,
    { userId: string; devices: EdgeDevice[]; online: number; countries: Set<string> }
  >();
  for (const d of devices) {
    const key = d.userId || "unknown";
    let row = byUser.get(key);
    if (!row) {
      row = {
        userId: key,
        devices: [],
        online: 0,
        countries: new Set(),
      };
      byUser.set(key, row);
    }
    row.devices.push(d);
    if (d.online) row.online += 1;
    if (d.country) row.countries.add(d.country);
  }
  const liveUsers = [...byUser.values()].sort(
    (a, b) => b.online - a.online || b.devices.length - a.devices.length,
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-fg-muted">
          Real earners only — grouped from live device enrollments (no mocks)
        </p>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">User id</th>
                <th className="px-4 py-2 font-medium">Devices</th>
                <th className="px-4 py-2 font-medium">Online</th>
                <th className="px-4 py-2 font-medium">Countries</th>
                <th className="px-4 py-2 font-medium">Sample device</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {liveUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-fg-muted"
                  >
                    No real users yet. When a phone signs in with OTP and starts
                    sharing, the user id from the session appears here.
                  </td>
                </tr>
              ) : (
                liveUsers.map((u) => {
                  const sample = u.devices[0];
                  return (
                    <tr
                      key={u.userId}
                      className="cursor-pointer border-b border-border/60 hover:bg-surface/50"
                      onClick={() =>
                        sample && onSelectDevice(sample.deviceId)
                      }
                    >
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {u.userId}
                      </td>
                      <td className="px-4 py-2.5">{u.devices.length}</td>
                      <td className="px-4 py-2.5">{u.online}</td>
                      <td className="px-4 py-2.5 text-fg-muted">
                        {[...u.countries].join(", ") || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {sample?.name || "—"}{" "}
                        <span className="text-fg-subtle">
                          ({sample?.ipType || sample?.network || "—"})
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={u.online > 0 ? "success" : "neutral"}>
                          {u.online > 0 ? "active" : "idle"}
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
                Select a device to see details, check proxy IP (
                <code className="text-fg">lumtest.com/myip.json</code>), and run
                a traffic job.
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
          {probeResult.lumtest && (
            <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-fg-subtle">
              {JSON.stringify(probeResult.lumtest, null, 2)}
            </pre>
          )}
          {probeResult.probe?.curlExample != null && (
            <p className="mt-2 break-all font-mono text-[10px] text-fg-subtle">
              {String(probeResult.probe.curlExample)}
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
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Withdrawals</h1>
      <Card className="p-4">
        <ul className="space-y-2">
          {ADMIN_WITHDRAWALS.map((w) => (
            <li
              key={w.id}
              className="rounded-xl border border-border bg-bg p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-fg-muted">{w.phone}</p>
                  <Money cents={w.amount} size="sm" className="mt-1 block" />
                  <p className="mt-0.5 text-[11px] text-fg-subtle">{w.at}</p>
                </div>
                <Badge
                  tone={
                    w.status === "paid"
                      ? "success"
                      : w.status === "pending"
                        ? "warning"
                        : "primary"
                  }
                >
                  {w.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
