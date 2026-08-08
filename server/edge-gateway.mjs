/**
 * BusyProxy edge control plane
 * ----------------------------
 * Reverse-tunnel registry + sticky/rotating session routing + URI builder.
 *
 * Customer never dials phone IPs. Modes:
 *  - rotating: pick any healthy exit matching filters; re-pick when offline
 *  - sticky:   pin sessionId → deviceId until session ends or device stays down
 *              (NO auto-failover — operator changes session manually)
 *
 * Default product pool = cellular (mobile) so proxy checkers see carrier ASN.
 */
import crypto from "node:crypto";
import { loadEnv } from "./env.mjs";
import { applyGeoToDevice, lookupIpGeo } from "./edge-geo.mjs";
import {
  loadEdgeState,
  saveEdgeState,
  scheduleSaveEdgeState,
  getEdgeStatePath,
} from "./edge-store.mjs";

loadEnv();

const GATE_HOST = process.env.EDGE_GATE_HOST || "gate.busyproxy.net";
const AGENT_HOST = process.env.EDGE_AGENT_HOST || "agent.busyproxy.net";
const B2B_ALIAS = process.env.EDGE_B2B_ALIAS || "proxy.busymate.net";
/** Dedicated proxy ports (not the web UI port). */
const HTTP_PORT = Number(process.env.EDGE_HTTP_PORT || 18080);
const SOCKS_PORT = Number(process.env.EDGE_SOCKS_PORT || 11080);
/** Phone reverse-tunnel WSS (served by main app /v1/tunnel). */
const AGENT_WSS =
  process.env.EDGE_AGENT_WSS ||
  process.env.AGENT_WSS_URL ||
  "wss://busyproxy.net/v1/tunnel";

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}
function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}
function now() {
  return Date.now();
}

/** @type {ReturnType<typeof createEdgeGateway> | null} */
let singleton = null;

export function getEdgeGateway() {
  if (!singleton) singleton = createEdgeGateway();
  return singleton;
}

