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

/**
 * Our public whoami (geo + IP). Prefer this for all operator-facing curls so we
 * never surface third-party echo hosts in the admin UI.
 * Server-side probes may still use private enrichers — those URLs never leave the server.
 */
function whoamiUrl() {
  if (process.env.PUBLIC_WHOAMI_URL) return process.env.PUBLIC_WHOAMI_URL;
  if (process.env.PUBLIC_BASE_URL) {
    return (
      String(process.env.PUBLIC_BASE_URL).replace(/\/$/, "") + "/api/whoami"
    );
  }
  return "https://busyproxy.net/api/whoami";
}

// Private fallback IP echo (server-only — never shown in UI/API payloads)
const PRIVATE_IP_ECHO = "https://api.ipify.org?format=json";
// Private geo enricher used only on the droplet when whoami geo is thin
const PRIVATE_GEO_ENRICH = "https://lumtest.com/myip.json";

/** Lightweight URLs mixed into the long job for variety (no third-party branding) */
const LIGHT_URLS = [
  () => whoamiUrl(),
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
    whoamiUrl(),
  ];
}

function resolveLightUrl(entry) {
  return typeof entry === "function" ? entry() : entry;
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

function parseJsonBody(body) {
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

/** Extract IPv4 from JSON or plain body. */
function extractIp(parsed, rawBody) {
  if (parsed?.ip) return String(parsed.ip);
  if (parsed?.query) return String(parsed.query);
  const m = String(rawBody || "").match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  return m ? m[0] : null;
}

/**
 * Pull exit identity through the proxy via our whoami (+ private enrich if needed).
 * Returns sanitized classification — no third-party hostnames.
 */
async function probeExitViaProxy(proxyUrl, { maxTime = 14 } = {}) {
  const target = whoamiUrl();
  let whoRes;
  try {
    whoRes = await curlViaProxy(proxyUrl, target, { maxTime });
  } catch (err) {
    whoRes = {
      ok: false,
      httpCode: 0,
      bytes: 0,
      body: "",
      stderr: err instanceof Error ? err.message : String(err),
    };
  }
  let who = parseJsonBody(whoRes.body);
  let seenIp = extractIp(who, whoRes.body);

  // Private fallbacks on server only (never returned as URLs)
  if (!seenIp) {
    try {
      const ipRes = await curlViaProxy(proxyUrl, PRIVATE_IP_ECHO, {
        maxTime: Math.min(maxTime, 10),
      });
      const parsed = parseJsonBody(ipRes.body);
      seenIp = extractIp(parsed, ipRes.body);
      if (!who) who = parsed;
    } catch {
      /* optional */
    }
  }

  let enrich = null;
  if (seenIp && (!who?.asn || !who?.org || !who?.isp)) {
    try {
      const geoRes = await curlViaProxy(proxyUrl, PRIVATE_GEO_ENRICH, {
        maxTime: Math.min(maxTime, 12),
      });
      enrich = parseJsonBody(geoRes.body);
    } catch {
      enrich = null;
    }
  }

  const merged = {
    ...(enrich || {}),
    ...(who || {}),
    ip: seenIp || who?.ip || enrich?.ip || null,
  };

  return {
    seenIp: merged.ip || seenIp,
    whoami: who,
    httpCode: whoRes.httpCode,
    bytes: whoRes.bytes,
    rawPreview: String(whoRes.body || "").slice(0, 400),
    classificationBase: merged,
  };
}

/**
 * Probe exit IP for a device via sticky admin credential + our whoami.
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
  // Hard overall deadline so admin UI never spins forever
  const hardMs = Math.min(Math.max(Number(opts.timeoutMs) || 18_000, 4_000), 30_000);
  const clientHost =
    ports.host === "gate.busyproxy.net" ? "busyproxy.net" : ports.host || "busyproxy.net";

  const started = Date.now();
  const run = async () => {
    const exit = await probeExitViaProxy(proxyUrl, { maxTime: 12 });
    const seenIp = exit.seenIp;
    const expected = device.lastPublicIp;
    const match =
      seenIp && expected ? seenIp === expected : seenIp ? false : null;
    const edgeHostHint = seenIp === "46.101.114.84";
    const classification = classifyExit(exit.classificationBase, device);

    // Keep lastPublicIp in sync + enrich city/country/ISP
    try {
      if (seenIp) {
        const edge = getEdgeGateway();
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

    const curlWhoami = `curl -x http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${clientHost}:${proxyPort} ${whoamiUrl()}`;

    return {
      ok: exit.httpCode >= 200 && exit.httpCode < 400 && Boolean(seenIp),
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
      classification,
      httpCode: exit.httpCode,
      bytes: exit.bytes,
      probe: {
        username: user,
        password: pass,
        httpProxy: `http://${user}:***@${clientHost}:${proxyPort}`,
        stickySession: probe.endpoints.sessionId,
        curlExample: curlWhoami,
        curlWhoami,
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
    parallel: job.parallel ?? 1,
    chunkMb: job.chunkMb ?? null,
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
      /** Concurrent curl/CONNECT streams currently in flight (server-side) */
      inFlight: job.inFlight ?? 0,
      peakInFlight: job.peakInFlight ?? 0,
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
      : [
          ...LIGHT_URLS.map(resolveLightUrl),
          ...heavyUrls(1 * 1024 * 1024),
        ];
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
 * Start a long-running traffic job (default ~3 min, multi-MB).
 * Runs several parallel proxy downloads so the phone shows concurrent
 * Streams (default 10) — closer to real multi-connection load.
 * Returns immediately with jobId — poll getTrafficJob(jobId).
 */
export function startDeviceTrafficJob(deviceId, opts = {}) {
  const edge = getEdgeGateway();
  const device = edge.getDevice(deviceId);
  if (!device) throw new Error("Device not found");
  if (!device.online) throw new Error("Device offline — start sharing on the phone first");

  // Large admin jobs (e.g. 1 GB) need a longer wall clock; cap 1 hour.
  const durationSec = Math.min(
    Math.max(Number(opts.durationSec) || 180, 30),
    3600,
  );
  // Admin traffic sizes: 1 MB … 1 GB (1024 MB)
  const targetMb = Math.min(Math.max(Number(opts.targetMb) || 100, 1), 1024);
  const targetBytes = targetMb * 1024 * 1024;
  // Smaller chunks with high parallelism ≈ many simultaneous phone streams
  const chunkMb = Math.min(Math.max(Number(opts.chunkMb) || 1.5, 0.25), 8);
  const chunkBytes = Math.floor(chunkMb * 1024 * 1024);
  const parallel = Math.min(Math.max(Number(opts.parallel) || 10, 1), 20);

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
    parallel,
    chunkMb,
    totalBytes: 0,
    okCount: 0,
    failCount: 0,
    inFlight: 0,
    peakInFlight: 0,
    hits: [],
    lastUrl: null,
    lastError: null,
    error: null,
    cancel: false,
    deviceSnapshot: device,
    note: `Sustained traffic ~${durationSec}s or until ~${targetMb} MB · ${parallel} parallel streams via sticky proxy on this device.`,
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
    // Slightly different sizes so CF doesn't coalesce; keeps 10 distinct TCPs
    const heavies = [
      ...heavyUrls(chunkBytes),
      ...heavyUrls(Math.floor(chunkBytes * 0.7)),
      ...heavyUrls(Math.floor(chunkBytes * 1.2)),
    ];
    let i = 0;

    const pickUrl = () => {
      const n = i++;
      // Prefer heavy downloads; every 5th URL is light (still a real stream)
      if (n % 5 === 4) {
        return resolveLightUrl(LIGHT_URLS[n % LIGHT_URLS.length]);
      }
      return heavies[n % heavies.length];
    };

    const recordHit = (hit) => {
      job.hits.push(hit);
      if (job.hits.length > 200) job.hits.splice(0, job.hits.length - 200);
    };

    /** One proxy download — counts toward concurrent streams on the phone. */
    const oneStream = async (url) => {
      job.inFlight += 1;
      if (job.inFlight > job.peakInFlight) job.peakInFlight = job.inFlight;
      job.lastUrl = url;
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
        recordHit({
          url,
          httpCode: res.httpCode,
          bytes,
          durationMs: Date.now() - t0,
          ok,
          at: Date.now(),
          totalBytes: job.totalBytes,
          parallel: job.parallel,
        });
        job.lastError = ok ? null : `HTTP ${res.httpCode}`;
      } catch (err) {
        job.failCount += 1;
        job.lastError = err instanceof Error ? err.message : String(err);
        recordHit({
          url,
          ok: false,
          error: job.lastError,
          durationMs: Date.now() - t0,
          at: Date.now(),
          totalBytes: job.totalBytes,
          parallel: job.parallel,
        });
      } finally {
        job.inFlight = Math.max(0, job.inFlight - 1);
      }
    };

    try {
      while (
        Date.now() < deadline &&
        job.totalBytes < targetBytes &&
        !job.cancel
      ) {
        // Launch up to `parallel` concurrent CONNECT streams through the phone
        const batchSize = Math.min(
          parallel,
          // Don't overshoot target too hard: leave room for remaining bytes
          Math.max(
            1,
            Math.ceil((targetBytes - job.totalBytes) / Math.max(chunkBytes, 1)),
          ),
        );
        const urls = Array.from({ length: batchSize }, () => pickUrl());
        await Promise.all(urls.map((url) => oneStream(url)));

        if (job.failCount > 0 && job.okCount === 0 && i >= parallel) {
          // All first wave failed — brief backoff before retrying
          await new Promise((r) => setTimeout(r, 800));
        } else {
          // Tiny gap so UI/poll can see intermediate MB and stream counts
          await new Promise((r) => setTimeout(r, 80));
        }
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

/**
 * Live operator exit test: resolve sticky/rotate credential → curl through
 * local gate → BusyProxy /api/whoami (IP + geo). Private enrichers
 * may run on the server only and are never exposed in responses.
 *
 * Used by Admin → Proxy access "Live exit test".
 */
export async function testProxyExit(opts = {}) {
  const edge = getEdgeGateway();
  const ports = edge.getPorts();
  const mode = opts.mode === "sticky" ? "sticky" : "rotate";
  const type = ["mobile", "residential", "any"].includes(opts.type)
    ? opts.type
    : "any";
  const sessionId =
    opts.sessionId ||
    (mode === "sticky" ? `t${crypto.randomBytes(4).toString("hex")}` : null);
  const hardMs = Math.min(Math.max(Number(opts.timeoutMs) || 22_000, 6_000), 40_000);
  const started = Date.now();

  let baseUser = opts.username || opts.baseUser || null;
  let password = opts.password || null;
  let credId = opts.credentialId || null;
  let allowlistRestore = null;

  // Device pin: use admin probe sticky for that phone (always type matching device)
  if (opts.deviceId && !opts.username && !opts.credentialId) {
    const probe = edge.ensureProbeCredential(opts.deviceId);
    baseUser = probe.username;
    password = probe.password;
    credId = probe.id;
    const uris = edge.buildUris(baseUser, password, {
      mode: "sticky",
      type: probe.endpoints.type || type || "any",
      sessionId: sessionId || probe.endpoints.sessionId,
    });
    return runExitThroughProxy({
      edge,
      ports,
      fullUsername: uris.username,
      password,
      mode: "sticky",
      type: uris.type,
      sessionId: uris.sessionId,
      hardMs,
      started,
      preferredDeviceId: opts.deviceId,
      note: "Pinned to selected device via admin probe sticky session",
    });
  }

  if (credId) {
    const c = edge.listCredentials().find((x) => x.id === credId);
    if (!c) throw new Error("Credential not found");
    if (!c.password) {
      throw new Error(
        "Password not in memory (server may have restarted). Re-mint or paste password.",
      );
    }
    baseUser = c.username;
    password = c.password;
    // Temporarily allow loopback so the droplet can dial its own gate
    if (
      Array.isArray(c.allowlistIps) &&
      c.allowlistIps.length > 0 &&
      !c.allowlistIps.includes("127.0.0.1")
    ) {
      allowlistRestore = [...c.allowlistIps];
      edge.updateCredential(c.id, {
        allowlistIps: [...c.allowlistIps, "127.0.0.1", "::1"],
      });
    }
  }

  if (!baseUser || !password) {
    throw new Error("username+password or credentialId (or deviceId) required");
  }

  // If raw username already includes markers, use as-is; else build from mode/type
  const parsed = edge.parseProxyUsername(baseUser);
  let fullUsername = baseUser;
  if (!parsed.type && !parsed.mode && !parsed.sessionId) {
    const uris = edge.buildUris(baseUser, password, {
      mode,
      type,
      sessionId: mode === "sticky" ? sessionId : null,
      country: opts.country || null,
    });
    fullUsername = uris.username;
  }

  try {
    return await runExitThroughProxy({
      edge,
      ports,
      fullUsername,
      password,
      mode,
      type,
      sessionId,
      hardMs,
      started,
      preferredDeviceId: opts.deviceId || null,
      note: null,
    });
  } finally {
    if (allowlistRestore && credId) {
      try {
        edge.updateCredential(credId, { allowlistIps: allowlistRestore });
      } catch {
        /* ignore restore errors */
      }
    }
  }
}

async function runExitThroughProxy({
  edge,
  ports,
  fullUsername,
  password,
  mode,
  type,
  sessionId,
  hardMs,
  started,
  preferredDeviceId,
  note,
}) {
  const proxyHost = "127.0.0.1";
  const proxyPort = ports.http;
  const proxyUrl = `http://${encodeURIComponent(fullUsername)}:${encodeURIComponent(password)}@${proxyHost}:${proxyPort}`;
  const publicHost = ports.host || "busyproxy.net";
  // Prefer busyproxy.net for client copy (gate.* may lack DNS)
  const clientHost =
    publicHost === "gate.busyproxy.net" ? "busyproxy.net" : publicHost;

  const whoami = whoamiUrl();
  const curlWhoami = (user, pass) =>
    `curl -x http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${clientHost}:${proxyPort} ${whoami}`;

  const run = async () => {
    // Dry-run route first (source = loopback for server-side test)
    const route = edge.connectCheck({
      username: fullUsername,
      password,
      sourceIp: "127.0.0.1",
      targetHost: "busyproxy.net",
    });

    if (!route.ok) {
      return {
        ok: false,
        mode,
        type,
        sessionId,
        username: fullUsername,
        route,
        seenIp: null,
        classification: null,
        device: preferredDeviceId
          ? edge.getDevice(preferredDeviceId)
          : null,
        fleetHint: summarizeFleet(edge),
        error: route.message || route.code || "route_denied",
        matchNote: `Route failed: ${route.code || ""} ${route.message || ""}`.trim(),
        durationMs: Date.now() - started,
        endpoints: {
          http: `http://${fullUsername}:***@${clientHost}:${proxyPort}`,
          curlWhoami: curlWhoami(fullUsername, "PASSWORD"),
        },
        note,
      };
    }

    const exit = await probeExitViaProxy(proxyUrl, { maxTime: 14 });
    const seenIp = exit.seenIp;

    const routedId = route.routedVia?.deviceId;
    let device = routedId ? edge.getDevice(routedId) : null;

    // Sync geo / public IP on the routed device
    if (routedId && seenIp) {
      try {
        edge.agentHello({ deviceId: routedId, publicIp: seenIp });
        await edge.refreshDeviceGeo(routedId);
        device = edge.getDevice(routedId) || device;
      } catch {
        /* optional */
      }
    }

    const expected = device?.lastPublicIp || route.routedVia?.exitIpMetadata;
    const match =
      seenIp && expected ? seenIp === expected : seenIp ? null : false;
    const isDo = seenIp === "46.101.114.84";
    const classification = classifyExit(exit.classificationBase, device);

    return {
      ok: Boolean(seenIp) && !isDo && exit.httpCode < 400,
      mode: route.mode || mode,
      type: route.type || type,
      sessionId: route.sessionId || sessionId,
      username: fullUsername,
      password, // admin-only live test — operator already knows it
      route,
      seenIp,
      expectedEgressIp: expected || null,
      match,
      matchNote: isDo
        ? "✗ Exit is DigitalOcean edge IP — phone tunnel not used. Start sharing on the phone."
        : match === true
          ? "✓ Exit IP matches the routed phone."
          : seenIp
            ? `Exit IP ${seenIp}` +
              (expected ? ` (device last saw ${expected})` : "") +
              " — switch the phone to mobile data and re-test to confirm carrier geo."
            : "Could not parse exit IP from BusyProxy whoami.",
      classification,
      device,
      fleetHint: summarizeFleet(edge),
      durationMs: Date.now() - started,
      endpoints: {
        http: `http://${fullUsername}:${password}@${clientHost}:${proxyPort}`,
        httpMasked: `http://${fullUsername}:***@${clientHost}:${proxyPort}`,
        socks5: `socks5://${fullUsername}:${password}@${clientHost}:${ports.socks}`,
        curlWhoami: curlWhoami(fullUsername, password),
        whoamiUrl: whoami,
      },
      note:
        note ||
        "Switch the phone to mobile data, wait until Fleet shows network=cellular, then re-run. Country/ASN/org should reflect the carrier.",
    };
  };

  try {
    return await Promise.race([
      run(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`exit_test_timeout_${hardMs}ms`)),
          hardMs,
        ),
      ),
    ]);
  } catch (err) {
    return {
      ok: false,
      mode,
      type,
      sessionId,
      username: fullUsername,
      seenIp: null,
      classification: null,
      fleetHint: summarizeFleet(edge),
      error: err instanceof Error ? err.message : String(err),
      matchNote: "Exit test timed out or failed. Ensure a phone is Sharing ON.",
      durationMs: Date.now() - started,
      endpoints: {
        curlWhoami: curlWhoami(fullUsername, password || "PASSWORD"),
        whoamiUrl: whoami,
      },
      note,
    };
  }
}

function summarizeFleet(edge) {
  const devices = edge.listDevices() || [];
  return {
    online: devices.filter((d) => d.online).length,
    cellular: devices.filter(
      (d) => d.online && (d.network === "cellular" || d.ipType === "mobile"),
    ).length,
    wifi: devices.filter(
      (d) => d.online && (d.network === "wifi" || d.ipType === "residential"),
    ).length,
    devices: devices.map((d) => ({
      deviceId: d.deviceId,
      name: d.name,
      online: d.online,
      network: d.network,
      ipType: d.ipType,
      lastPublicIp: d.lastPublicIp,
      city: d.city,
      country: d.country,
      countryName: d.countryName,
      isp: d.isp,
      asn: d.asn,
      carrier: d.carrier,
    })),
  };
}

function classifyExit(geo, device) {
  const asn = geo?.asn || geo?.as || device?.asn || null;
  const org =
    geo?.org ||
    geo?.isp ||
    geo?.organization ||
    geo?.asOrg ||
    device?.isp ||
    device?.asOrg ||
    null;
  const country =
    geo?.country ||
    geo?.country_code ||
    geo?.countryCode ||
    device?.countryName ||
    device?.country;
  const city = geo?.city || device?.city;
  const looksCarrier =
    geo?.mobile === true ||
    geo?.type === "mobile" ||
    /mobile|cellular|lte|5g|telecom|orange|moldcell|unite|vodafone|t-mobile/i.test(
      String(org || ""),
    );
  const deviceMobile =
    device?.network === "cellular" || device?.ipType === "mobile";
  return {
    ip: geo?.ip || null,
    country,
    countryCode: geo?.countryCode || geo?.country_code || device?.country || null,
    city,
    region: geo?.region || geo?.regionName || device?.region || null,
    asn,
    org,
    isp: geo?.isp || device?.isp || org,
    looksMobile: Boolean(looksCarrier || deviceMobile),
    deviceNetwork: device?.network || null,
    deviceIpType: device?.ipType || null,
    source: geo?.source === "busyproxy" ? "busyproxy" : geo ? "busyproxy" : device ? "device" : null,
  };
}
