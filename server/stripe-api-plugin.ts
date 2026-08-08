import type { Plugin } from "vite";
import { createStripeEngine } from "./stripe-engine.mjs";

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

export function stripeApiPlugin(): Plugin {
  // Force new engine instance when modules reload
  const engine: Engine = (globalThis.__relayStripeEngine = createStripeEngine());

  return {
    name: "relay-stripe-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathOnly = rawUrl.split("?", 1)[0] ?? "";
        if (!pathOnly.startsWith("/api/stripe")) {
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

        const originFromReq = () => {
          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "127.0.0.1:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted
                ? "https"
                : "http"),
          );
          return `${proto}://${host}`;
        };

        const opts = () => ({ token: bearer(req) || undefined });

        try {
          const method = (req.method ?? "GET").toUpperCase();
          const sub = pathOnly.slice("/api/stripe".length) || "/";

          if (sub === "/config" && method === "GET") {
            send(200, engine.publicConfig());
            return;
          }

          if (sub === "/wallet" && method === "GET") {
            try {
              send(200, await engine.walletSnapshot(opts()));
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/status" && method === "GET") {
            try {
              const v = await engine.verifyConnection();
              send(200, { ...v, config: engine.publicConfig() });
            } catch (err) {
              send(500, {
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/connect/onboard" && method === "POST") {
            const body = await readJson();
            try {
              const origin = body.origin || originFromReq();
              // mobile: true → return to /mobile/stripe-return (app deep link handoff)
              const result = await engine.createOnboardingLink(opts(), {
                origin,
                mobile: Boolean(body.mobile),
              });
              send(200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/connect/refresh" && method === "POST") {
            try {
              const wallet = await engine.refreshAccountStatus(opts());
              send(200, wallet);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/connect/dashboard" && method === "POST") {
            try {
              const result = await engine.createDashboardLink(opts());
              send(200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // Unlink bank / disconnect Connect account (same on web dashboard + mobile)
          if (sub === "/connect/unlink" && method === "POST") {
            try {
              const result = await engine.unlinkConnectAccount(opts());
              send(200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/withdraw" && method === "POST") {
            const body = await readJson();
            try {
              const result = await engine.requestWithdraw(
                opts(),
                body.amountCents,
                body,
              );
              send(result.ok === false ? 402 : 200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/payout-preference" && method === "POST") {
            const body = await readJson();
            try {
              const result = await engine.savePayoutPreference(opts(), body);
              send(200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/fund-platform" && method === "POST") {
            const body = await readJson();
            try {
              const result = await engine.fundPlatformTest(
                body.amountCents || 5000,
              );
              send(200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/credit-demo" && method === "POST") {
            const body = await readJson();
            try {
              const wallet = await engine.creditDemo(
                opts(),
                body.cents || 1000,
              );
              send(200, wallet);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // Payout receipt (invoice-style) — JSON
          // GET /api/stripe/receipts/:withdrawalId
          // GET /api/stripe/receipts/:withdrawalId.html
          const receiptMatch = /^\/receipts\/([^/]+?)(\.html)?$/.exec(sub);
          if (receiptMatch && method === "GET") {
            const withdrawalId = decodeURIComponent(receiptMatch[1]);
            const asHtml = Boolean(receiptMatch[2]);
            try {
              if (asHtml) {
                const { html, filename } = await engine.getPayoutReceiptHtml(
                  opts(),
                  withdrawalId,
                );
                res.statusCode = 200;
                res.setHeader("content-type", "text/html; charset=utf-8");
                res.setHeader(
                  "content-disposition",
                  `inline; filename="${filename}"`,
                );
                res.setHeader("cache-control", "no-store");
                res.end(html);
              } else {
                const receipt = await engine.getPayoutReceipt(
                  opts(),
                  withdrawalId,
                );
                send(200, receipt);
              }
            } catch (err) {
              send(400, {
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
