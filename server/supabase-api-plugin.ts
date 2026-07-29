import type { Plugin } from "vite";
import { createStripeEngine } from "./stripe-engine.mjs";
import * as sb from "./supabase.mjs";

type Engine = ReturnType<typeof createStripeEngine>;

declare global {
  // eslint-disable-next-line no-var
  var __relayStripeEngine: Engine | undefined;
}

function bearer(req: { headers: { authorization?: string | string[] } }) {
  const h = req.headers.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  if (!v) return null;
  const m = /^Bearer\s+(.+)$/i.exec(v);
  return m?.[1] || null;
}

export function supabaseApiPlugin(): Plugin {
  const engine: Engine = (globalThis.__relayStripeEngine ??= createStripeEngine());

  return {
    name: "relay-supabase-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathOnly = rawUrl.split("?", 1)[0] ?? "";
        if (!pathOnly.startsWith("/api/supabase") && pathOnly !== "/api/account") {
          next();
          return;
        }

        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(JSON.stringify(body));
        };

        const opts = () => ({ token: bearer(req) || undefined });

        try {
          const method = (req.method ?? "GET").toUpperCase();
          const sub =
            pathOnly === "/api/account"
              ? "/account"
              : pathOnly.slice("/api/supabase".length) || "/";

          if ((sub === "/health" || sub === "/status") && method === "GET") {
            const health = await sb.healthCheck();
            send(health.ok ? 200 : 503, {
              ...health,
              public: { url: sb.publicSupabaseConfig().url, configured: true },
            });
            return;
          }

          if (sub === "/seed" && method === "POST") {
            try {
              const user = await sb.ensureDemoUser();
              const wallet = await engine.walletSnapshot(opts());
              send(200, { user, wallet });
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if ((sub === "/account" || sub === "/me") && method === "GET") {
            try {
              const bundle = await engine.accountBundle(opts());
              send(200, bundle);
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/ledger" && method === "GET") {
            try {
              const wallet = await engine.walletSnapshot(opts());
              if (wallet.storage !== "supabase") {
                send(200, { storage: "local", entries: [] });
                return;
              }
              const entries = await sb.listLedger(wallet.userId);
              send(200, {
                storage: "supabase",
                entries: entries.map((e) => ({
                  id: e.id,
                  type: e.type,
                  description: e.description,
                  amountCents: e.amount_cents,
                  balanceAfter: e.balance_after_cents,
                  at: e.created_at,
                })),
              });
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/devices" && method === "GET") {
            try {
              const wallet = await engine.walletSnapshot(opts());
              if (wallet.storage !== "supabase") {
                send(200, { storage: "local", devices: [] });
                return;
              }
              const devices = await sb.listDevices(wallet.userId);
              send(200, { storage: "supabase", devices });
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
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
