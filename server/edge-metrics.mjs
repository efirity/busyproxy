/**
 * Process-level health metrics for public /status and operators.
 */
const startedAt = Date.now();

const metrics = {
  proxyConnectOk: 0,
  proxyConnectDeny: 0,
  proxyRateLimited: 0,
  tunnelAgentConnect: 0,
  tunnelAgentDisconnect: 0,
  tunnelOpenStream: 0,
  tunnelOpenFail: 0,
  tunnelRateLimited: 0,
  apiRateLimited: 0,
  lastProxyAt: null,
  lastTunnelAt: null,
  lastError: null,
};

export function bump(name, n = 1) {
  if (typeof metrics[name] === "number") metrics[name] += n;
}

export function setMetric(name, value) {
  metrics[name] = value;
}

export function getMetrics() {
  return {
    ...metrics,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    startedAt: new Date(startedAt).toISOString(),
    pid: process.pid,
    node: process.version,
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
  };
}
