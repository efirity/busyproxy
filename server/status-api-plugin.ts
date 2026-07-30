/**
 * System status APIs:
 * - Public: /api/status, /api/health — aggregate only (no vendor/infra detail)
 * - Admin:  /api/status/admin — full checks (requires admin session / EDGE token)
 */
import type { Plugin } from "vite";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { ensureEdgeProxyServers } from "./edge-proxy-server.mjs";
import { getTunnelHub } from "./edge-tunnel-hub.mjs";
import { getMetrics } from "./edge-metrics.mjs";
import { rateLimitSnapshot } from "./edge-rate-limit.mjs";
import { getEdgeStatePath } from "./edge-store.mjs";
import { supabaseConfigured } from "./supabase.mjs";
import {
  isEdgeAdminApiToken,
  requireAdminSession,
  twilioConfigured,
} from "./twilio-auth.mjs";

export type PublicStatus = {
  status: "operational" | "degraded" | "down";
  service: string;
  time: string;
  message: string;
};

export type AdminStatus = PublicStatus & {
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
    httpListening: boolean;
    socksListening: boolean;
  };
  metrics: Record<string, unknown>;
  rateLimits: unknown;
  note?: string;
};

function computeInternal() {
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

  const status: PublicStatus["status"] =
    degraded.length === 0
      ? "operational"
      : degraded.length >= 3
        ? "down"
        : "degraded";

  const message =
    status === "operational"
      ? "All systems operational"
      : status === "degraded"
        ? "Some systems are experiencing issues"
        : "Major outage — core services unavailable";

  return {
    status,
    message,
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
      httpListening: Boolean(proxy.httpListening),
      socksListening: Boolean(proxy.socksListening),
    },
    metrics,
    rateLimits: rateLimitSnapshot(),
  };
}

/** Public aggregate only — safe for marketing status page & uptime monitors. */
export function buildPublicStatus(): PublicStatus {
  const internal = computeInternal();
  return {
    status: internal.status,
    service: "BusyProxy",
    time: new Date().toISOString(),
    message: internal.message,
  };
}

/** Full operator status — never expose without admin auth. */
export function buildAdminStatus(): AdminStatus {
  const internal = computeInternal();
  return {
    status: internal.status,
    service: "BusyProxy",
    time: new Date().toISOString(),
    message: internal.message,
    checks: internal.checks,
    fleet: internal.fleet,
    proxy: internal.proxy,
    metrics: internal.metrics as Record<string, unknown>,
    rateLimits: internal.rateLimits,
    note: "Admin status — infrastructure detail is not public.",
  };
}

function bearer(req: { headers: { authorization?: string | string[] } }) {
  const h = req.headers.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  if (!v) return null;
  const m = /^Bearer\s+(.+)$/i.exec(v);
  return m?.[1] || null;
}

async function assertAdmin(req: {
  headers: { authorization?: string | string[] };
}) {
  const token = bearer(req);
  if (!token) {
    const err = new Error("Admin login required");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (isEdgeAdminApiToken(token)) {
    return { user: { id: "edge-admin-token", phone: "system", isAdmin: true } };
  }
  return requireAdminSession(token);
}

function sendJson(
  res: {
    statusCode: number;
    setHeader: (k: string, v: string) => void;
    end: (b: string) => void;
  },
  code: number,
  body: unknown,
) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function statusApiPlugin(): Plugin {
  return {
    name: "relay-status-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";

        // ── Public (aggregate only) ──────────────────────────────────
        if (pathOnly === "/api/status" || pathOnly === "/api/health") {
          try {
            const body = buildPublicStatus();
            const code = body.status === "down" ? 503 : 200;
            res.statusCode = code;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.setHeader("cache-control", "no-store");
            res.setHeader("access-control-allow-origin", "*");
            res.end(JSON.stringify(body));
          } catch (err) {
            sendJson(res, 500, {
              status: "down",
              service: "BusyProxy",
              time: new Date().toISOString(),
              message: "Status check failed",
              error: err instanceof Error ? err.message : String(err),
            });
          }
          return;
        }

        // ── Admin full detail ────────────────────────────────────────
        if (pathOnly === "/api/status/admin" || pathOnly === "/api/admin/status") {
          if ((req.method ?? "GET").toUpperCase() === "OPTIONS") {
            res.statusCode = 204;
            res.setHeader("access-control-allow-origin", "*");
            res.setHeader(
              "access-control-allow-headers",
              "authorization, content-type",
            );
            res.end();
            return;
          }
          try {
            await assertAdmin(req);
            const body = buildAdminStatus();
            const code = body.status === "down" ? 503 : 200;
            sendJson(res, code, body);
          } catch (err) {
            const status =
              err && typeof err === "object" && "status" in err
                ? Number((err as { status?: number }).status) || 403
                : 403;
            sendJson(res, status, {
              error: err instanceof Error ? err.message : "Forbidden",
            });
          }
          return;
        }

        next();
      });
    },
  };
}
