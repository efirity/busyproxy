/**
 * Admin tools: check exit IP via proxy + generate multi-MB traffic jobs
 * through a sticky credential bound to one device.
 *
 * Uses local gate (127.0.0.1:EDGE_HTTP_PORT) with curl — works on the droplet.
 * Note: until reverse-tunnel mux is live, CONNECT dials from the edge host
 * (P0). IP check still validates routing + credential + metering path.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import { getEdgeGateway } from "./edge-gateway.mjs";

const execFileAsync = promisify(execFile);

// ipify returns {"ip":"x.x.x.x"} — better for matching phone egress than lumtest geo JSON
const DEFAULT_IP_URL = "https://api.ipify.org?format=json";
const LUMTEST_URL = "https://lumtest.com/myip.json";

/** Lightweight URLs mixed into the long job for variety */
const LIGHT_URLS = [
  "https://lumtest.com/myip.json",
  "https://api.ipify.org?format=json",
  "https://www.cloudflare.com/cdn-cgi/trace",
  "https://example.com/",
];

/**
 * Multi-MB download targets (reliable public endpoints).
 * Cloudflare speed endpoint is ideal for sustained transfer.
 */
function heavyUrls(chunkBytes = 2 * 1024 * 1024) {
  // Prefer Cloudflare only — httpbin/ovh often SSL-fail through phone tunnel
  const n = Math.max(512 * 1024, Math.min(chunkBytes, 5 * 1024 * 1024));
  return [
    `https://speed.cloudflare.com/__down?bytes=${n}`,
    `https://speed.cloudflare.com/__down?bytes=${Math.floor(n / 2)}`,
    "https://api.ipify.org?format=json",
  ];
}

/** @type {Map<string, any>} */
const trafficJobs = new Map();

function curlViaProxy(proxyUrl, targetUrl, { maxTime = 60, discardBody = false } = {}) {
  const args = [
    "-sS",
    "-L",
    "--max-time",
    String(maxTime),
    "-x",
    proxyUrl,
    "-w",
    "\n__HTTP_CODE__:%{http_code}\n__SIZE__:%{size_download}\n",
  ];
  if (discardBody) {
    args.push("-o", "/dev/null");
  }
  args.push(targetUrl);

  return execFileAsync("curl", args, {
    maxBuffer: discardBody ? 1024 * 1024 : 12 * 1024 * 1024,
  }).then(({ stdout, stderr }) => {
    const codeMatch = stdout.match(/__HTTP_CODE__:(\d+)/);
    const sizeMatch = stdout.match(/__SIZE__:(\d+)/);
    const body = stdout
      .replace(/\n__HTTP_CODE__:\d+\n?/g, "")
      .replace(/\n__SIZE__:\d+\n?/g, "")
      .replace(/__SIZE__:\d+/g, "")
      .replace(/__HTTP_CODE__:\d+/g, "")
      .trim();
    return {
      ok: true,
      httpCode: codeMatch ? Number(codeMatch[1]) : discardBody ? 200 : 0,
      bytes: sizeMatch ? Number(sizeMatch[1]) : body.length,
      body: discardBody ? "" : body,
      stderr: stderr || "",
    };
  });
}

