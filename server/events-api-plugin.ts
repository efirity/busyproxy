/**
 * Client event ingest + types.
 * POST /api/events/batch — phone funnel analytics
 */
import type { Plugin } from "vite";
import {
  EVENT_TYPES,
  ingestAppEvents,
} from "./app-events.mjs";
import { sessionFromToken } from "./twilio-auth.mjs";

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
  return String(raw || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim()
    .replace(/^::ffff:/, "");
}

export function eventsApiPlugin(): Plugin {
  return {
    name: "busyproxy-events-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";
        if (!pathOnly.startsWith("/api/events")) {
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
          const sub = pathOnly.slice("/api/events".length) || "/";

          if (sub === "/types" && method === "GET") {
            send(200, { ok: true, types: EVENT_TYPES });
            return;
          }

          if (sub === "/batch" && method === "POST") {
            const body = (await readJson()) as Record<string, unknown>;
            const token = bearer(req);
            let userId: string | null = null;
            let phone: string | null = null;
            if (token) {
              try {
                const session = await sessionFromToken(token);
                userId = session?.user?.id || null;
                phone = session?.user?.phone || null;
              } catch {
                /* anonymous until login */
              }
            }

            try {
              const result = await ingestAppEvents({
                installId: String(body.installId || body.install_id || ""),
                deviceId:
                  (body.deviceId as string) ||
                  (body.device_id as string) ||
                  null,
                events: (body.events as object[]) || [],
                userId,
                phone: phone || (body.phone as string) || null,
                sessionToken: token,
                clientIp: clientIp(req),
                appVersion: (body.appVersion as string) || null,
                platform: (body.platform as string) || "android",
                deviceModel: (body.deviceModel as string) || null,
                osVersion: (body.osVersion as string) || null,
              });
              // Best-effort: link installId onto edge device for admin log filters
              try {
                const did =
                  (body.deviceId as string) || (body.device_id as string);
                const iid = String(body.installId || body.install_id || "");
                if (did && iid) {
                  const { getEdgeGateway } = await import("./edge-gateway.mjs");
                  getEdgeGateway().linkDeviceInstall?.(did, iid);
                }
              } catch {
                /* edge optional */
              }
              send(200, result);
            } catch (err) {
              const status =
                err && typeof err === "object" && "status" in err
                  ? Number((err as { status?: number }).status) || 400
                  : 400;
              send(status, {
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
