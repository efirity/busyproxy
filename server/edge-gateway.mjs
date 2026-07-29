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

loadEnv();

const GATE_HOST = process.env.EDGE_GATE_HOST || "gate.busyproxy.net";
const AGENT_HOST = process.env.EDGE_AGENT_HOST || "agent.busyproxy.net";
const B2B_ALIAS = process.env.EDGE_B2B_ALIAS || "proxy.busymate.net";
/** Dedicated proxy ports (not the web UI port). */
const HTTP_PORT = Number(process.env.EDGE_HTTP_PORT || 18080);
const SOCKS_PORT = Number(process.env.EDGE_SOCKS_PORT || 11080);

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
  }

  function seed() {
    const seeds = [
      {
        deviceId: "dev_md_cell_01",
        userId: "u_md_1",
        name: "MD · Pixel cellular",
        platform: "android",
        network: "cellular",
        country: "MD",
        carrier: "Orange Moldova",
        asn: "AS25454",
        ipType: "mobile",
        exitEnabled: true,
        online: true,
        lastPublicIp: "37.28.1" + (10 + ((Math.random() * 80) | 0)) + ".40",
      },
      {
        deviceId: "dev_md_cell_02",
        userId: "u_md_2",
        name: "MD · Samsung cellular",
        platform: "android",
        network: "cellular",
        country: "MD",
        carrier: "Moldcell",
        asn: "AS8926",
        ipType: "mobile",
        exitEnabled: true,
        online: true,
        lastPublicIp: "89.28.1" + (10 + ((Math.random() * 80) | 0)) + ".12",
      },
      {
        deviceId: "dev_ro_cell_01",
        userId: "u_ro_1",
        name: "RO · cellular",
        platform: "android",
        network: "cellular",
        country: "RO",
        carrier: "Orange RO",
        asn: "AS8953",
        ipType: "mobile",
        exitEnabled: true,
        online: true,
        lastPublicIp: "86.120." + ((Math.random() * 200) | 0) + ".55",
      },
      {
        deviceId: "dev_de_cell_01",
        userId: "u_de_1",
        name: "DE · cellular",
        platform: "android",
        network: "cellular",
        country: "DE",
        carrier: "Telekom DE",
        asn: "AS3320",
        ipType: "mobile",
        exitEnabled: true,
        online: false,
        lastPublicIp: null,
      },
      {
        deviceId: "dev_md_wifi_01",
        userId: "u_md_wifi",
        name: "MD · home Wi‑Fi",
        platform: "android",
        network: "wifi",
        country: "MD",
        carrier: null,
        asn: "AS8926",
        ipType: "residential",
        exitEnabled: true,
        online: true,
        lastPublicIp: "178.168." + ((Math.random() * 200) | 0) + ".9",
      },
      {
        deviceId: "dev_pixel8_md",
        userId: "941d41c0-e9c7-49f0-bfe0-e74f691b0c99",
        name: "Pixel 8 (demo earner)",
        platform: "android",
        network: "cellular",
        country: "MD",
        carrier: "Orange Moldova",
        asn: "AS25454",
        ipType: "mobile",
        exitEnabled: true,
        online: true,
        lastPublicIp: "37.28.55.10",
      },
    ];
    for (const s of seeds) {
      const secret = crypto.randomBytes(16).toString("hex");
      devices.set(s.deviceId, {
        ...s,
        lastSeenAt: s.online ? now() - 3000 : now() - 3_600_000,
        tunnelId: s.online ? id("tun") : null,
        deviceSecretHash: hashSecret(secret),
        bytesUp: Math.floor(Math.random() * 5e8),
        bytesDown: Math.floor(Math.random() * 2e9),
      });
    }
  }
  seed();

  function publicArchitecture() {
    return {
      model: "reverse_tunnel_edge",
      summary:
        "Customers use stable gate host + credential. Username params select sticky vs rotating and mobile pool. Phones only open outbound tunnels.",
      hosts: {
        gateHttp: `${GATE_HOST}:${HTTP_PORT}`,
        gateSocks: `${GATE_HOST}:${SOCKS_PORT}`,
        agent: `wss://${AGENT_HOST}/v1/tunnel`,
        b2bAlias: B2B_ALIAS,
        webPortal: "portal.busyproxy.net",
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

  function listDevices() {
    return [...devices.values()]
      .map((d) => ({
        deviceId: d.deviceId,
        userId: d.userId,
        name: d.name,
        platform: d.platform,
        network: d.network,
        country: d.country,
        carrier: d.carrier,
        asn: d.asn,
        ipType: d.ipType,
        exitEnabled: d.exitEnabled,
        online: d.online,
        lastSeenAt: d.lastSeenAt,
        tunnelId: d.tunnelId,
        lastPublicIp: d.lastPublicIp,
        bytesUp: d.bytesUp,
        bytesDown: d.bytesDown,
      }))
      .sort((a, b) => Number(b.online) - Number(a.online));
  }

  function setExitEnabled(deviceId, enabled) {
    const d = devices.get(deviceId);
    if (!d) throw new Error("Device not found");
    d.exitEnabled = Boolean(enabled);
    pushEvent("exit_policy", { deviceId, exitEnabled: d.exitEnabled });
    return listDevices().find((x) => x.deviceId === deviceId);
  }

  function agentHello(body) {
    const deviceId = body.deviceId || id("dev");
    let d = devices.get(deviceId);
    const providedSecret = body.deviceSecret;
    if (!d) {
      const secret = providedSecret || crypto.randomBytes(16).toString("hex");
      const network = body.network || "cellular";
      d = {
        deviceId,
        userId: body.userId || "unknown",
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
        deviceSecretHash: hashSecret(secret),
        bytesUp: 0,
        bytesDown: 0,
      };
      devices.set(deviceId, d);
      pushEvent("agent_enroll", { deviceId, network });
      return {
        ok: true,
        deviceId,
        tunnelId: d.tunnelId,
        deviceSecret: secret,
        agentUrl: `wss://${AGENT_HOST}/v1/tunnel`,
      };
    }
    if (providedSecret && hashSecret(providedSecret) !== d.deviceSecretHash) {
      throw new Error("Invalid device secret");
    }
    d.online = true;
    d.lastSeenAt = now();
    d.tunnelId = id("tun");
    d.lastPublicIp = body.publicIp || d.lastPublicIp;
    if (body.network) {
      d.network = body.network;
      d.ipType = body.network === "cellular" ? "mobile" : "residential";
    }
    pushEvent("agent_reconnect", {
      deviceId,
      publicIp: d.lastPublicIp,
      network: d.network,
    });
    return {
      ok: true,
      deviceId,
      tunnelId: d.tunnelId,
      agentUrl: `wss://${AGENT_HOST}/v1/tunnel`,
      exitEnabled: d.exitEnabled,
      note: "Tunnel rebound. Customer gate host unchanged.",
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
      curlExample: `curl -x http://${encUser}:${encPass}@${GATE_HOST}:${HTTP_PORT} https://api.ipify.org`,
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
        if (
          pinned &&
          pinned.online &&
          pinned.exitEnabled &&
          pinned.tunnelId &&
          (!type ||
            type === "any" ||
            (type === "mobile" &&
              (pinned.ipType === "mobile" || pinned.network === "cellular")) ||
            (type === "residential" &&
              (pinned.ipType === "residential" || pinned.network === "wifi")))
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
    const online = listDevices().filter((d) => d.online).length;
    const mobileOnline = listDevices().filter(
      (d) => d.online && (d.ipType === "mobile" || d.network === "cellular"),
    ).length;
    return {
      architecture: publicArchitecture(),
      stats: {
        devices: devices.size,
        online,
        mobileOnline,
        credentials: credentials.size,
        stickySessions: stickySessions.size,
        events: events.length,
      },
      devices: listDevices(),
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
  }

  return {
    publicArchitecture,
    snapshot,
    listDevices,
    setExitEnabled,
    agentHello,
    agentBye,
    mintCredential,
    listCredentials,
    updateCredential,
    revokeCredential,
    connectCheck,
    resolveRoute,
    releaseSticky,
    listStickySessions,
    uriPreview,
    buildUris,
    parseProxyUsername,
    recordTraffic,
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
