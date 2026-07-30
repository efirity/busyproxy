import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { proxyApiPlugin } from "./server/proxy-api-plugin";
import { stripeApiPlugin } from "./server/stripe-api-plugin";
import { supabaseApiPlugin } from "./server/supabase-api-plugin";
import { authApiPlugin } from "./server/auth-api-plugin";
import { edgeApiPlugin } from "./server/edge-api-plugin";

function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted
                ? "https"
                : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule(
            "/src/lib/auth/popup.server.ts",
          )) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

/** Shared speed headers for Vite middleware responses */
function speedHeadersPlugin(): Plugin {
  return {
    name: "busyproxy-speed-headers",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Early flush hints for HTML navigations
        res.setHeader("X-Content-Type-Options", "nosniff");
        // Keep API uncached; static module requests can be short-cached in prod proxy
        if (req.url?.startsWith("/assets/") || req.url?.includes(".css")) {
          res.setHeader("Cache-Control", "public, max-age=60");
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const isBuild = command === "build";
  const isProd = mode === "production" || isBuild;

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      allowedHosts: true,
      // Warm critical deps so first paint is faster even in dev
      warmup: {
        clientFiles: [
          "./src/routes/index.tsx",
          "./src/components/marketing/landing.tsx",
          "./src/components/layout/site-nav.tsx",
          "./src/styles.css",
        ],
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
    },
    resolve: { tsconfigPaths: true },
    // Faster cold starts + smaller graph for landing
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@tanstack/react-router",
        "lucide-react",
        "clsx",
        "tailwind-merge",
        "zustand",
      ],
      exclude: ["@electric-sql/pglite"],
    },
    build: {
      target: "es2022",
      cssMinify: true,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Keep marketing lean — heavy libs in separate chunks
          manualChunks(id) {
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
              return "charts";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "icons";
            }
            if (
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react/")
            ) {
              return "react-vendor";
            }
            if (id.includes("node_modules/@tanstack")) {
              return "tanstack";
            }
          },
        },
      },
    },
    esbuild: isProd
      ? {
          drop: ["console", "debugger"],
          legalComments: "none",
        }
      : undefined,
    plugins: [
      speedHeadersPlugin(),
      pgliteBootstrapPlugin(),
      authPopupPlugin(),
      authApiPlugin(),
      proxyApiPlugin(),
      stripeApiPlugin(),
      supabaseApiPlugin(),
      edgeApiPlugin(),
      tailwindcss(),
      tanstackStart(),
      // node-server for DigitalOcean; vercel only when explicitly building for Vercel
      ...(isBuild
        ? [
            nitro({
              preset: process.env.NITRO_PRESET || "node-server",
            }),
          ]
        : []),
      viteReact(),
    ],
  };
});
