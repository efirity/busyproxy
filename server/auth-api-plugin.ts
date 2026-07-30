import type { Plugin } from "vite";
import {
  authPublicConfig,
  deleteAccount,
  logoutToken,
  sessionFromToken,
  startOtp,
  updateProfile,
  verifyOtp,
} from "./twilio-auth.mjs";
import { lookupIpGeo } from "./edge-geo.mjs";
import { dialFromCountry } from "./phone-dial-codes.mjs";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { listDeletionReasons } from "./deletion-reasons.mjs";

function bearer(req: { headers: { authorization?: string | string[] } }) {
  const h = req.headers.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  if (!v) return null;
  const m = /^Bearer\s+(.+)$/i.exec(v);
  return m?.[1] || null;
}

function clientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const xf = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xf) ? xf[0] : xf;
  let ip = String(raw || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim()
    .replace(/^::ffff:/, "");
  // Local / private — skip geo
  if (
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  ) {
    return "";
  }
  return ip;
}

export function authApiPlugin(): Plugin {
  return {
    name: "relay-auth-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathOnly = rawUrl.split("?", 1)[0] ?? "";
        if (!pathOnly.startsWith("/api/auth")) {
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
          const sub = pathOnly.slice("/api/auth".length) || "/";
          const ua = String(req.headers["user-agent"] || "");
          const ip = String(
            req.headers["x-forwarded-for"] ||
              (req.socket as { remoteAddress?: string })?.remoteAddress ||
              "",
          ).split(",")[0];

          if (sub === "/config" && method === "GET") {
            send(200, authPublicConfig());
            return;
          }

          // GET /phone-hint — country dial prefix from visitor IP (public, no auth)
          if (sub === "/phone-hint" && method === "GET") {
            try {
              const ip = clientIp(req);
              if (!ip) {
                send(200, {
                  ok: true,
                  prefix: null,
                  countryCode: null,
                  country: null,
                  source: "unknown",
                });
                return;
              }
              const geo = await lookupIpGeo(ip);
              const dial = dialFromCountry(geo?.countryCode);
              send(200, {
                ok: true,
                prefix: dial?.prefix ?? null,
                dialCode: dial?.dialCode ?? null,
                countryCode: geo?.countryCode ?? null,
                country: geo?.country ?? null,
                city: geo?.city ?? null,
                source: dial ? "ip" : "ip_no_dial",
              });
            } catch (err) {
              send(200, {
                ok: false,
                prefix: null,
                countryCode: null,
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/otp/start" && method === "POST") {
            const body = await readJson();
            try {
              const result = await startOtp(body.phone, {
                userAgent: ua,
                ip,
                displayName: body.displayName ?? body.name ?? body.username,
              });
              send(200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/otp/verify" && method === "POST") {
            const body = await readJson();
            try {
              const result = await verifyOtp(body.phone, body.code, {
                userAgent: ua,
                ip,
                displayName: body.displayName ?? body.name ?? body.username,
              });
              send(200, result);
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/session" && method === "GET") {
            const token = bearer(req);
            if (!token) {
              send(401, { error: "Not signed in" });
              return;
            }
            try {
              const session = await sessionFromToken(token);
              if (!session) {
                send(401, { error: "Session expired" });
                return;
              }
              send(200, session);
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/logout" && method === "POST") {
            const token = bearer(req);
            try {
              await logoutToken(token || "");
              send(200, { ok: true });
            } catch (err) {
              send(500, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          if (sub === "/profile" && method === "PATCH") {
            const token = bearer(req);
            if (!token) {
              send(401, { error: "Not signed in" });
              return;
            }
            const body = await readJson();
            try {
              const session = await sessionFromToken(token);
              if (!session) {
                send(401, { error: "Session expired" });
                return;
              }
              const user = await updateProfile(session.user.id, {
                displayName: body.displayName,
                email: body.email,
              });
              send(200, { user });
            } catch (err) {
              send(400, {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            return;
          }

          // GET /deletion-reasons — predefined options for delete-account UI
          if (sub === "/deletion-reasons" && method === "GET") {
            send(200, { ok: true, reasons: listDeletionReasons() });
            return;
          }

          // DELETE /account — Google Play account deletion (in-app + web)
          // Body: { reasonCode, reasonText? } — reason required
          if (sub === "/account" && method === "DELETE") {
            const token = bearer(req);
            if (!token) {
              send(401, { error: "Not signed in" });
              return;
            }
            const body = (await readJson()) as {
              reasonCode?: string;
              reasonText?: string;
              reason?: string;
              code?: string;
              detail?: string;
            };
            try {
              const session = await sessionFromToken(token);
              if (!session?.user?.id) {
                send(401, { error: "Session expired" });
                return;
              }
              const result = await deleteAccount(session.user.id, {
                reasonCode: body.reasonCode || body.code,
                reasonText: body.reasonText || body.detail || body.reason,
              });
              try {
                getEdgeGateway().removeDevicesByUserId(session.user.id);
              } catch {
                /* edge optional in some modes */
              }
              await logoutToken(token);
              send(200, {
                ok: true,
                deleted: true,
                message:
                  "Your account and associated data have been deleted.",
                ...result,
              });
            } catch (err) {
              const status =
                err && typeof err === "object" && "status" in err
                  ? Number((err as { status?: number }).status) || 400
                  : 400;
              send(status, {
                error: err instanceof Error ? err.message : String(err),
                code:
                  err && typeof err === "object" && "code" in err
                    ? (err as { code?: string }).code
                    : undefined,
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
