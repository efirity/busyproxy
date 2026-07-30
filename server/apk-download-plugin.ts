/**
 * Promo-code gated Android APK download.
 *
 * - Direct /downloads/*.apk is blocked (403) without a valid code
 * - GET /api/download/apk?code=5409 streams the APK
 * - POST /api/download/verify { code } → { ok: true } for the marketing UI
 *
 * Code: env APK_PROMO_CODE (default 5409)
 */
import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const APK_NAME = "BusyProxy-latest-debug.apk";
const SHA_NAME = "BusyProxy-latest-debug.apk.sha256";

function promoCode(): string {
  return String(process.env.APK_PROMO_CODE || "5409").trim();
}

function codesEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a.normalize("NFKC").trim());
  const bb = Buffer.from(b.normalize("NFKC").trim());
  if (aa.length !== bb.length) {
    // still do a dummy compare to reduce timing noise
    crypto.timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
    return false;
  }
  return crypto.timingSafeEqual(aa, bb);
}

function isValidCode(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return codesEqual(raw, promoCode());
}

function findApkPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "downloads", APK_NAME),
    path.join(process.cwd(), "artifacts", "apk", APK_NAME),
    path.join(process.cwd(), "android", "dist", APK_NAME),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch {
      /* skip */
    }
  }
  return null;
}

function findShaPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "downloads", SHA_NAME),
    path.join(process.cwd(), "artifacts", "apk", SHA_NAME),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch {
      /* skip */
    }
  }
  return null;
}

function readBody(req: {
  on: (e: string, cb: (c?: Buffer | string) => void) => void;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c || ""));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(
  res: {
    statusCode: number;
    setHeader: (k: string, v: string) => void;
    end: (b?: string) => void;
  },
  code: number,
  body: unknown,
) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function blockDirectDownload(
  res: {
    statusCode: number;
    setHeader: (k: string, v: string) => void;
    end: (b?: string) => void;
  },
) {
  sendJson(res, 403, {
    error: "Promo code required",
    message:
      "This APK is protected. Open busyproxy.net/#download and enter the promo code to download.",
    hint: "GET /api/download/apk?code=YOUR_CODE",
  });
}

export function apkDownloadPlugin(): Plugin {
  return {
    name: "busyproxy-apk-download",
    configureServer(server) {
      // Early middleware: gate static APK paths + API
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? "";
        const url = new URL(rawUrl, "http://local");
        const pathOnly = url.pathname;

        // ── Block open static APK URLs ───────────────────────────────
        const isApkAsset =
          pathOnly === `/downloads/${APK_NAME}` ||
          pathOnly === `/downloads/${SHA_NAME}` ||
          (pathOnly.startsWith("/downloads/") &&
            (pathOnly.endsWith(".apk") || pathOnly.endsWith(".apk.sha256")));

        if (isApkAsset) {
          const code =
            url.searchParams.get("code") ||
            url.searchParams.get("promo") ||
            url.searchParams.get("token");
          if (!isValidCode(code)) {
            blockDirectDownload(res);
            return;
          }
          // Valid code on static path → stream same as API (avoid open dir listing)
          const wantSha = pathOnly.endsWith(".sha256");
          const filePath = wantSha ? findShaPath() : findApkPath();
          if (!filePath) {
            sendJson(res, 404, { error: "APK not published yet" });
            return;
          }
          streamFile(res, filePath, wantSha ? "text/plain" : "application/vnd.android.package-archive", wantSha ? SHA_NAME : APK_NAME);
          return;
        }

        // ── API: verify promo code ───────────────────────────────────
        if (pathOnly === "/api/download/verify") {
          if ((req.method ?? "GET").toUpperCase() === "OPTIONS") {
            res.statusCode = 204;
            res.setHeader("access-control-allow-origin", "*");
            res.setHeader(
              "access-control-allow-headers",
              "content-type",
            );
            res.setHeader("access-control-allow-methods", "POST, OPTIONS");
            res.end();
            return;
          }
          if ((req.method ?? "").toUpperCase() !== "POST") {
            sendJson(res, 405, { error: "POST required" });
            return;
          }
          try {
            const raw = await readBody(req);
            let code = "";
            try {
              const j = JSON.parse(raw || "{}") as { code?: string };
              code = String(j.code ?? "");
            } catch {
              code = String(url.searchParams.get("code") || "");
            }
            if (!isValidCode(code)) {
              sendJson(res, 403, {
                ok: false,
                error: "Invalid promo code",
              });
              return;
            }
            const apk = findApkPath();
            sendJson(res, 200, {
              ok: true,
              downloadUrl: `/api/download/apk?code=${encodeURIComponent(code.trim())}`,
              sha256Url: `/api/download/apk-sha256?code=${encodeURIComponent(code.trim())}`,
              fileName: APK_NAME,
              available: Boolean(apk),
            });
          } catch (err) {
            sendJson(res, 500, {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          return;
        }

        // ── API: stream APK / checksum ───────────────────────────────
        if (
          pathOnly === "/api/download/apk" ||
          pathOnly === "/api/download/apk-sha256"
        ) {
          const code =
            url.searchParams.get("code") ||
            url.searchParams.get("promo") ||
            url.searchParams.get("token");
          if (!isValidCode(code)) {
            sendJson(res, 403, {
              error: "Invalid or missing promo code",
            });
            return;
          }
          const wantSha = pathOnly === "/api/download/apk-sha256";
          const filePath = wantSha ? findShaPath() : findApkPath();
          if (!filePath) {
            sendJson(res, 404, { error: "APK not published yet" });
            return;
          }
          streamFile(
            res,
            filePath,
            wantSha
              ? "text/plain; charset=utf-8"
              : "application/vnd.android.package-archive",
            wantSha ? SHA_NAME : APK_NAME,
          );
          return;
        }

        next();
      });
    },
  };
}

function streamFile(
  res: {
    statusCode: number;
    setHeader: (k: string, v: string) => void;
    end: (b?: string | Buffer) => void;
  },
  filePath: string,
  contentType: string,
  downloadName: string,
) {
  try {
    const stat = fs.statSync(filePath);
    const buf = fs.readFileSync(filePath);
    res.statusCode = 200;
    res.setHeader("content-type", contentType);
    res.setHeader("content-length", String(stat.size));
    res.setHeader(
      "content-disposition",
      `attachment; filename="${downloadName}"`,
    );
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-content-type-options", "nosniff");
    res.end(buf);
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : "Read failed",
    });
  }
}
