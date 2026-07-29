import type { Plugin } from "vite";
import { createProxyEngine } from "./proxy-engine.mjs";

type Engine = ReturnType<typeof createProxyEngine>;

declare global {
  // eslint-disable-next-line no-var
  var __relayProxyEngine: Engine | undefined;
}

/**
 * Vite middleware:
 *  - /api/proxy/* control plane
 * Exposes real HTTP + SOCKS5 listeners when started from the UI.
 * Engine is stored on globalThis so HMR does not orphan bound ports.
 */
export function proxyApiPlugin(): Plugin {
  const engine: Engine = (globalThis.__relayProxyEngine ??= createProxyEngine());

  return {
    name: "relay-proxy-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathOnly = rawUrl.split("?", 1)[0] ?? "";
        if (!pathOnly.startsWith("/api/proxy")) {
          next();
          return;
        }

        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(JSON.stringify(body));
        };

        try {
          const method = (req.method ?? "GET").toUpperCase();
          const sub = pathOnly.slice("/api/proxy".length) || "/";

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

          if (sub === "/status" && method === "GET") {
            send(200, engine.snapshot());
            return;
          }

          if (sub === "/start" && method === "POST") {
            const body = await readJson();
            try {
              const snap = await engine.start(body);
              send(200, snap);
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
                ...engine.snapshot(),
              });
            }
            return;
          }

          if (sub === "/stop" && method === "POST") {
            const snap = await engine.stop();
            send(200, snap);
            return;
          }

          if (sub === "/config" && method === "POST") {
            const body = await readJson();
            send(200, engine.applyConfig(body));
            return;
          }

          if (sub === "/detect" && method === "POST") {
            await engine.detectIps();
            send(200, engine.snapshot());
            return;
          }

          send(404, { error: "not found" });
        } catch (err) {
          send(500, { error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
