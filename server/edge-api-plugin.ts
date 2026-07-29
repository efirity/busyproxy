import type { Plugin } from "vite";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { ensureEdgeProxyServers } from "./edge-proxy-server.mjs";

export function edgeApiPlugin(): Plugin {
  const edge = getEdgeGateway();

  return {
    name: "relay-edge-api",
    apply: "serve",
    configureServer(server) {
      // Start HTTP CONNECT + SOCKS5 gate listeners (dedicated ports)
      const proxy = ensureEdgeProxyServers();
      void proxy.listen().then((snap) => {
        console.log(
          `[edge-proxy] HTTP CONNECT :${snap.httpPort}  SOCKS5 :${snap.socksPort}`,
        );
      });

      server.middlewares.use(async (req, res, next) => {
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

          if ((sub === "/" || sub === "/status") && method === "GET") {
            send(200, {
              ...edge.snapshot(),
              proxyListeners: proxy.snapshot(),
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
      });
    },
  };
}