function parseLumtest(body) {
  try {
    const clean = String(body || "")
      .replace(/__SIZE__:\d+/g, "")
      .replace(/__HTTP_CODE__:\d+/g, "")
      .trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

/**
 * Probe exit IP for a device via sticky admin credential + lumtest.
 */
export async function probeDeviceIp(deviceId, opts = {}) {
  const edge = getEdgeGateway();
  const device = edge.getDevice(deviceId);
  if (!device) throw new Error("Device not found");

  const probe = edge.ensureProbeCredential(deviceId);
  const ports = edge.getPorts();
  const proxyHost = "127.0.0.1";
  const proxyPort = ports.http;
  const user = probe.endpoints.username;
  const pass = probe.password;
  const proxyUrl = `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${proxyHost}:${proxyPort}`;
  const ipUrl = opts.ipUrl || DEFAULT_IP_URL;
  // Hard overall deadline so admin UI never spins forever
  const hardMs = Math.min(Math.max(Number(opts.timeoutMs) || 12_000, 4_000), 20_000);

  const started = Date.now();
  const run = async () => {
    // Single fast IP check only (skip lumtest — it was doubling hang time)
    const result = await curlViaProxy(proxyUrl, ipUrl, { maxTime: 10 });
    const ipify = parseLumtest(result.body);
    const seenIp =
      ipify?.ip ||
      ipify?.query ||
      (typeof result.body === "string"
        ? (result.body.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) || [])[0]
        : null) ||
      null;
    const expected = device.lastPublicIp;
    const match =
      seenIp && expected ? seenIp === expected : seenIp ? false : null;
    const edgeHostHint = seenIp === "46.101.114.84";

    // Keep lastPublicIp in sync + enrich city/country/ISP
    try {
      if (seenIp) {
        const edge = getEdgeGateway();
        // agentHello path already stores IP; force geo refresh
        edge.agentHello({
          deviceId,
          publicIp: seenIp,
        });
        await edge.refreshDeviceGeo(deviceId);
      } else if (expected) {
        await getEdgeGateway().refreshDeviceGeo(deviceId);
      }
    } catch {
      /* geo optional */
    }

    return {
      ok: result.httpCode >= 200 && result.httpCode < 400 && Boolean(seenIp),
      device: getEdgeGateway().getDevice(deviceId) || device,
      expectedEgressIp: expected,
      seenIp,
      match,
      matchNote:
        match === true
          ? "✓ Seen IP matches phone egress — traffic exits via the device."
          : edgeHostHint
            ? "✗ DigitalOcean/edge IP — reverse tunnel not used. Restart sharing on phone."
            : match === false
              ? `✗ Seen ${seenIp} ≠ phone ${expected}.`
              : "Could not parse exit IP.",
      ipify,
      lumtest: null,
      rawBodyPreview: result.body.slice(0, 400),
      httpCode: result.httpCode,
      bytes: result.bytes,
      probe: {
        username: user,
        password: pass,
        httpProxy: `http://${user}:***@${ports.host}:${proxyPort}`,
        stickySession: probe.endpoints.sessionId,
        curlExample: `curl -x http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${ports.host}:${proxyPort} ${ipUrl}`,
      },
      durationMs: Date.now() - started,
    };
  };

  try {
    const result = await Promise.race([
      run(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`probe_timeout_${hardMs}ms`)),
          hardMs,
        ),
      ),
    ]);
    return result;
  } catch (err) {
    return {
      ok: false,
      device,
      expectedEgressIp: device.lastPublicIp,
      seenIp: null,
      match: null,
      matchNote:
        "Probe timed out or failed. Ensure Sharing is ON and agent status is online (not error).",
      probe: {
        username: user,
        proxy: `${proxyHost}:${proxyPort}`,
        stickySession: probe.endpoints.sessionId,
      },
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - started,
    };
  }
}

function publicJob(job) {
  return {
    jobId: job.jobId,
    deviceId: job.deviceId,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt || null,
    durationSec: job.durationSec,
    targetBytes: job.targetBytes,
    progress: {
      elapsedMs: job.finishedAt
        ? job.finishedAt - job.startedAt
        : Date.now() - job.startedAt,
      totalBytes: job.totalBytes,
      okCount: job.okCount,
      failCount: job.failCount,
      hits: job.hits.length,
      lastUrl: job.lastUrl,
      lastError: job.lastError,
      mb: Number((job.totalBytes / (1024 * 1024)).toFixed(2)),
    },
    device: job.deviceSnapshot || null,
    recentHits: job.hits.slice(-12),
    error: job.error || null,
    note: job.note,
  };
}

