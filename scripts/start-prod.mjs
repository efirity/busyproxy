#!/usr/bin/env node
/**
 * Production entry: Vite server without HMR, NODE_ENV=production.
 * Edge APIs + reverse tunnel + proxy listeners start via plugins (configureServer).
 *
 * Usage:
 *   node scripts/start-prod.mjs
 *   PORT=8080 node scripts/start-prod.mjs
 */
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Proxy/tunnel sockets often emit ECONNRESET/EPIPE after clients abort.
// Without a listener, Node treats that as a fatal uncaughtException and exits
// → nginx 502. Swallow common network resets; rethrow everything else.
function isBenignNetworkError(err) {
  const code = err && err.code;
  return (
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH" ||
    code === "ERR_STREAM_DESTROYED"
  );
}
process.on("uncaughtException", (err) => {
  if (isBenignNetworkError(err)) {
    console.error(
      `[start-prod] swallowed ${err.code || "net"}:`,
      err.message || err,
    );
    return;
  }
  console.error("[start-prod] uncaughtException — exiting", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  if (isBenignNetworkError(err)) {
    console.error(
      `[start-prod] swallowed rejection ${err.code || "net"}:`,
      err.message || err,
    );
    return;
  }
  console.error("[start-prod] unhandledRejection", reason);
});

const server = await createServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  mode: "production",
  server: {
    host,
    port,
    strictPort: true,
    hmr: false,
    watch: null,
  },
  // Reduce noisy transforms in prod process
  logLevel: process.env.VITE_LOG_LEVEL || "info",
});

await server.listen();
server.printUrls();
console.log(
  `[start-prod] BusyProxy production process on ${host}:${port} (NODE_ENV=${process.env.NODE_ENV})`,
);

// Graceful shutdown — flush edge state if available
async function shutdown(signal) {
  console.log(`[start-prod] ${signal}, shutting down…`);
  try {
    const { getEdgeGateway } = await import("../server/edge-gateway.mjs");
    getEdgeGateway().persistNow?.();
  } catch {
    /* */
  }
  try {
    await server.close();
  } catch {
    /* */
  }
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
