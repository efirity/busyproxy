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
  connectCheck,
  fetchEdgeSnapshot,
  mintCredential,
  patchCredential,
  revokeCredential,
  setDeviceExit,
} from "@/lib/edge-client";
import { cn } from "@/lib/utils";

type Section =
  | "overview"
  | "gateway"
  | "users"
  | "devices"
  | "traffic"
  | "withdrawals"
  | "risk";

const nav: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "gateway", label: "Edge gateway", icon: Network },
  { id: "users", label: "Users", icon: Users },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "traffic", label: "Traffic", icon: Activity },
  { id: "withdrawals", label: "Withdrawals", icon: Wallet },
  { id: "risk", label: "Risk", icon: Flag },
];

export function AdminDashboard() {
  const [section, setSection] = useState<Section>("gateway");
  const [edge, setEdge] = useState<EdgeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mintedPass, setMintedPass] = useState<{
    user: string;
    pass: string;
    id: string;
  } | null>(null);
  const [allowlistDraft, setAllowlistDraft] = useState("89.28.43.197");
  const [testSourceIp, setTestSourceIp] = useState("89.28.43.197");

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

        {section === "overview" && <OverviewSection />}
        {section === "gateway" && (
          <GatewaySection
            edge={edge}
            busy={busy}
            msg={msg}
            err={err}
            mintedPass={mintedPass}
            allowlistDraft={allowlistDraft}
            testSourceIp={testSourceIp}
            setAllowlistDraft={setAllowlistDraft}
            setTestSourceIp={setTestSourceIp}
            onRefresh={() => void run(async () => {})}
            onMint={(deviceId) =>
              void run(async () => {
                const ips = allowlistDraft
                  .split(/[\s,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const cred = await mintCredential({
                  label: "Operator access",
                  boundDeviceId: deviceId || null,
                  allowlistIps: ips,
                });
                if (cred.password) {
                  setMintedPass({
                    user: cred.username,
                    pass: cred.password,
                    id: cred.id,
                  });
                }
                setMsg(
                  `Credential ${cred.username} minted. Password shown once below.`,
                );
              })
            }
            onToggleExit={(d, enabled) =>
              void run(async () => {
                await setDeviceExit(d.deviceId, enabled);
                setMsg(
                  `${d.name}: exit ${enabled ? "enabled" : "disabled"} (earner does not see proxy details)`,
                );
              })
            }
            onPatchAllowlist={(c, ips) =>
              void run(async () => {
                await patchCredential(c.id, { allowlistIps: ips });
                setMsg(`Allowlist updated for ${c.username}`);
              })
            }
            onToggleCred={(c, enabled) =>
              void run(async () => {
                await patchCredential(c.id, { enabled });
                setMsg(`${c.username} ${enabled ? "enabled" : "disabled"}`);
              })
            }
            onRevoke={(c) =>
              void run(async () => {
                await revokeCredential(c.id);
                if (mintedPass?.id === c.id) setMintedPass(null);
                setMsg(`Revoked ${c.username}`);
              })
            }
            onTestConnect={() =>
              void run(async () => {
                if (!mintedPass && !edge?.credentials[0]) {
                  throw new Error("Mint a credential first");
                }
                const user = mintedPass?.user || edge!.credentials[0].username;
                const pass =
                  mintedPass?.pass ||
                  (await patchCredential(edge!.credentials[0].id, {
                    rotatePassword: true,
                  }).then((r) => r.password || ""));
                if (!pass) throw new Error("Need password — mint or rotate");
                const result = await connectCheck({
                  username: user,
                  password: pass,
                  sourceIp: testSourceIp,
                  targetHost: "ifconfig.me",
                });
                setMsg(JSON.stringify(result, null, 2));
              })
            }
          />
        )}
        {section === "users" && <UsersSection />}
        {section === "devices" && (
          <DevicesSection devices={edge?.devices || []} />
        )}
        {section === "traffic" && (
          <Card className="p-5">
            <SectionLabel>Traffic</SectionLabel>
            <p className="mt-2 text-sm text-fg-muted">
              Live edge events feed metering. Full timeseries hooks to Supabase
              traffic_samples in production.
            </p>
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
              Disable exit on a device from Edge gateway without showing proxy
              URLs to the earner. Combine with IP allowlists on credentials.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}

function OverviewSection() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-fg-muted">
          Users, devices, traffic liability & payouts
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_KPIS.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-fg-muted">{k.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular tracking-tight">
              {k.value}
            </p>
            {k.delta && (
              <p className="mt-1 text-xs text-fg-subtle">{k.delta}</p>
            )}
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <SectionLabel>Network model</SectionLabel>
        <p className="mt-2 text-sm text-fg-muted">
          Reverse tunnels — never dial the phone IP. Open{" "}
          <strong className="text-fg">Edge gateway</strong> to mint credentials,
          allowlist your IP, and enable exits.
        </p>
      </Card>
    </>
  );
}

function GatewaySection({
  edge,
  busy,
  msg,
  err,
  mintedPass,
  allowlistDraft,
  testSourceIp,
  setAllowlistDraft,
  setTestSourceIp,
  onRefresh,
  onMint,
  onToggleExit,
  onPatchAllowlist,
  onToggleCred,
  onRevoke,
  onTestConnect,
}: {
  edge: EdgeSnapshot | null;
  busy: boolean;
  msg: string | null;
  err: string | null;
  mintedPass: { user: string; pass: string; id: string } | null;
  allowlistDraft: string;
  testSourceIp: string;
  setAllowlistDraft: (s: string) => void;
  setTestSourceIp: (s: string) => void;
  onRefresh: () => void;
  onMint: (deviceId: string) => void;
  onToggleExit: (d: EdgeDevice, enabled: boolean) => void;
  onPatchAllowlist: (c: EdgeCredential, ips: string[]) => void;
  onToggleCred: (c: EdgeCredential, enabled: boolean) => void;
  onRevoke: (c: EdgeCredential) => void;
  onTestConnect: () => void;
}) {
  const arch = edge?.architecture;
  const [bindDevice, setBindDevice] = useState("");

  useEffect(() => {
    if (!bindDevice && edge?.devices[0]) {
      setBindDevice(edge.devices.find((d) => d.online)?.deviceId || edge.devices[0].deviceId);
    }
  }, [edge, bindDevice]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edge gateway
          </h1>
          <p className="text-sm text-fg-muted">
            Reverse-tunnel control plane · stable customer endpoints · operator
            credentials
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={onRefresh}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {arch && (
        <Card className="p-5">
          <SectionLabel>Architecture decision</SectionLabel>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {arch.summary}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Customer HTTP", arch.hosts.gateHttp],
              ["Customer SOCKS5", arch.hosts.gateSocks],
              ["Agent tunnel", arch.hosts.agent],
              ["B2B alias", arch.hosts.b2bAlias],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl border border-border bg-bg px-3 py-2.5"
              >
                <p className="text-[10px] uppercase tracking-wider text-fg-subtle">
                  {k}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-fg">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Note title="Why not phone IP?" body={arch.whyNotDirectIp} />
            <Note title="How we stay fast" body={arch.speed} />
            <Note title="Earner transparency" body={arch.earnerTransparency} />
          </div>
          <p className="mt-3 text-[11px] text-fg-subtle">
            Use <span className="font-mono">gate.busyproxy.net</span> as the real
            entry. Optional{" "}
            <span className="font-mono">{arch.hosts.b2bAlias}</span> CNAME for
            BusyMate B2B branding — same cluster.
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Devices online"
          value={`${edge?.stats.online ?? "—"} / ${edge?.stats.devices ?? "—"}`}
        />
        <Stat
          label="Credentials"
          value={String(edge?.stats.credentials ?? "—")}
        />
        <Stat label="Events" value={String(edge?.stats.events ?? "—")} />
      </div>

      {/* Devices / tunnels */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <SectionLabel>Fleet tunnels</SectionLabel>
          <p className="mt-1 text-xs text-fg-muted">
            Online = reverse tunnel connected. lastPublicIp is metadata only —
            routing uses tunnel id.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">Device</th>
                <th className="px-4 py-2 font-medium">Net</th>
                <th className="px-4 py-2 font-medium">CC</th>
                <th className="px-4 py-2 font-medium">Tunnel</th>
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
                  <td className="px-4 py-2.5 text-fg-muted">{d.network}</td>
                  <td className="px-4 py-2.5">{d.country}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-fg-muted">
                    {d.tunnelId || "—"}
                  </td>
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

      {/* Mint credential */}
      <Card className="p-5">
        <SectionLabel>Mint access (hidden from earner)</SectionLabel>
        <p className="mt-2 text-sm text-fg-muted">
          Creates HTTP/SOCKS user:pass for{" "}
          <span className="font-mono text-fg">gate.busyproxy.net</span>. Bind to
          a device and lock to your office IPs.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-fg-muted">
            Bind device
            <select
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              value={bindDevice}
              onChange={(e) => setBindDevice(e.target.value)}
            >
              <option value="">Any online (pool)</option>
              {(edge?.devices || []).map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.name} · {d.country} · {d.online ? "online" : "off"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-fg-muted">
            Source IP allowlist (comma-separated)
            <input
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm text-fg"
              value={allowlistDraft}
              onChange={(e) => setAllowlistDraft(e.target.value)}
              placeholder="89.28.43.197, 10.0.0.0/8"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={() => onMint(bindDevice)}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Mint credential
          </Button>
        </div>
        {mintedPass && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">
              Password shown once — store in vault
            </p>
            <CopyRow label="Username" value={mintedPass.user} />
            <CopyRow label="Password" value={mintedPass.pass} />
            <CopyRow
              label="HTTP proxy"
              value={`http://${mintedPass.user}:${mintedPass.pass}@${edge?.architecture.hosts.gateHttp || "gate.busyproxy.net:8080"}`}
            />
            <CopyRow
              label="SOCKS5"
              value={`socks5://${mintedPass.user}:${mintedPass.pass}@${edge?.architecture.hosts.gateSocks || "gate.busyproxy.net:1080"}`}
            />
          </div>
        )}
      </Card>

      {/* Credentials table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <SectionLabel>Credentials</SectionLabel>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Device</th>
                <th className="px-4 py-2 font-medium">Allowlist</th>
                <th className="px-4 py-2 font-medium">Uses</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(edge?.credentials || []).map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs">{c.username}</p>
                    <p className="text-[10px] text-fg-subtle">{c.label}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-fg-muted">
                    {c.boundDeviceId || "pool"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-fg-muted">
                    {c.allowlistIps.length
                      ? c.allowlistIps.join(", ")
                      : "any IP"}
                  </td>
                  <td className="px-4 py-2.5">{c.useCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onToggleCred(c, !c.enabled)}
                      >
                        {c.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          onPatchAllowlist(
                            c,
                            allowlistDraft
                              .split(/[\s,]+/)
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                      >
                        <Shield className="h-3 w-3" />
                        Set allowlist
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onRevoke(c)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!edge?.credentials?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-fg-muted"
                  >
                    No credentials yet — mint one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Connect test */}
      <Card className="p-5">
        <SectionLabel>Authorize test (simulate customer)</SectionLabel>
        <p className="mt-2 text-xs text-fg-muted">
          Checks user/pass + source IP allowlist + device online — same logic as
          the edge before opening a multiplexed stream.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block text-xs text-fg-muted">
            Source IP
            <input
              className="mt-1 w-44 rounded-xl border border-border bg-bg px-3 py-2 font-mono text-sm"
              value={testSourceIp}
              onChange={(e) => setTestSourceIp(e.target.value)}
            />
          </label>
          <Button disabled={busy} onClick={onTestConnect}>
            Run connect-check
          </Button>
        </div>
      </Card>

      {(msg || err) && (
        <pre
          className={cn(
            "max-h-64 overflow-auto rounded-xl border px-4 py-3 text-xs",
            err
              ? "border-danger/40 bg-danger-soft/30 text-danger"
              : "border-border bg-bg text-fg-muted",
          )}
        >
          {err || msg}
        </pre>
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
    <div className="mt-2 flex items-start gap-2">
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      </div>
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
                    <Badge
                      tone={u.status === "active" ? "success" : "danger"}
                    >
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <p className="text-sm text-fg-muted">
          Same fleet as Edge gateway · reverse tunnels
        </p>
      </div>
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
              {d.network} · {d.country} · exit{" "}
              {d.exitEnabled ? "on" : "off"}
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Withdrawals</h1>
      </div>
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
