/**
 * Lightweight sliding-window rate limiter for proxy + WSS + public APIs.
 */
const buckets = new Map();

function key(kind, id) {
  return `${kind}:${id || "unknown"}`;
}

/**
 * @param {string} kind
 * @param {string} id - usually client IP
 * @param {{ limit: number, windowMs: number }} opts
 * @returns {{ ok: boolean, remaining: number, retryAfterMs: number }}
 */
export function rateLimit(kind, id, opts) {
  const limit = opts.limit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const k = key(kind, id);
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.start >= windowMs) {
    b = { start: now, count: 0 };
    buckets.set(k, b);
  }
  b.count += 1;
  const remaining = Math.max(0, limit - b.count);
  if (b.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: windowMs - (now - b.start),
    };
  }
  return { ok: true, remaining, retryAfterMs: 0 };
}

export function clientIp(req) {
  const xf = req?.headers?.["x-forwarded-for"];
  const v = Array.isArray(xf) ? xf[0] : xf;
  if (v) return String(v).split(",")[0].trim();
  return (
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    "unknown"
  );
}

/** Periodic cleanup of stale buckets */
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now - b.start > 5 * 60_000) buckets.delete(k);
  }
}, 60_000).unref?.();

export function rateLimitSnapshot() {
  return { activeBuckets: buckets.size };
}
