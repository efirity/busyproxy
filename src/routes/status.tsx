import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, RefreshCw, Shield } from "lucide-react";
import { OperatorShell } from "@/components/admin/operator-shell";
import { MarketingShell } from "@/components/layout/shell";
import { Badge, Button, Card, SectionLabel } from "@/components/ui/primitives";
import { isOperatorHost, isStatusHost } from "@/lib/host";
import { cn } from "@/lib/utils";

/** Full infra detail only on status.* or admin/portal hosts. */
function wantsAdminStatusDetail(host?: string): boolean {
  return isStatusHost(host) || isOperatorHost(host);
}

export const Route = createFileRoute("/status")({
  head: () => {
    const admin =
      typeof window !== "undefined" && wantsAdminStatusDetail();
    return {
      meta: [
        {
          title: admin
            ? "BusyProxy Admin Status"
            : "BusyProxy Status",
        },
        {
          name: "description",
          content: admin
            ? "Operator system status: database, SMS, proxy gates, tunnels, fleet."
            : "Live BusyProxy platform status — is the service operational?",
        },
        {
          name: "robots",
          content: admin ? "noindex,nofollow" : "index,follow",
        },
      ],
      links: [
        {
          rel: "canonical",
          href: admin
            ? "https://status.busyproxy.net/"
            : "https://busyproxy.net/status",
        },
      ],
    };
  },
  component: StatusRoute,
});

type PublicStatus = {
  status: "operational" | "degraded" | "down" | string;
  time: string;
  message?: string;
  service?: string;
};

type AdminStatus = PublicStatus & {
  checks: Record<string, { ok: boolean; detail: string }>;
  fleet: {
    devices: number;
    online: number;
    mobileOnline: number;
    liveAgents: number;
    credentials: number;
    stickySessions: number;
  };
  proxy: {
    connects: number;
    denies: number;
    viaTunnel: number;
    viaEdgeDial: number;
    httpPort: number;
    socksPort: number;
  };
  metrics: Record<string, unknown>;
  rateLimits?: unknown;
  note?: string;
};

function toneFor(status: string) {
  if (status === "operational") return "success" as const;
  if (status === "degraded") return "warning" as const;
  return "danger" as const;
}

function headlineFor(status: string) {
  if (status === "operational") return "All systems operational";
  if (status === "degraded") return "Partial disruption";
  return "Service disruption";
}

function StatusRoute() {
  // Defer host check to client so SSR/hydration match (hostname is browser-only).
  const [mode, setMode] = useState<"pending" | "public" | "admin">("pending");

  useEffect(() => {
    setMode(wantsAdminStatusDetail() ? "admin" : "public");
  }, []);

  if (mode === "pending") {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // status.busyproxy.net → full admin status (auth-gated)
  if (mode === "admin") {
    return (
      <OperatorShell>
        <AdminStatusPage />
      </OperatorShell>
    );
  }
  return <PublicStatusPage />;
}

function PublicStatusPage() {
  const [data, setData] = useState<PublicStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json = (await res.json()) as PublicStatus;
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, []);

  const status = data?.status ?? (err ? "down" : null);

  return (
    <MarketingShell>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
        <SectionLabel>Public status</SectionLabel>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          BusyProxy
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Is the platform running?
        </p>

        <Card className="mt-10 w-full p-8">
          {busy && !data && !err ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-fg-muted">Checking…</p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "mx-auto flex h-16 w-16 items-center justify-center rounded-full border",
                  status === "operational" &&
                    "border-success/40 bg-success/10 text-success",
                  status === "degraded" &&
                    "border-warning/40 bg-warning/10 text-warning",
                  (status === "down" || !status) &&
                    "border-danger/40 bg-danger/10 text-danger",
                )}
              >
                <Activity className="h-7 w-7" />
              </div>
              <div className="mt-5 flex flex-col items-center gap-2">
                {status && (
                  <Badge tone={toneFor(status)} className="capitalize">
                    {status}
                  </Badge>
                )}
                <p className="text-lg font-semibold tracking-tight">
                  {err
                    ? "Unable to reach status"
                    : data?.message || (status ? headlineFor(status) : "—")}
                </p>
                {data?.time && (
                  <p className="text-xs text-fg-subtle">
                    Updated {new Date(data.time).toLocaleString()}
                  </p>
                )}
                {err && (
                  <p className="mt-2 text-sm text-danger">{err}</p>
                )}
              </div>
            </>
          )}
        </Card>

        <Button
          size="sm"
          variant="secondary"
          className="mt-6"
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
      </div>
    </MarketingShell>
  );
}

function adminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("relay_session_token");
  } catch {
    return null;
  }
}

function AdminStatusPage() {
  const [data, setData] = useState<AdminStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const t = adminToken();
      const res = await fetch("/api/status/admin", {
        cache: "no-store",
        headers: t ? { authorization: `Bearer ${t}` } : {},
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          (json as { error?: string }).error || `Request failed (${res.status})`,
        );
      }
      setData(json as AdminStatus);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SectionLabel>Admin status</SectionLabel>
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
              <Shield className="h-3 w-3" />
              operators only
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            System status
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Full health of edge, tunnels, database, SMS, and proxy gates.
            Public visitors only see aggregate up/down at{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://busyproxy.net/status"
            >
              busyproxy.net/status
            </a>
            .
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
          Refresh
        </Button>
      </div>

      {err && (
        <p className="mt-6 rounded-xl border border-danger/40 bg-danger-soft/30 px-4 py-3 text-sm text-danger">
          {err}
        </p>
      )}

      {data && (
        <div className="mt-8 space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={toneFor(data.status)}>{data.status}</Badge>
              <span className="text-sm text-fg-muted">
                {data.message || headlineFor(data.status)}
              </span>
              <span className="text-sm text-fg-subtle">
                · Updated {new Date(data.time).toLocaleString()}
              </span>
            </div>
            {data.note && (
              <p className="mt-3 text-xs text-fg-subtle">{data.note}</p>
            )}
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(data.checks || {}).map(([name, c]) => (
              <Card key={name} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">
                    {name.replace(/([A-Z])/g, " $1")}
                  </p>
                  <Badge tone={c.ok ? "success" : "danger"}>
                    {c.ok ? "ok" : "issue"}
                  </Badge>
                </div>
                <p className="mt-2 font-mono text-xs text-fg-muted">
                  {c.detail}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-fg-muted">Devices online</p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {data.fleet.online}
                <span className="text-sm font-normal text-fg-muted">
                  /{data.fleet.devices}
                </span>
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-fg-muted">Live phone tunnels</p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {data.fleet.liveAgents}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-fg-muted">Mobile online</p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {data.fleet.mobileOnline}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <SectionLabel>Proxy gate</SectionLabel>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-fg-subtle">Connects / denies</dt>
                <dd className="font-mono">
                  {data.proxy.connects} / {data.proxy.denies}
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">via tunnel / edge dial</dt>
                <dd className="font-mono">
                  {data.proxy.viaTunnel} / {data.proxy.viaEdgeDial}
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">HTTP port</dt>
                <dd className="font-mono">{data.proxy.httpPort}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle">SOCKS port</dt>
                <dd className="font-mono">{data.proxy.socksPort}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <SectionLabel>Runtime metrics</SectionLabel>
            <pre
              className={cn(
                "mt-3 max-h-64 overflow-auto rounded-lg border border-border bg-bg p-3 font-mono text-[11px] text-fg-muted",
              )}
            >
              {JSON.stringify(
                { metrics: data.metrics, rateLimits: data.rateLimits },
                null,
                2,
              )}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}
