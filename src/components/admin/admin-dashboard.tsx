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
import {
  ADMIN_KPIS,
  ADMIN_USERS,
  ADMIN_WITHDRAWALS,
} from "@/data/demo";
import {
  type EdgeCredential,
  type EdgeDevice,
  type EdgeSnapshot,
  type StickySession,
  connectCheck,
  fetchEdgeSnapshot,
  mintCredential,
  patchCredential,
  releaseSticky,
  revokeCredential,
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
  const [section, setSection] = useState<Section>("proxies");
  const [edge, setEdge] = useState<EdgeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
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
            onToggleExit={(d, enabled) =>
              void run(async () => {
                await setDeviceExit(d.deviceId, enabled);
              })
            }
            onRefresh={() => void run(async () => {})}
          />
        )}
        {section === "users" && <UsersSection />}
        {section === "devices" && (
          <DevicesSection devices={edge?.devices || []} />
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
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-fg-muted">
          Earners, fleet capacity, proxy gate health
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_KPIS.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-fg-muted">{k.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular">
              {k.value}
            </p>
            {k.delta && (
              <p className="mt-1 text-xs text-fg-subtle">{k.delta}</p>
            )}
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Mobile exits online"
          value={String(edge?.stats.mobileOnline ?? "—")}
        />
        <Stat label="All online" value={String(edge?.stats.online ?? "—")} />
        <Stat
          label="Sticky sessions"
          value={String(edge?.stats.stickySessions ?? "—")}
        />
      </div>
      <Card className="p-5">
        <SectionLabel>How to use proxies</SectionLabel>
        <p className="mt-2 text-sm text-fg-muted">
          Open <strong className="text-fg">Proxy access</strong> → mint a
          credential → copy rotating or sticky URI. Default pool is{" "}
          <strong className="text-fg">mobile/cellular</strong> so IP checkers
          see carrier ASN.
        </p>
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
}: {
  edge: EdgeSnapshot | null;
  busy: boolean;
  onToggleExit: (d: EdgeDevice, enabled: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fleet & tunnels
          </h1>
          <p className="text-sm text-fg-muted">
            Reverse tunnels · lastPublicIp is metadata only
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">Device</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Carrier / ASN</th>
                <th className="px-4 py-2 font-medium">CC</th>
                <th className="px-4 py-2 font-medium">IP meta</th>
                <th className="px-4 py-2 font-medium">Exit</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(edge?.devices || []).map((d) => (
                <tr key={d.deviceId} className="border-b border-border/60">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{d.name}</p>
                    <p className="font-mono text-[10px] text-fg-subtle">
                      {d.deviceId}
                    </p>
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
                  <td className="px-4 py-2.5 text-xs text-fg-muted">
                    {d.carrier || "—"}
                    <br />
                    <span className="font-mono text-[10px]">{d.asn}</span>
                  </td>
                  <td className="px-4 py-2.5">{d.country}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-fg-subtle">
                    {d.lastPublicIp || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleExit(d, !d.exitEnabled)}
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

function UsersSection() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">CC</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
                <th className="px-4 py-2 font-medium text-right">Lifetime</th>
                <th className="px-4 py-2 font-medium">Devices</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_USERS.map((u) => (
                <tr key={u.phone} className="border-b border-border/60">
                  <td className="px-4 py-2.5 font-mono text-xs">{u.phone}</td>
                  <td className="px-4 py-2.5">{u.name}</td>
                  <td className="px-4 py-2.5 text-fg-muted">{u.country}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Money cents={u.balance} size="sm" />
                  </td>
                  <td className="px-4 py-2.5 text-right text-fg-muted">
                    <Money cents={u.lifetime} size="sm" />
                  </td>
                  <td className="px-4 py-2.5">{u.devices}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.status === "active" ? "success" : "danger"}>
                      {u.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function DevicesSection({ devices }: { devices: EdgeDevice[] }) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {devices.map((d) => (
          <Card key={d.deviceId} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="font-mono text-[11px] text-fg-subtle">
                  {d.deviceId}
                </p>
              </div>
              <Badge tone={d.online ? "success" : "neutral"}>
                {d.online ? "online" : "offline"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              {d.ipType || d.network} · {d.country} · {d.carrier || "—"}
            </p>
          </Card>
        ))}
      </div>
    </>
  );
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
