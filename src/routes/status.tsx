import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { MarketingShell } from "@/components/layout/shell";
import { Badge, Button, Card, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "BusyProxy System Status" },
      {
        name: "description",
        content:
          "Live BusyProxy platform status: website, proxy gate, reverse tunnels, and fleet health.",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "https://busyproxy.net/status" }],
  }),
  component: StatusPage,
});

type StatusPayload = {
  status: "operational" | "degraded" | "down" | string;
  time: string;
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
  note?: string;
};

function toneFor(status: string) {
  if (status === "operational") return "success" as const;
  if (status === "degraded") return "warning" as const;
  return "danger" as const;
}

function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json = (await res.json()) as StatusPayload;
      setData(json);
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
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Public status</SectionLabel>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              System status
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              Live health of BusyProxy edge, tunnels, and control plane.
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
                  Updated {new Date(data.time).toLocaleString()}
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
                {JSON.stringify(data.metrics, null, 2)}
              </pre>
            </Card>
          </div>
        )}
      </div>
    </MarketingShell>
  );
}