/**
 * Short multi-URL burst (legacy / quick test).
 */
export async function runDeviceTrafficJob(deviceId, opts = {}) {
  // If durationSec or targetMb set, run the long job (await full completion)
  if (opts.durationSec || opts.targetMb || opts.long) {
    const start = startDeviceTrafficJob(deviceId, opts);
    const jobId = start.jobId;
    // Wait until finished (cap 12 min)
    const deadline = Date.now() + 12 * 60 * 1000;
    while (Date.now() < deadline) {
      const j = trafficJobs.get(jobId);
      if (!j) throw new Error("job lost");
      if (j.status === "done" || j.status === "error" || j.status === "cancelled") {
        return publicJob(j);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return publicJob(trafficJobs.get(jobId));
  }

  const edge = getEdgeGateway();
  const device = edge.getDevice(deviceId);
  if (!device) throw new Error("Device not found");

  const probe = edge.ensureProbeCredential(deviceId);
  const ports = edge.getPorts();
  const proxyUrl = `http://${encodeURIComponent(probe.endpoints.username)}:${encodeURIComponent(probe.password)}@127.0.0.1:${ports.http}`;
  const urls =
    Array.isArray(opts.urls) && opts.urls.length
      ? opts.urls
      : [...LIGHT_URLS, ...heavyUrls(1 * 1024 * 1024)];
  const rounds = Math.min(Math.max(Number(opts.rounds) || 3, 1), 50);

  const started = Date.now();
  const hits = [];
  let totalBytes = 0;
  let okCount = 0;

  for (let r = 0; r < rounds; r++) {
    for (const url of urls) {
      const t0 = Date.now();
      try {
        const res = await curlViaProxy(proxyUrl, url, {
          maxTime: 90,
          discardBody: url.includes("bytes=") || url.includes(".dat"),
        });
        totalBytes += res.bytes || 0;
        if (res.httpCode >= 200 && res.httpCode < 400) okCount += 1;
        hits.push({
          url,
          round: r + 1,
          httpCode: res.httpCode,
          bytes: res.bytes,
          durationMs: Date.now() - t0,
          ok: res.httpCode >= 200 && res.httpCode < 400,
        });
      } catch (err) {
        hits.push({
          url,
          round: r + 1,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - t0,
        });
      }
    }
  }

  const after = edge.getDevice(deviceId);
  return {
    ok: okCount > 0,
    device: after || device,
    summary: {
      urls: urls.length,
      rounds,
      hits: hits.length,
      okCount,
      totalBytes,
      durationMs: Date.now() - started,
      mb: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    },
    hits: hits.slice(-30),
    probe: {
      username: probe.endpoints.username,
      stickySession: probe.endpoints.sessionId,
      gate: `${ports.host}:${ports.http}`,
    },
    note:
      "Traffic is sent through the gate using a sticky credential bound to this device. Byte counters update when CONNECT completes.",
  };
}

/**
 * Start a long-running traffic job (default ~5 min, multi-MB).
 * Returns immediately with jobId — poll getTrafficJob(jobId).
 */
export function startDeviceTrafficJob(deviceId, opts = {}) {
  const edge = getEdgeGateway();
  const device = edge.getDevice(deviceId);
  if (!device) throw new Error("Device not found");
  if (!device.online) throw new Error("Device offline — start sharing on the phone first");

  const durationSec = Math.min(
    Math.max(Number(opts.durationSec) || 180, 30),
    900,
  ); // default 3 min
  const targetMb = Math.min(Math.max(Number(opts.targetMb) || 100, 1), 500);
  const targetBytes = targetMb * 1024 * 1024;
  const chunkMb = Math.min(Math.max(Number(opts.chunkMb) || 3, 0.25), 8);
  const chunkBytes = Math.floor(chunkMb * 1024 * 1024);

  const probe = edge.ensureProbeCredential(deviceId);
  const ports = edge.getPorts();
  const proxyUrl = `http://${encodeURIComponent(probe.endpoints.username)}:${encodeURIComponent(probe.password)}@127.0.0.1:${ports.http}`;

  const jobId = `tj_${crypto.randomBytes(6).toString("hex")}`;
  const job = {
    jobId,
    deviceId,
    status: "running",
    startedAt: Date.now(),
    finishedAt: null,
    durationSec,
    targetBytes,
    totalBytes: 0,
    okCount: 0,
    failCount: 0,
    hits: [],
    lastUrl: null,
    lastError: null,
    error: null,
    cancel: false,
    deviceSnapshot: device,
    note: `Sustained traffic ~${durationSec}s or until ~${targetMb} MB via sticky proxy bound to this device.`,
  };
  trafficJobs.set(jobId, job);

  // prune old jobs
  if (trafficJobs.size > 40) {
    const old = [...trafficJobs.entries()]
      .filter(([, j]) => j.status !== "running")
      .sort((a, b) => a[1].startedAt - b[1].startedAt);
    for (const [id] of old.slice(0, Math.max(0, trafficJobs.size - 30))) {
      trafficJobs.delete(id);
    }
  }

  void (async () => {
    const deadline = job.startedAt + durationSec * 1000;
    const heavies = heavyUrls(chunkBytes);
    let i = 0;
    try {
      while (
        Date.now() < deadline &&
        job.totalBytes < targetBytes &&
        !job.cancel
      ) {
        // Prefer heavy downloads; every 4th hit do a light URL
        const url =
          i % 4 === 3
            ? LIGHT_URLS[i % LIGHT_URLS.length]
            : heavies[i % heavies.length];
        job.lastUrl = url;
        i += 1;
        const t0 = Date.now();
        try {
          const res = await curlViaProxy(proxyUrl, url, {
            maxTime: 120,
            discardBody: true,
          });
          const bytes = res.bytes || 0;
          job.totalBytes += bytes;
          const ok = res.httpCode >= 200 && res.httpCode < 400 && bytes > 0;
          if (ok) job.okCount += 1;
          else job.failCount += 1;
          job.hits.push({
            url,
            httpCode: res.httpCode,
            bytes,
            durationMs: Date.now() - t0,
            ok,
            at: Date.now(),
            totalBytes: job.totalBytes,
          });
          if (job.hits.length > 200) job.hits.splice(0, job.hits.length - 200);
          job.lastError = ok ? null : `HTTP ${res.httpCode}`;
        } catch (err) {
          job.failCount += 1;
          job.lastError = err instanceof Error ? err.message : String(err);
          job.hits.push({
            url,
            ok: false,
            error: job.lastError,
            durationMs: Date.now() - t0,
            at: Date.now(),
            totalBytes: job.totalBytes,
          });
          // brief backoff on errors
          await new Promise((r) => setTimeout(r, 800));
        }
        // small gap so UI polling sees intermediate progress
        await new Promise((r) => setTimeout(r, 150));
      }
      job.status = job.cancel ? "cancelled" : "done";
      job.finishedAt = Date.now();
      job.deviceSnapshot = edge.getDevice(deviceId) || device;
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : String(err);
      job.finishedAt = Date.now();
      job.deviceSnapshot = edge.getDevice(deviceId) || device;
    }
  })();

  return publicJob(job);
}

export function getTrafficJob(jobId) {
  const job = trafficJobs.get(jobId);
  if (!job) return null;
  job.deviceSnapshot =
    getEdgeGateway().getDevice(job.deviceId) || job.deviceSnapshot;
  return publicJob(job);
}

export function listTrafficJobs(deviceId) {
  return [...trafficJobs.values()]
    .filter((j) => !deviceId || j.deviceId === deviceId)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 20)
    .map(publicJob);
}

export function cancelTrafficJob(jobId) {
  const job = trafficJobs.get(jobId);
  if (!job) throw new Error("Job not found");
  job.cancel = true;
  return publicJob(job);
}
