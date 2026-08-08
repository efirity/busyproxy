import type { Plugin } from "vite";
import { WebSocketServer } from "ws";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { ensureEdgeProxyServers } from "./edge-proxy-server.mjs";
import { getTunnelHub } from "./edge-tunnel-hub.mjs";
import {
  cancelTrafficJob,
  getTrafficJob,
  listTrafficJobs,
  probeDeviceIp,
  runDeviceTrafficJob,
  startDeviceTrafficJob,
  testProxyExit,
} from "./edge-traffic-probe.mjs";
import {
  isEdgeAdminApiToken,
  requireAdminSession,
} from "./twilio-auth.mjs";

function bearerToken(req: {
  headers: { authorization?: string | string[] };
}): string | null {
  const h = req.headers.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  if (!v) return null;
  const m = /^Bearer\s+(.+)$/i.exec(v);
  return m?.[1] || null;
}

/** Phone agent routes stay open; everything else needs admin session. */
function isPublicEdgePath(sub: string): boolean {
  return (
    sub === "/agent/hello" ||
    sub === "/agent/bye" ||
    sub === "/architecture"
  );
}

export function edgeApiPlugin(): Plugin {
  const edge = getEdgeGateway();

  return {
    name: "relay-edge-api",
    // Dev + vite preview (production start script)
    configureServer(server) {
      // Start HTTP CONNECT + SOCKS5 gate listeners (dedicated ports)
      const proxy = ensureEdgeProxyServers();
      const hub = getTunnelHub();
      void proxy.listen().then((snap) => {
        console.log(
          `[edge-proxy] HTTP CONNECT :${snap.httpPort}  SOCKS5 :${snap.socksPort}`,
        );
      });

      // Phone reverse tunnels: wss://busyproxy.net/v1/tunnel
      const wss = new WebSocketServer({ noServer: true });
      const onUpgrade = (
        req: import("node:http").IncomingMessage,
        socket: import("node:stream").Duplex,
        head: Buffer,
      ) => {
        const url = req.url || "";
        if (
          !url.startsWith("/v1/tunnel") &&
          !url.startsWith("/api/edge/tunnel")
        ) {
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          hub.attach(ws, req);
        });
      };
      server.httpServer?.on("upgrade", onUpgrade);
      console.log("[edge-tunnel] WSS /v1/tunnel ready (phone reverse tunnels)");

      const apiMiddleware = async (req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathOnly = rawUrl.split("?", 1)[0] ?? "";
        if (!pathOnly.startsWith("/api/edge")) {
          next();
          return;
        }

        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(JSON.stringify(body));
        };

        const readJson = async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          if (!chunks.length) return {};
          try {
            return JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            return {};
          }
        };

        try {
          const method = (req.method ?? "GET").toUpperCase();
          const sub = pathOnly.slice("/api/edge".length) || "/";

          // Operator console + credentials/fleet/probe require admin phone session
          if (!isPublicEdgePath(sub)) {
            const token = bearerToken(req);
            if (!token) {
              send(401, {
                error: "Admin login required",
                code: "unauthorized",
              });
              return;
            }
            if (!isEdgeAdminApiToken(token)) {
              try {
                await requireAdminSession(token);
              } catch (err) {
                const status =
                  err && typeof err === "object" && "status" in err
                    ? Number((err as { status?: number }).status) || 403
                    : 403;
                send(status, {
                  error:
                    err instanceof Error ? err.message : "Admin login required",
                  code:
                    err && typeof err === "object" && "code" in err
                      ? (err as { code?: string }).code
                      : "forbidden",
                });
                return;
              }
            }
          }

          if ((sub === "/" || sub === "/status") && method === "GET") {
            send(200, {
              ...edge.snapshot(),
              proxyListeners: proxy.snapshot(),
              liveTunnels: {
                agents: hub.agentCount(),
                list: hub.listAgents(),
              },
            });
            return;
          }

          if (sub === "/architecture" && method === "GET") {
            send(200, edge.publicArchitecture());
            return;
          }

          if (sub === "/devices" && method === "GET") {
            send(200, { devices: edge.listDevices() });
            return;
          }

          // GET /proxy/fleet — admin-only rotating URI across all online phones
          if (
            (sub === "/proxy/fleet" || sub === "/fleet-proxy") &&
            method === "GET"
          ) {
            try {
              const access = edge.getFleetProxyAccess();
              send(200, {
                ok: true,
                ...access,
                http: access.endpoints?.httpDisplay || access.endpoints?.http,
                socks5:
                  access.endpoints?.socks5Display || access.endpoints?.socks5,
                curlExample: access.endpoints?.curlExample,
              });
            } catch (err) {
              send(400, {
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // GET /devices/:id/proxy — sticky operator URI pinned to this phone
          if (
            sub.startsWith("/devices/") &&
            sub.endsWith("/proxy") &&
            method === "GET"
          ) {
            const deviceId = decodeURIComponent(
              sub.slice("/devices/".length, -"/proxy".length),
            );
            try {
              // Prefer live mint when online; still return existing when offline
              const access = edge.getDeviceProxyAccess(deviceId, {
                requireOnline: false,
              });
              send(200, {
                ok: true,
                ...access,
                // Flatten common fields for the admin UI
                http: access.endpoints?.httpDisplay || access.endpoints?.http,
                socks5:
                  access.endpoints?.socks5Display || access.endpoints?.socks5,
                curlExample: access.endpoints?.curlExample,
              });
            } catch (err) {
              send(400, {
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // GET /devices/:id
          if (
            sub.startsWith("/devices/") &&
            method === "GET" &&
            !sub.includes("/exit") &&
            !sub.includes("/probe-ip") &&
            !sub.includes("/traffic") &&
            !sub.includes("/geo") &&
            !sub.includes("/proxy")
          ) {
            const deviceId = decodeURIComponent(sub.slice("/devices/".length));
            const device = edge.getDevice(deviceId);
            if (!device) {
              send(404, { error: "Device not found" });
              return;
            }
            send(200, { device });
            return;
          }

          // POST /devices/:id/geo — refresh country/city/ISP for egress IP
          if (
            sub.startsWith("/devices/") &&
            sub.endsWith("/geo") &&
            method === "POST"
          ) {
            const deviceId = decodeURIComponent(
              sub.slice("/devices/".length, -"/geo".length),
            );
            try {
              const device = await edge.refreshDeviceGeo(deviceId);
              send(200, { device });
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // DELETE /devices/:id — remove enrollment
          if (/^\/devices\/[^/]+$/.test(sub) && method === "DELETE") {
            const deviceId = decodeURIComponent(sub.slice("/devices/".length));
            try {
              send(200, edge.removeDevice(deviceId));
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // POST /devices/:id/probe-ip — exit IP via sticky proxy + whoami
          if (
            sub.startsWith("/devices/") &&
            sub.endsWith("/probe-ip") &&
            method === "POST"
          ) {
            const deviceId = decodeURIComponent(
              sub.slice("/devices/".length, -"/probe-ip".length),
            );
            const body = await readJson();
            try {
              const result = await probeDeviceIp(deviceId, body);
              // Always 200 with ok:true/false — 502 made the admin UI show
              // "Request failed (502)" for soft probe misses and crashed UX.
              send(200, result);
            } catch (err) {
              send(200, {
                ok: false,
                error: err instanceof Error ? err.message : String(err),
                matchNote:
                  "Probe failed. Ensure Sharing is ON and the agent is online.",
              });
            }
            return;
          }

          // POST /devices/:id/traffic — start long multi-MB job (async by default)
          if (
            sub.startsWith("/devices/") &&
            sub.endsWith("/traffic") &&
            method === "POST"
          ) {
            const deviceId = decodeURIComponent(
              sub.slice("/devices/".length, -"/traffic".length),
            );
            const body = (await readJson()) as Record<string, unknown>;
            try {
              // Default: 5 min / 25 MB async job so admin can watch real-time
              const asyncMode = body.wait !== true && body.sync !== true;
              if (asyncMode) {
                const job = startDeviceTrafficJob(deviceId, {
                  durationSec: body.durationSec ?? 180,
                  targetMb: body.targetMb ?? 100,
                  chunkMb: body.chunkMb ?? 1.5,
                  // Concurrent CONNECT streams through the phone (Streams UI)
                  // Keep concurrency low on 2GB droplet + phone tunnel (was 10 → OOM/502)
                  parallel: body.parallel ?? 3,
                  long: true,
                });
                send(202, job);
              } else {
                const result = await runDeviceTrafficJob(deviceId, {
                  durationSec: body.durationSec ?? 180,
                  targetMb: body.targetMb ?? 100,
                  chunkMb: body.chunkMb ?? 1.5,
                  parallel: body.parallel ?? 3,
                  long: true,
                });
                send(200, result);
              }
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // GET /devices/:id/traffic — list jobs for device
          if (
            sub.startsWith("/devices/") &&
            sub.endsWith("/traffic") &&
            method === "GET"
          ) {
            const deviceId = decodeURIComponent(
              sub.slice("/devices/".length, -"/traffic".length),
            );
            send(200, { jobs: listTrafficJobs(deviceId) });
            return;
          }

          // GET /traffic-jobs/:jobId
          if (sub.startsWith("/traffic-jobs/") && method === "GET") {
            const jobId = decodeURIComponent(sub.slice("/traffic-jobs/".length));
            const job = getTrafficJob(jobId);
            if (!job) {
              send(404, { error: "Job not found" });
              return;
            }
            send(200, job);
            return;
          }

          // POST /traffic-jobs/:jobId/cancel
          if (
            sub.startsWith("/traffic-jobs/") &&
            sub.endsWith("/cancel") &&
            method === "POST"
          ) {
            const jobId = decodeURIComponent(
              sub.slice("/traffic-jobs/".length, -"/cancel".length),
            );
            try {
              send(200, cancelTrafficJob(jobId));
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (
            sub.startsWith("/devices/") &&
            sub.endsWith("/exit") &&
            method === "POST"
          ) {
            const deviceId = sub.slice("/devices/".length, -"/exit".length);
            const body = await readJson();
            try {
              const device = edge.setExitEnabled(
                deviceId,
                body.enabled !== false,
              );
              send(200, { device });
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/agent/hello" && method === "POST") {
            const body = await readJson();
            try {
              send(200, edge.agentHello(body));
            } catch (err) {
              send(401, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/agent/bye" && method === "POST") {
            const body = await readJson();
            send(200, edge.agentBye(body.deviceId));
            return;
          }

          if (sub === "/credentials" && method === "GET") {
            send(200, { credentials: edge.listCredentials() });
            return;
          }

          if (sub === "/credentials" && method === "POST") {
            const body = await readJson();
            try {
              send(200, edge.mintCredential(body));
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub.startsWith("/credentials/") && method === "PATCH") {
            const credId = sub.slice("/credentials/".length);
            const body = await readJson();
            try {
              send(200, edge.updateCredential(credId, body));
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub.startsWith("/credentials/") && method === "DELETE") {
            const credId = sub.slice("/credentials/".length);
            try {
              send(200, edge.revokeCredential(credId));
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/connect-check" && method === "POST") {
            const body = await readJson();
            const result = edge.connectCheck(body);
            send(result.ok ? 200 : 403, result);
            return;
          }

          // POST /proxy-exit-test — live sticky/rotate exit via BusyProxy whoami
          if (sub === "/proxy-exit-test" && method === "POST") {
            const body = (await readJson()) as Record<string, unknown>;
            try {
              const result = await testProxyExit(body);
              // Soft failures stay 200 with ok:false (UI reads body, not HTTP status)
              send(200, result);
            } catch (err) {
              send(200, {
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/route" && method === "POST") {
            const body = await readJson();
            const result = edge.resolveRoute(body);
            send(result.ok ? 200 : 403, result);
            return;
          }

          if (sub === "/sessions" && method === "GET") {
            send(200, { sessions: edge.listStickySessions() });
            return;
          }

          if (sub === "/sessions/release" && method === "POST") {
            const body = await readJson();
            try {
              send(200, edge.releaseSticky(body));
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/uri-preview" && method === "POST") {
            const body = await readJson();
            send(200, edge.uriPreview(body));
            return;
          }

          if (sub === "/proxy/status" && method === "GET") {
            send(200, proxy.snapshot());
            return;
          }

          send(404, { error: "not found" });
        } catch (err) {
          send(500, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      };
      server.middlewares.use(apiMiddleware);
    },
  };
}