function createEdgeGateway() {
  /** @type {Map<string, any>} */
  const devices = new Map();
  /** @type {Map<string, any>} */
  const credentials = new Map();
  /** @type {Map<string, string>} */
  const usernameIndex = new Map();
  /** @type {Map<string, string>} */
  const plaintextOnce = new Map();
  /**
   * Sticky map: key = `${credId}:${sessionId}` → { deviceId, createdAt, lastUsedAt, hits }
   * @type {Map<string, { deviceId: string, createdAt: number, lastUsedAt: number, hits: number }>}
   */
  const stickySessions = new Map();
  /** Round-robin cursor per pool key */
  const rotateCursor = new Map();
  const events = [];

  function pushEvent(type, detail) {
    events.unshift({ id: id("ev"), at: now(), type, ...detail });
    if (events.length > 400) events.length = 400;
    persistSoon();
  }

  function persistSnapshot() {
    return {
      v: 1,
      savedAt: now(),
      devices: [...devices.values()].map((d) => ({
        ...d,
        // offline after restart until agent reconnects
        online: false,
        tunnelId: null,
      })),
      credentials: [...credentials.values()].map((c) => ({
        ...c,
        // password rehydrated from plaintext map when present
        _password: plaintextOnce.get(c.id) || null,
      })),
      stickySessions: [...stickySessions.entries()].map(([k, v]) => ({
        key: k,
        ...v,
      })),
      rotateCursor: [...rotateCursor.entries()],
    };
  }

  function persistSoon() {
    scheduleSaveEdgeState(persistSnapshot);
  }

  function hydrateFromDisk() {
    const data = loadEdgeState();
    if (!data) return;
    try {
      for (const d of data.devices || []) {
        if (!d?.deviceId) continue;
        devices.set(d.deviceId, {
          ...d,
          online: false,
          tunnelId: null,
          source: d.source || "agent",
        });
      }
      for (const c of data.credentials || []) {
        if (!c?.id || !c?.username) continue;
        const { _password, ...rest } = c;
        credentials.set(c.id, rest);
        usernameIndex.set(c.username, c.id);
        if (_password) plaintextOnce.set(c.id, _password);
      }
      for (const s of data.stickySessions || []) {
        if (!s?.key) continue;
        stickySessions.set(s.key, {
          deviceId: s.deviceId,
          createdAt: s.createdAt,
          lastUsedAt: s.lastUsedAt,
          hits: s.hits || 0,
        });
      }
      for (const [k, v] of data.rotateCursor || []) {
        rotateCursor.set(k, v);
      }
      console.log(
        `[edge-store] restored devices=${devices.size} creds=${credentials.size} sticky=${stickySessions.size} from ${getEdgeStatePath()}`,
      );
    } catch (err) {
      console.warn("[edge-store] hydrate error:", err?.message || err);
    }
  }

  hydrateFromDisk();

  // No mock fleet — only devices that call /api/edge/agent/hello (real phones).

  function publicArchitecture() {
    return {
      model: "reverse_tunnel_edge",
      summary:
        "Customers use stable gate host + credential. Username params select sticky vs rotating and mobile pool. Phones only open outbound tunnels.",
      hosts: {
        gateHttp: `${GATE_HOST}:${HTTP_PORT}`,
        gateSocks: `${GATE_HOST}:${SOCKS_PORT}`,
        agent: AGENT_WSS,
        agentHostLegacy: `wss://${AGENT_HOST}/v1/tunnel`,
        b2bAlias: B2B_ALIAS,
        webPortal: "admin.busyproxy.net",
        webPortalLegacy: "portal.busyproxy.net",
      },
      modes: {
        rotating:
          "Each new connection (or session without sticky) picks a healthy matching exit. If that exit drops, next request auto-selects another.",
        sticky:
          "sessionId pins to one device. If that device goes offline, requests fail until you change session (or release sticky) — no silent IP swap.",
      },
      mobileByDefault:
        "Default type=mobile routes only cellular exits so IP checkers (ipinfo, whoer, etc.) classify carrier/mobile ASN — not Wi‑Fi residential.",
      whyNotDirectIp:
        "CGNAT + rotating carrier IPs. Routing key is device_id + live tunnel socket.",
      usernameGrammar:
        "{user}[-session-{id}][-country-{cc}][-type-mobile|residential|any][-mode-sticky|rotate]",
      exampleUris: {
        rotatingMobile: `http://USER-type-mobile:PASS@${GATE_HOST}:${HTTP_PORT}`,
        stickyMobile: `http://USER-session-abc123-type-mobile-mode-sticky:PASS@${GATE_HOST}:${HTTP_PORT}`,
        socksSticky: `socks5://USER-session-abc123-type-mobile:PASS@${GATE_HOST}:${SOCKS_PORT}`,
      },
    };
  }

  function toPublicDevice(d) {
    return {
      deviceId: d.deviceId,
      userId: d.userId,
      name: d.name,
      platform: d.platform,
      network: d.network,
      country: d.country,
      countryName: d.countryName || null,
      city: d.city || null,
      region: d.region || null,
      zip: d.zip || null,
      lat: d.lat ?? null,
      lon: d.lon ?? null,
      carrier: d.carrier,
      isp: d.isp || null,
      org: d.org || null,
      asn: d.asn,
      asOrg: d.asOrg || null,
      ipType: d.ipType,
      exitEnabled: d.exitEnabled,
      online: d.online,
      lastSeenAt: d.lastSeenAt,
      tunnelId: d.tunnelId,
      lastPublicIp: d.lastPublicIp,
      bytesUp: d.bytesUp,
      bytesDown: d.bytesDown,
      source: d.source || "agent",
      enrolledAt: d.enrolledAt || null,
      geoAt: d.geoAt || null,
      /** App install id for funnel logs (install → online), when known */
      installId: d.installId || null,
    };
  }

  /** Attach stable app installId to an enrolled device (for per-device logs). */
  function linkDeviceInstall(deviceId, installId) {
    if (!deviceId || !installId) return null;
    const d = devices.get(deviceId);
    if (!d) return null;
    const iid = String(installId).trim().slice(0, 80);
    if (iid.length < 8) return null;
    if (d.installId !== iid) {
      d.installId = iid;
      persistSoon();
    }
    return toPublicDevice(d);
  }

  /** Background geo enrich when we have a public IP (non-blocking). */
  function scheduleGeoEnrich(deviceId, ip) {
    if (!ip) return;
    const d = devices.get(deviceId);
    if (!d) return;
    // Skip if same IP already geo-resolved recently
    if (
      d.lastPublicIp === ip &&
      d.city &&
      d.geoAt &&
      now() - d.geoAt < 15 * 60 * 1000
    ) {
      return;
    }
    void lookupIpGeo(ip).then((geo) => {
      const cur = devices.get(deviceId);
      if (!cur || cur.lastPublicIp !== ip) return;
      applyGeoToDevice(cur, geo);
      pushEvent("geo_enrich", {
        deviceId,
        ip,
        city: geo?.city,
        country: geo?.countryCode,
      });
    });
  }

  async function refreshDeviceGeo(deviceId) {
    const d = devices.get(deviceId);
    if (!d) throw new Error("Device not found");
    const ip = d.lastPublicIp;
    if (!ip) throw new Error("No public IP on device yet");
    const geo = await lookupIpGeo(ip);
    if (!geo) throw new Error("Geo lookup failed");
    applyGeoToDevice(d, geo);
    return toPublicDevice(d);
  }

  function liveAgentOnline(deviceId) {
    try {
      // Lazy import avoids init cycles with edge-tunnel-hub
      const { getTunnelHub } = require("./edge-tunnel-hub.mjs");
      return getTunnelHub().hasAgent(deviceId);
    } catch {
      return false;
    }
  }

  function listDevices() {
    const mapped = [...devices.values()]
      .filter((d) => d.source !== "mock" && d.source !== "seed")
      .map((d) => {
        const pub = toPublicDevice(d);
        // Live WSS agent is source of truth (persisted d.online goes stale after restarts)
        pub.online = liveAgentOnline(d.deviceId);
        return pub;
      });

    // One row per phone install: collapse clones from TF updates / lost deviceId
    const best = new Map();
    const score = (x) => (x.online ? 1e15 : 0) + Number(x.lastSeenAt || 0);
    for (const d of mapped) {
      const key =
        d.installId && d.userId
          ? `inst:${d.userId}:${d.installId}`
          : `id:${d.deviceId}`;
      const prev = best.get(key);
      if (!prev || score(d) > score(prev)) best.set(key, d);
    }
    return [...best.values()].sort(
      (a, b) =>
        Number(b.online) - Number(a.online) ||
        Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0),
    );
  }

  function getDevice(deviceId) {
    const d = devices.get(deviceId);
    if (!d || d.source === "mock" || d.source === "seed") return null;
    const pub = toPublicDevice(d);
    pub.online = liveAgentOnline(deviceId);
    return pub;
  }

  function removeDevice(deviceId) {
    const d = devices.get(deviceId);
    if (!d) throw new Error("Device not found");
    devices.delete(deviceId);
    // Drop sticky binds for this device
    for (const [key, v] of stickySessions.entries()) {
      if (v.deviceId === deviceId) stickySessions.delete(key);
    }
    pushEvent("device_removed", { deviceId });
    return { ok: true, deviceId };
  }

  /** Drop all enrolled devices for a user (account deletion). */
  function removeDevicesByUserId(userId) {
    if (!userId) return { ok: true, removed: [] };
    const removed = [];
    for (const [id, d] of [...devices.entries()]) {
      if (d.userId === userId) {
        try {
          removeDevice(id);
          removed.push(id);
        } catch {
          /* ignore */
        }
      }
    }
    return { ok: true, removed };
  }

  /**
   * Mint (or reuse) a short-lived admin probe credential bound to one device.
   * Empty allowlist so the droplet can dial the gate for IP/traffic tests.
   */
  /** Stable sticky session id for operator “use this phone” URIs. */
  function deviceProxySessionId(deviceId) {
    const slug = String(deviceId || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-10);
    return `dev${slug || crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Device-pinned operator URI always uses type-any.
   * One sticky URI works whether the phone is on Wi‑Fi or mobile —
   * traffic always exits via that device's tunnel (exit IP follows the network).
   */
  function deviceProxyType(_d) {
    return "any";
  }

  /**
   * Operator-ready sticky proxy for one enrolled phone.
   * - Always pins boundDeviceId + sticky session → this device
   * - type=any so Wi‑Fi or cellular both work on the same URI
   * - Online: mint if needed, pre-bind sticky, return live URIs
   * - Offline: return existing URIs when password still in memory
   */
  function ensureProbeCredential(deviceId, opts = {}) {
    const d = devices.get(deviceId);
    if (!d) throw new Error("Device not found");
    const requireOnline = opts.requireOnline !== false;
    // Single URI for the phone — not filtered by mobile/residential
    const type = "any";
    const sessionId = deviceProxySessionId(deviceId);
    const label = `admin-probe:${deviceId}`;
    const networkLabel =
      d.ipType === "mobile" || d.network === "cellular"
        ? "mobile"
        : d.ipType === "residential" || d.network === "wifi"
          ? "wifi"
          : d.network || "unknown";

    const finish = (credId, baseUser, pass, mintedNow = false) => {
      const endpoints = buildUris(baseUser, pass, {
        mode: "sticky",
        type,
        sessionId,
      });
      // Pre-bind sticky when the WSS agent is actually live (not stale d.online)
      const live = liveAgentOnline(deviceId);
      if (live && d.exitEnabled) {
        const stickyKey = `${credId}:${sessionId}`;
        const prev = stickySessions.get(stickyKey);
        stickySessions.set(stickyKey, {
          deviceId,
          createdAt: prev?.createdAt || now(),
          lastUsedAt: now(),
          hits: prev?.hits || 0,
        });
        d.online = true;
        d.lastSeenAt = now();
        persistSoon();
      }
      const ready = Boolean(live && d.exitEnabled);
      return {
        id: credId,
        username: baseUser,
        password: pass,
        sessionId,
        type,
        mode: "sticky",
        boundDeviceId: deviceId,
        networkNow: networkLabel,
        ready,
        readyNote: ready
          ? `Online on ${networkLabel} — one URI for this phone; Wi‑Fi or mobile both tunnel here.`
          : !live
            ? "Device tunnel offline — Start sharing on the phone and wait for ONLINE, then retry."
            : !d.exitEnabled
              ? "Exit disabled — enable exit on this device first."
              : "Tunnel not connected yet.",
        endpoints,
        device: getDevice(deviceId) || toPublicDevice(d),
        minted: mintedNow,
      };
    };

    for (const c of credentials.values()) {
      if (c.label === label && c.enabled && c.boundDeviceId === deviceId) {
        const pass = plaintextOnce.get(c.id);
        if (pass) {
          // Force type=any so old mobile/residential URIs upgrade on refresh
          if (c.defaultType !== "any" || c.defaultMode !== "sticky") {
            c.defaultType = "any";
            c.defaultMode = "sticky";
            persistSoon();
          }
          return finish(c.id, c.username, pass, false);
        }
        // Password lost after restart — remint only when online
        if (d.online && d.exitEnabled) {
          credentials.delete(c.id);
          usernameIndex.delete(c.username);
          plaintextOnce.delete(c.id);
          break;
        }
        throw new Error(
          "Device proxy password not in memory (server restarted). Bring the device online and reopen details to re-issue the URI.",
        );
      }
    }

    if (requireOnline && (!d.online || !d.exitEnabled)) {
      throw new Error(
        "Device offline or exit disabled — start sharing on the phone first",
      );
    }
    if (!d.online || !d.exitEnabled) {
      throw new Error(
        "No proxy credential yet for this device. Open details while the phone is online and sharing.",
      );
    }

    const minted = mintCredential({
      label,
      boundDeviceId: deviceId,
      allowlistIps: [],
      defaultMode: "sticky",
      defaultType: "any",
    });
    return finish(minted.id, minted.username, minted.password, true);
  }

  /** Alias used by admin UI — same as ensureProbeCredential. */
  function getDeviceProxyAccess(deviceId, opts = {}) {
    return ensureProbeCredential(deviceId, opts);
  }

  /**
   * Admin-only fleet proxy: one rotating type-any URI across all online phones
   * (any user, Wi‑Fi or mobile). Earners never see this.
   */
  function ensureFleetProxyAccess() {
    const label = "admin-fleet-any";
    const type = "any";
    const mode = "rotate";

    const finish = (credId, baseUser, pass, mintedNow = false) => {
      const endpoints = buildUris(baseUser, pass, { mode, type });
      const online = listDevices().filter(
        (d) => d.online && d.exitEnabled && d.tunnelId,
      );
      return {
        id: credId,
        username: baseUser,
        password: pass,
        type,
        mode,
        boundDeviceId: null,
        onlineCount: online.length,
        ready: online.length > 0,
        readyNote:
          online.length > 0
            ? `Rotating across ${online.length} online exit(s) · any network · admin only`
            : "No online exits — URI is ready but CONNECT will fail until a phone is sharing",
        endpoints,
        minted: mintedNow,
        adminOnly: true,
      };
    };

    for (const c of credentials.values()) {
      if (c.label === label && c.enabled && !c.boundDeviceId) {
        const pass = plaintextOnce.get(c.id);
        if (pass) {
          if (c.defaultType !== "any" || c.defaultMode !== "rotate") {
            c.defaultType = "any";
            c.defaultMode = "rotate";
            persistSoon();
          }
          return finish(c.id, c.username, pass, false);
        }
        // Password lost — remint
        credentials.delete(c.id);
        usernameIndex.delete(c.username);
        plaintextOnce.delete(c.id);
        break;
      }
    }

    const minted = mintCredential({
      label,
      boundDeviceId: null,
      allowlistIps: [],
      defaultMode: "rotate",
      defaultType: "any",
    });
    return finish(minted.id, minted.username, minted.password, true);
  }

  function setExitEnabled(deviceId, enabled) {
    const d = devices.get(deviceId);
    if (!d) throw new Error("Device not found");
    d.exitEnabled = Boolean(enabled);
    pushEvent("exit_policy", { deviceId, exitEnabled: d.exitEnabled });
    return listDevices().find((x) => x.deviceId === deviceId);
  }

  /**
   * Stable phone identity: same user + installId (app install) always maps to one
   * device row so TestFlight/app updates do not flood the fleet with clones.
   */
  function findDeviceByInstall(userId, installId) {
    if (!userId || !installId) return null;
    const iid = String(installId).trim();
    if (iid.length < 4) return null;
    let best = null;
    for (const d of devices.values()) {
      if (d.userId === userId && d.installId && String(d.installId) === iid) {
        if (!best || (d.lastSeenAt || 0) > (best.lastSeenAt || 0)) best = d;
      }
    }
    return best;
  }

  function agentHello(body) {
    const userId = body.userId || "unknown";
    const installId = body.installId || body.install_id || null;
    let deviceId = body.deviceId || null;
    let d = deviceId ? devices.get(deviceId) : null;
    const providedSecret = body.deviceSecret;

    // Re-attach same phone across TF updates / lost local deviceId
    if (!d && installId && userId && userId !== "unknown") {
      d = findDeviceByInstall(userId, installId);
      if (d) deviceId = d.deviceId;
    }
    if (!deviceId) deviceId = id("dev");
    d = devices.get(deviceId);

    if (!d) {
      const secret = providedSecret || crypto.randomBytes(16).toString("hex");
      const network = body.network || "cellular";
      d = {
        deviceId,
        userId,
        name: body.name || "New device",
        platform: body.platform || "android",
        network,
        country: body.country || "XX",
        carrier: body.carrier || null,
        asn: body.asn || null,
        ipType: network === "cellular" ? "mobile" : "residential",
        exitEnabled: true,
        online: true,
        lastSeenAt: now(),
        tunnelId: id("tun"),
        lastPublicIp: body.publicIp || null,
        city: null,
        region: null,
        countryName: null,
        isp: null,
        org: null,
        asOrg: null,
        lat: null,
        lon: null,
        zip: null,
        geoAt: null,
        deviceSecretHash: hashSecret(secret),
        bytesUp: 0,
        bytesDown: 0,
        source: "agent",
        enrolledAt: now(),
        installId: installId || null,
      };
      devices.set(deviceId, d);
      if (d.lastPublicIp) scheduleGeoEnrich(deviceId, d.lastPublicIp);
      pushEvent("agent_enroll", { deviceId, network, userId: d.userId });
      persistSoon();
      return {
        ok: true,
        deviceId,
        tunnelId: d.tunnelId,
        deviceSecret: secret,
        agentUrl: AGENT_WSS,
      };
    }
    // Lost secret after app reinstall but same installId: rotate secret and re-bind
    if (
      providedSecret &&
      d.deviceSecretHash &&
      hashSecret(providedSecret) !== d.deviceSecretHash
    ) {
      // Allow re-bind only when installId matches (same app install)
      const sameInstall =
        installId && d.installId && String(installId) === String(d.installId);
      if (!sameInstall) {
        throw new Error("Invalid device secret");
      }
      const secret = crypto.randomBytes(16).toString("hex");
      d.deviceSecretHash = hashSecret(secret);
      d.online = true;
      d.lastSeenAt = now();
      if (body.name) d.name = body.name;
      if (body.platform) d.platform = body.platform;
      if (installId) d.installId = installId;
      persistSoon();
      pushEvent("agent_secret_rotate", { deviceId, userId: d.userId });
      return {
        ok: true,
        deviceId,
        tunnelId: d.tunnelId || id("tun"),
        deviceSecret: secret,
        agentUrl: AGENT_WSS,
        note: "Device re-bound (same install)",
      };
    }
    d.online = true;
    d.lastSeenAt = now();
    d.tunnelId = d.tunnelId || id("tun");
    const prevIp = d.lastPublicIp;
    d.lastPublicIp = body.publicIp || d.lastPublicIp;
    d.source = "agent";
    if (body.userId) d.userId = body.userId;
    if (body.name) d.name = body.name;
    if (body.network) {
      d.network = body.network;
      d.ipType = body.network === "cellular" ? "mobile" : "residential";
    }
    if (body.carrier) d.carrier = body.carrier;
    if (body.country && body.country !== "XX") d.country = body.country;
    if (body.installId || body.install_id) {
      d.installId = body.installId || body.install_id;
    }
    if (d.lastPublicIp && d.lastPublicIp !== prevIp) {
      scheduleGeoEnrich(deviceId, d.lastPublicIp);
    } else if (d.lastPublicIp && !d.city) {
      scheduleGeoEnrich(deviceId, d.lastPublicIp);
    }
    pushEvent("agent_reconnect", {
      deviceId,
      publicIp: d.lastPublicIp,
      network: d.network,
      userId: d.userId,
    });
    return {
      ok: true,
      deviceId,
      tunnelId: d.tunnelId,
      agentUrl: AGENT_WSS,
      exitEnabled: d.exitEnabled,
      note: "Tunnel rebound. Connect WSS agentUrl so CONNECT exits via this phone.",
    };
  }

  function agentBye(deviceId) {
    const d = devices.get(deviceId);
    if (!d) return { ok: true };
    d.online = false;
    d.tunnelId = null;
    pushEvent("agent_offline", { deviceId });
    return { ok: true };
  }

  function mintCredential(body = {}) {
    const username =
      body.username || `bp_${crypto.randomBytes(4).toString("hex")}`;
    if (usernameIndex.has(username)) throw new Error("Username taken");
    const password =
      body.password || crypto.randomBytes(12).toString("base64url");
    const credId = id("cred");
    const allowlistIps = normalizeIpList(body.allowlistIps || body.allowlist || []);
    const boundDeviceId = body.boundDeviceId || null;
    if (boundDeviceId && !devices.has(boundDeviceId)) {
      throw new Error("boundDeviceId not found");
    }
    /** defaultMode: rotate | sticky */
    const defaultMode = body.defaultMode === "sticky" ? "sticky" : "rotate";
    /** defaultType: mobile | residential | any — mobile for proxy-checker accuracy */
    const defaultType = body.defaultType || "mobile";

    const cred = {
      id: credId,
      username,
      secretHash: hashSecret(password),
      label: body.label || "API access",
      boundDeviceId,
      boundCountry: body.boundCountry || null,
      allowlistIps,
      defaultMode,
      defaultType,
      enabled: body.enabled !== false,
      createdAt: now(),
      lastUsedAt: 0,
      useCount: 0,
    };
    credentials.set(credId, cred);
    usernameIndex.set(username, credId);
    plaintextOnce.set(credId, password);
    pushEvent("cred_mint", {
      credId,
      username,
      boundDeviceId,
      allowlistIps,
      defaultMode,
      defaultType,
    });

    const uris = buildUris(username, password, {
      mode: defaultMode,
      type: defaultType,
      country: cred.boundCountry,
    });
    return {
      id: credId,
      username,
      password,
      label: cred.label,
      boundDeviceId,
      boundCountry: cred.boundCountry,
      allowlistIps,
      defaultMode,
      defaultType,
      enabled: cred.enabled,
      endpoints: uris,
      note: "Password shown once. Prefer type=mobile for carrier IP classification.",
    };
  }

  function listCredentials() {
    return [...credentials.values()].map((c) => publicCred(c));
  }

  function publicCred(c) {
    const pass = plaintextOnce.get(c.id);
    return {
      id: c.id,
      username: c.username,
      label: c.label,
      boundDeviceId: c.boundDeviceId,
      boundCountry: c.boundCountry,
      allowlistIps: c.allowlistIps,
      defaultMode: c.defaultMode || "rotate",
      defaultType: c.defaultType || "mobile",
      enabled: c.enabled,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
      useCount: c.useCount,
      password: pass,
      endpoints: buildUris(c.username, pass || "***", {
        mode: c.defaultMode || "rotate",
        type: c.defaultType || "mobile",
        country: c.boundCountry,
      }),
    };
  }

  function updateCredential(credId, patch) {
    const c = credentials.get(credId);
    if (!c) throw new Error("Credential not found");
    if (patch.label !== undefined) c.label = String(patch.label);
    if (patch.enabled !== undefined) c.enabled = Boolean(patch.enabled);
    if (patch.defaultMode !== undefined) {
      c.defaultMode = patch.defaultMode === "sticky" ? "sticky" : "rotate";
    }
    if (patch.defaultType !== undefined) {
      c.defaultType = ["mobile", "residential", "any"].includes(patch.defaultType)
        ? patch.defaultType
        : "mobile";
    }
    if (patch.boundDeviceId !== undefined) {
      if (patch.boundDeviceId && !devices.has(patch.boundDeviceId)) {
        throw new Error("boundDeviceId not found");
      }
      c.boundDeviceId = patch.boundDeviceId || null;
    }
    if (patch.boundCountry !== undefined) {
      c.boundCountry = patch.boundCountry || null;
    }
    if (patch.allowlistIps !== undefined) {
      c.allowlistIps = normalizeIpList(patch.allowlistIps);
    }
    if (patch.rotatePassword) {
      const password = crypto.randomBytes(12).toString("base64url");
      c.secretHash = hashSecret(password);
      plaintextOnce.set(credId, password);
      pushEvent("cred_rotate", { credId });
      return { ...publicCred(c), password };
    }
    pushEvent("cred_update", { credId, patch: Object.keys(patch) });
    return publicCred(c);
  }

  function revokeCredential(credId) {
    const c = credentials.get(credId);
    if (!c) throw new Error("Credential not found");
    credentials.delete(credId);
    usernameIndex.delete(c.username);
    plaintextOnce.delete(credId);
    for (const key of [...stickySessions.keys()]) {
      if (key.startsWith(credId + ":")) stickySessions.delete(key);
    }
    pushEvent("cred_revoke", { credId, username: c.username });
    return { ok: true };
  }

  /**
   * Parse BrightData-style username:
   *   base[-session-ID][-country-CC][-type-mobile|residential|any][-mode-sticky|rotate]
   */
  function parseProxyUsername(raw) {
    const parts = String(raw || "").split("-");
    let base = parts[0] || "";
    let i = 1;
    // base may be bp_xxxx only; if username itself contains no markers, full string is base
    // Re-join carefully: markers are known tokens
    const tokens = String(raw || "").split("-");
    const markers = new Set(["session", "country", "type", "mode", "net"]);
    // find first marker index
    let firstMarker = -1;
    for (let k = 0; k < tokens.length; k++) {
      if (markers.has(tokens[k])) {
        firstMarker = k;
        break;
      }
    }
    if (firstMarker === -1) {
      return {
        baseUser: raw,
        sessionId: null,
        country: null,
        type: null,
        mode: null,
      };
    }
    base = tokens.slice(0, firstMarker).join("-");
    let sessionId = null;
    let country = null;
    let type = null;
    let mode = null;
    for (let k = firstMarker; k < tokens.length; k++) {
      const t = tokens[k];
      if (t === "session" && tokens[k + 1]) {
        sessionId = tokens[++k];
      } else if (t === "country" && tokens[k + 1]) {
        country = tokens[++k].toUpperCase();
      } else if ((t === "type" || t === "net") && tokens[k + 1]) {
        type = tokens[++k].toLowerCase();
        if (type === "cellular" || type === "cell") type = "mobile";
        if (type === "wifi") type = "residential";
      } else if (t === "mode" && tokens[k + 1]) {
        mode = tokens[++k].toLowerCase();
        if (mode === "rotating") mode = "rotate";
      }
    }
    return { baseUser: base, sessionId, country, type, mode };
  }

  function buildProxyUsername(baseUser, opts = {}) {
    let u = baseUser;
    if (opts.sessionId) u += `-session-${opts.sessionId}`;
    if (opts.country) u += `-country-${String(opts.country).toLowerCase()}`;
    if (opts.type && opts.type !== "default") u += `-type-${opts.type}`;
    if (opts.mode) u += `-mode-${opts.mode}`;
    return u;
  }

  function buildUris(baseUser, password, opts = {}) {
    const mode = opts.mode || "rotate";
    const type = opts.type || "mobile";
    const sessionId =
      opts.sessionId ||
      (mode === "sticky" ? `s${crypto.randomBytes(4).toString("hex")}` : null);
    const user = buildProxyUsername(baseUser, {
      sessionId: mode === "sticky" ? sessionId : opts.sessionId || null,
      country: opts.country || null,
      type,
      mode: mode === "sticky" ? "sticky" : mode === "rotate" ? "rotate" : null,
    });
    const encUser = encodeURIComponent(user);
    const encPass = encodeURIComponent(password || "");
    return {
      httpHost: GATE_HOST,
      httpPort: HTTP_PORT,
      socksHost: GATE_HOST,
      socksPort: SOCKS_PORT,
      b2bAlias: B2B_ALIAS,
      username: user,
      sessionId: sessionId,
      mode,
      type,
      http: `http://${encUser}:${encPass}@${GATE_HOST}:${HTTP_PORT}`,
      socks5: `socks5://${encUser}:${encPass}@${GATE_HOST}:${SOCKS_PORT}`,
      httpDisplay: `http://${user}:${password || "***"}@${GATE_HOST}:${HTTP_PORT}`,
      socks5Display: `socks5://${user}:${password || "***"}@${GATE_HOST}:${SOCKS_PORT}`,
      curlExample: `curl -x http://${encUser}:${encPass}@${GATE_HOST}:${HTTP_PORT} https://busyproxy.net/api/whoami`,
    };
  }

  function poolFilter(opts) {
    const type = opts.type || "mobile";
    const country = opts.country || null;
    const boundDeviceId = opts.boundDeviceId || null;
    return listDevices().filter((d) => {
      if (!d.online || !d.exitEnabled || !d.tunnelId) return false;
      if (boundDeviceId && d.deviceId !== boundDeviceId) return false;
      if (country && d.country !== country) return false;
      if (type === "mobile" && d.ipType !== "mobile" && d.network !== "cellular")
        return false;
      if (
        type === "residential" &&
        d.ipType !== "residential" &&
        d.network !== "wifi"
      )
        return false;
      return true;
    });
  }

  function pickRotating(pool, poolKey) {
    if (!pool.length) return null;
    const cur = rotateCursor.get(poolKey) || 0;
    const idx = cur % pool.length;
    rotateCursor.set(poolKey, cur + 1);
    return pool[idx];
  }

  /**
   * Core route resolution for CONNECT/SOCKS and connect-check API.
   */
  function resolveRoute(body) {
    const rawUser = body.username || "";
    const password = body.password || "";
    const sourceIp = body.sourceIp || body.ip || "";
    const targetHost = body.targetHost || body.host || null;
    const parsed = parseProxyUsername(rawUser);

    const credId = usernameIndex.get(parsed.baseUser);
    if (!credId) {
      return deny("invalid_credentials", "Unknown username");
    }
    const c = credentials.get(credId);
    if (!c?.enabled) return deny("disabled", "Credential disabled");
    if (hashSecret(password) !== c.secretHash) {
      return deny("invalid_credentials", "Bad password");
    }
    if (c.allowlistIps.length > 0) {
      if (!sourceIp || !ipAllowed(sourceIp, c.allowlistIps)) {
        return deny(
          "ip_not_allowed",
          `Source ${sourceIp || "?"} not in allowlist`,
          { allowlistIps: c.allowlistIps },
        );
      }
    }

    const type = parsed.type || c.defaultType || "mobile";
    let mode = parsed.mode || c.defaultMode || "rotate";
    // session present implies sticky unless mode=rotate explicitly
    if (parsed.sessionId && !parsed.mode) mode = "sticky";
    if (!parsed.sessionId && mode === "sticky") {
      return deny(
        "session_required",
        "Sticky mode requires -session-{id} in the username",
      );
    }

    const country = parsed.country || c.boundCountry || null;
    const boundDeviceId = c.boundDeviceId || null;
    const poolKey = `${type}:${country || "*"}:${boundDeviceId || "*"}`;
    const pool = poolFilter({ type, country, boundDeviceId });

    let device = null;
    let stickyKey = null;

    if (mode === "sticky") {
      stickyKey = `${credId}:${parsed.sessionId}`;
      const existing = stickySessions.get(stickyKey);
      if (existing) {
        const pinned = devices.get(existing.deviceId);
        // Device-bound creds ignore mobile/residential filter — same phone on any net
        const typeOk =
          Boolean(boundDeviceId && pinned?.deviceId === boundDeviceId) ||
          !type ||
          type === "any" ||
          (type === "mobile" &&
            (pinned?.ipType === "mobile" || pinned?.network === "cellular")) ||
          (type === "residential" &&
            (pinned?.ipType === "residential" || pinned?.network === "wifi"));
        if (
          pinned &&
          pinned.online &&
          pinned.exitEnabled &&
          pinned.tunnelId &&
          typeOk
        ) {
          existing.lastUsedAt = now();
          existing.hits += 1;
          device = pinned;
        } else {
          // Sticky: do NOT auto-failover (product requirement)
          pushEvent("sticky_down", {
            sessionId: parsed.sessionId,
            deviceId: existing.deviceId,
          });
          return deny(
            "sticky_device_offline",
            "Sticky exit is offline. Change session id for a new IP, or wait for device reconnect. No automatic re-route in sticky mode.",
            {
              sessionId: parsed.sessionId,
              pinnedDeviceId: existing.deviceId,
              suggestion: buildProxyUsername(parsed.baseUser, {
                sessionId: `s${crypto.randomBytes(4).toString("hex")}`,
                country,
                type,
                mode: "sticky",
              }),
            },
          );
        }
      } else {
        // first bind
        device = pickRotating(pool, poolKey);
        if (!device) {
          return deny(
            "no_capacity",
            `No online ${type} exits` +
              (country ? ` in ${country}` : "") +
              " available",
          );
        }
        stickySessions.set(stickyKey, {
          deviceId: device.deviceId,
          createdAt: now(),
          lastUsedAt: now(),
          hits: 1,
        });
        pushEvent("sticky_bind", {
          sessionId: parsed.sessionId,
          deviceId: device.deviceId,
        });
      }
    } else {
      // rotating
      device = pickRotating(pool, poolKey);
      if (!device) {
        return deny(
          "no_capacity",
          `No online ${type} exits` +
            (country ? ` in ${country}` : "") +
            " available",
        );
      }
    }

    const full = devices.get(device.deviceId);
    c.lastUsedAt = now();
    c.useCount += 1;
    const streamId = id("str");
    pushEvent("connect_ok", {
      credId: c.id,
      deviceId: full.deviceId,
      mode,
      type,
      sessionId: parsed.sessionId,
      sourceIp,
      targetHost,
      streamId,
      tunnelId: full.tunnelId,
      ipType: full.ipType,
      carrier: full.carrier,
      asn: full.asn,
    });

    return {
      ok: true,
      streamId,
      mode,
      type,
      sessionId: parsed.sessionId,
      sticky: mode === "sticky",
      routedVia: {
        deviceId: full.deviceId,
        tunnelId: full.tunnelId,
        network: full.network,
        country: full.country,
        carrier: full.carrier,
        asn: full.asn,
        ipType: full.ipType,
        exitIpMetadata: full.lastPublicIp,
      },
      edge: {
        gate: GATE_HOST,
        httpPort: HTTP_PORT,
        socksPort: SOCKS_PORT,
        b2bAlias: B2B_ALIAS,
      },
      message:
        mode === "sticky"
          ? "Sticky session bound. Same device until it disconnects (then manual session change)."
          : "Rotating pool pick. Next connection may use another healthy mobile exit if this one drops.",
    };
  }

  function connectCheck(body) {
    return resolveRoute(body);
  }

  function releaseSticky(body) {
    const parsed = parseProxyUsername(body.username || "");
    const credId = usernameIndex.get(parsed.baseUser);
    if (!credId) throw new Error("Unknown username");
    const sessionId = body.sessionId || parsed.sessionId;
    if (!sessionId) throw new Error("sessionId required");
    const key = `${credId}:${sessionId}`;
    const had = stickySessions.delete(key);
    pushEvent("sticky_release", { sessionId, had });
    return { ok: true, released: had, sessionId };
  }

  function listStickySessions() {
    return [...stickySessions.entries()].map(([key, v]) => {
      const [credId, sessionId] = key.split(":");
      const d = devices.get(v.deviceId);
      const cred = credentials.get(credId);
      return {
        key,
        credId,
        username: cred?.username,
        sessionId,
        deviceId: v.deviceId,
        deviceOnline: Boolean(d?.online),
        exitIp: d?.lastPublicIp,
        carrier: d?.carrier,
        country: d?.country,
        createdAt: v.createdAt,
        lastUsedAt: v.lastUsedAt,
        hits: v.hits,
      };
    });
  }

  function uriPreview(body = {}) {
    const baseUser = body.username || "bp_YOURUSER";
    const password = body.password || "YOUR_PASSWORD";
    return {
      rotatingMobile: buildUris(baseUser, password, {
        mode: "rotate",
        type: "mobile",
        country: body.country,
      }),
      stickyMobile: buildUris(baseUser, password, {
        mode: "sticky",
        type: "mobile",
        sessionId: body.sessionId || "mysession01",
        country: body.country,
      }),
      rotatingAny: buildUris(baseUser, password, {
        mode: "rotate",
        type: "any",
      }),
      grammar:
        "{user}[-session-{id}][-country-{cc}][-type-mobile|residential|any][-mode-sticky|rotate]",
      notes: [
        "Default product: type=mobile (cellular only) so checkers see mobile/carrier IP.",
        "Sticky: same session id → same device; offline → error (change session for new IP).",
        "Rotate: pool round-robin; offline devices skipped automatically.",
      ],
    };
  }

  function deny(code, message, extra = {}) {
    pushEvent("connect_deny", { code, message, ...extra });
    return { ok: false, code, message, ...extra };
  }

  function snapshot() {
    const all = listDevices();
    const online = all.filter((d) => d.online).length;
    const mobileOnline = all.filter(
      (d) => d.online && (d.ipType === "mobile" || d.network === "cellular"),
    ).length;
    return {
      architecture: publicArchitecture(),
      stats: {
        devices: all.length,
        online,
        mobileOnline,
        credentials: credentials.size,
        stickySessions: stickySessions.size,
        events: events.length,
      },
      devices: all,
      credentials: listCredentials(),
      stickySessions: listStickySessions(),
      events: events.slice(0, 50),
      uriPreview: uriPreview({}),
    };
  }

  /** Record bytes after a successful stream (proxy server calls this). */
  function recordTraffic(deviceId, up, down) {
    const d = devices.get(deviceId);
    if (!d) return;
    d.bytesUp += up;
    d.bytesDown += down;
    persistSoon();
  }

  return {
    publicArchitecture,
    snapshot,
    listDevices,
    getDevice,
    linkDeviceInstall,
    removeDevice: (deviceId) => {
      const r = removeDevice(deviceId);
      persistSoon();
      return r;
    },
    removeDevicesByUserId: (userId) => {
      const r = removeDevicesByUserId(userId);
      persistSoon();
      return r;
    },
    ensureProbeCredential,
    getDeviceProxyAccess,
    ensureFleetProxyAccess,
    getFleetProxyAccess: ensureFleetProxyAccess,
    refreshDeviceGeo,
    setExitEnabled: (deviceId, enabled) => {
      const r = setExitEnabled(deviceId, enabled);
      persistSoon();
      return r;
    },
    agentHello: (body) => {
      const r = agentHello(body);
      persistSoon();
      return r;
    },
    agentBye: (deviceId) => {
      const r = agentBye(deviceId);
      persistSoon();
      return r;
    },
    mintCredential: (body) => {
      const r = mintCredential(body);
      persistSoon();
      return r;
    },
    listCredentials,
    updateCredential: (id, patch) => {
      const r = updateCredential(id, patch);
      persistSoon();
      return r;
    },
    revokeCredential: (id) => {
      const r = revokeCredential(id);
      persistSoon();
      return r;
    },
    connectCheck,
    resolveRoute,
    releaseSticky: (body) => {
      const r = releaseSticky(body);
      persistSoon();
      return r;
    },
    listStickySessions,
    uriPreview,
    buildUris,
    parseProxyUsername,
    recordTraffic,
    persistNow: () => {
      saveEdgeState(persistSnapshot());
    },
    getPorts: () => ({ http: HTTP_PORT, socks: SOCKS_PORT, host: GATE_HOST }),
  };
}

function normalizeIpList(list) {
  if (!list) return [];
  if (typeof list === "string") {
    return list
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...list].map(String).map((s) => s.trim()).filter(Boolean);
}

function ipAllowed(ip, allowlist) {
  if (allowlist.includes(ip)) return true;
  for (const rule of allowlist) {
    if (rule.includes("/") && ipv4InCidr(ip, rule)) return true;
  }
  return false;
}

function ipv4InCidr(ip, cidr) {
  try {
    const [base, bitsStr] = cidr.split("/");
    const bits = Number(bitsStr);
    if (!Number.isFinite(bits) || bits < 0 || bits > 32) return false;
    const ipN = ipToInt(ip);
    const baseN = ipToInt(base);
    if (ipN === null || baseN === null) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipN & mask) === (baseN & mask);
  } catch {
    return false;
  }
}

function ipToInt(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => n < 0 || n > 255 || !Number.isFinite(n))) {
    return null;
  }
  return (((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]) >>> 0;
}
