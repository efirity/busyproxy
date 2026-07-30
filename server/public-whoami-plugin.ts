/**
 * Public exit / identity check used by operators and clients:
 *   curl -x http://user:pass@busyproxy.net:18080 https://busyproxy.net/api/whoami
 *
 * When called through the BusyProxy gate, the request arrives from the phone
 * egress IP — we geo-enrich with our own lookup (no third-party URLs exposed).
 */
import type { Plugin } from "vite";
import { lookupIpGeo } from "./edge-geo.mjs";

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
  if (ip === "::1") ip = "127.0.0.1";
  return ip;
}

export function publicWhoamiPlugin(): Plugin {
  return {
    name: "busyproxy-whoami",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";
        // Canonical: /api/whoami — keep /api/public/whoami as alias briefly
        if (
          pathOnly !== "/api/whoami" &&
          pathOnly !== "/api/public/whoami"
        ) {
          next();
          return;
        }
        if ((req.method ?? "GET").toUpperCase() !== "GET") {
          res.statusCode = 405;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
          return;
        }

        const ip = clientIp(req);
        let geo: Awaited<ReturnType<typeof lookupIpGeo>> = null;
        try {
          if (ip && ip !== "127.0.0.1") {
            geo = await lookupIpGeo(ip);
          }
        } catch {
          geo = null;
        }

        const body = {
          ok: true,
          ip: ip || null,
          country: geo?.country ?? null,
          countryCode: geo?.countryCode ?? null,
          region: geo?.region ?? null,
          city: geo?.city ?? null,
          zip: geo?.zip ?? null,
          lat: geo?.lat ?? null,
          lon: geo?.lon ?? null,
          isp: geo?.isp ?? null,
          org: geo?.org ?? geo?.asOrg ?? null,
          asn: geo?.asn ?? null,
          source: "busyproxy",
          time: new Date().toISOString(),
        };

        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("cache-control", "no-store");
        res.setHeader("access-control-allow-origin", "*");
        res.end(JSON.stringify(body));
      });
    },
  };
}
