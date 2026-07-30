/**
 * Public system status (no auth) for /api/status and marketing status page.
 */
import type { Plugin } from "vite";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { ensureEdgeProxyServers } from "./edge-proxy-server.mjs";
import { getTunnelHub } from "./edge-tunnel-hub.mjs";
import { getMetrics } from "./edge-metrics.mjs";
import { rateLimitSnapshot } from "./edge-rate-limit.mjs";
import { getEdgeStatePath } from "./edge-store.mjs";
import { supabaseConfigured } from "./supabase.mjs";
import { twilioConfigured } from "./twilio-auth.mjs";

export function buildPublicStatus() {
  const edge = getEdgeGateway();
  const proxy = ensureEdgeProxyServers().snapshot();
  const hub = getTunnelHub();
  const snap = edge.snapshot();
  const metrics = getMetrics();
  const online = snap.stats?.online ?? 0;
  const mobileOnline = snap.stats?.mobileOnline ?? 0;
  const agents = hub.agentCount?.() ?? hub.listAgents?.()?.length ?? 0;

  const checks = {
    web: { ok: true, detail: "process up" },
    database: {
      ok: supabaseConfigured(),
      detail: supabaseConfigured() ? "supabase configured" : "missing",
    },
    sms: {
      ok: twilioConfigured(),
      detail: twilioConfigured() ? "twilio configured" : "missing",
    },
    proxyHttp: {
      ok: Boolean(proxy.httpListening),
      detail: proxy.httpListening
        ? `listening :${proxy.httpPort}`
        : "not listening",
    },
    proxySocks: {
      ok: Boolean(proxy.socksListening),
      detail: proxy.socksListening
        ? `listening :${proxy.socksPort}`
        : "not listening",
    },
    reverseTunnel: {
      ok: agents >= 0,
      detail: `${agents} phone agent(s) connected`,
    },
    edgePersistence: {
      ok: true,
      detail: getEdgeStatePath(),
    },
  };

  const degraded: string[] = [];
  if (!checks.database.ok) degraded.push("database");
  if (!checks.sms.ok) degraded.push("sms");
  if (!checks.proxyHttp.ok) degraded.push("proxy_http");
  if (!checks.proxySocks.ok) degraded.push("proxy_socks");

  const overall =
    degraded.length === 0 ? "operational" : degraded.length >= 3 ? "down" : "degraded";

  return {
    status: overall,
    service: "BusyProxy",
    time: new Date().toISOString(),
    checks,
    fleet: {
      devices: snap.stats?.devices ?? 0,
      online,
      mobileOnline,
      liveAgents: agents,
      credentials: snap.stats?.credentials ?? 0,
      stickySessions: snap.stats?.stickySessions ?? 0,
    },
    proxy: {
      connects: proxy.connects,
      denies: proxy.denies,
      viaTunnel: proxy.viaTunnel,
      viaEdgeDial: proxy.viaEdgeDial,
      httpPort: proxy.httpPort,
      socksPort: proxy.socksPort,
    },
    metrics,
    rateLimits: rateLimitSnapshot(),
    note:
      "Public status. Admin console and proxy credentials remain authenticated.",
  };
}

export function statusApiPlugin(): Plugin {
  return {
    name: "relay-status-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";
        if (pathOnly !== "/api/status" && pathOnly !== "/api/health") {
          next();
          return;
        }
        try {
          const body = buildPublicStatus();
          const code = body.status === "down" ? 503 : 200;
          res.statusCode = code;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.setHeader("access-control-allow-origin", "*");
          res.end(JSON.stringify(body));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              status: "down",
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      });
    },
  };
}
