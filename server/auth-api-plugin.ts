import type { Plugin } from "vite";
import {
  authPublicConfig,
  logoutToken,
  sessionFromToken,
  startOtp,
  updateProfile,
  verifyOtp,
} from "./twilio-auth.mjs";

function bearer(req: { headers: { authorization?: string | string[] } }) {
  const h = req.headers.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  if (!v) return null;
  const m = /^Bearer\s+(.+)$/i.exec(v);
  return m?.[1] || null;
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

          if (sub === "/otp/start" && method === "POST") {
            const body = await readJson();
            try {
              const result = await startOtp(body.phone, {
                userAgent: ua,
                ip,
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
