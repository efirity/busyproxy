/**
 * BusyProxy edge control plane (P0)
 * ---------------------------------
 * Phones do NOT accept inbound connections. They register a reverse tunnel
 * identity here. Customers hit stable gate.busyproxy.net with operator-minted
 * credentials + optional source IP allowlist.
 *
 * This module is the registry + policy brain. Full stream mux lives with the
 * edge process; here we simulate online tunnels and authorize access.
 */
import crypto from "node:crypto";
import { loadEnv } from "./env.mjs";

loadEnv();

const GATE_HOST =
  process.env.EDGE_GATE_HOST || "gate.busyproxy.net";
const AGENT_HOST =
  process.env.EDGE_AGENT_HOST || "agent.busyproxy.net";
const B2B_ALIAS =
  process.env.EDGE_B2B_ALIAS || "proxy.busymate.net";
const HTTP_PORT = Number(process.env.EDGE_HTTP_PORT || 8080);
const SOCKS_PORT = Number(process.env.EDGE_SOCKS_PORT || 1080);

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function now() {
  return Date.now();
}

/** @type {import('./edge-gateway.mjs').EdgeState | null} */
let singleton = null;

/**
 * @typedef {object} DeviceNode
 * @property {string} deviceId
 * @property {string} userId
 * @property {string} name
 * @property {string} platform
 * @property {string} network  wifi|cellular
 * @property {string} country
 * @property {boolean} exitEnabled  operator can disable without earner knowing proxy details
 * @property {boolean} online
 * @property {number|null} lastSeenAt
 * @property {string|null} tunnelId
 * @property {string|null} lastPublicIp  informational only — never used for routing
 * @property {string} deviceSecretHash
 * @property {number} bytesUp
 * @property {number} bytesDown
 */

/**
 * @typedef {object} AccessCredential
 * @property {string} id
 * @property {string} username
 * @property {string} secretHash
 * @property {string} label
 * @property {string|null} boundDeviceId
 * @property {string|null} boundCountry  ISO if pool by country
 * @property {string[]} allowlistIps  empty = any source
 * @property {boolean} enabled
 * @property {number} createdAt
 * @property {number} lastUsedAt
 * @property {number} useCount
 */

export function getEdgeGateway() {
  if (singleton) return singleton;

  /** @type {Map<string, DeviceNode>} */
  const devices = new Map();
  /** @type {Map<string, AccessCredential>} */
  const credentials = new Map();
  /** @type {Map<string, string>} username → credential id */
  const usernameIndex = new Map();
  /** plaintext secrets only kept briefly for mint response — not re-readable */
  /** @type {Map<string, string>} */
  const plaintextOnce = new Map();

  const events = [];

  function pushEvent(type, detail) {
    events.unshift({ id: id("ev"), at: now(), type, ...detail });
    if (events.length > 300) events.length = 300;
  }

  // Seed a few demo fleet devices (operator-visible)
  function seed() {
    const seeds = [
      {
        deviceId: "dev_pixel8_md",
        userId: "941d41c0-e9c7-49f0-bfe0-e74f691b0c99",
        name: "Pixel 8",
        platform: "android",
        network: "wifi",
        country: "MD",
        exitEnabled: true,
        online: true,
      },
      {
        deviceId: "dev_oldphone_md",
        userId: "941d41c0-e9c7-49f0-bfe0-e74f691b0c99",
        name: "Home spare phone",
        platform: "android",
        network: "wifi",
        country: "MD",
        exitEnabled: true,
        online: true,
      },
      {
        deviceId: "dev_ro_cell",
        userId: "user_ro_demo",
        name: "RO mobile",
        platform: "android",
        network: "cellular",
        country: "RO",
        exitEnabled: true,
        online: false,
      },
    ];
    for (const s of seeds) {
      const secret = crypto.randomBytes(16).toString("hex");
      devices.set(s.deviceId, {
        ...s,
        lastSeenAt: s.online ? now() - 5000 : now() - 3600_000,
        tunnelId: s.online ? id("tun") : null,
        lastPublicIp: s.online ? "100.64." + (Math.random() * 200 | 0) + ".1" : null,
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
        "Devices open outbound tunnels to the control plane. Customers connect only to stable edge hosts with operator credentials. Mobile IP changes do not change the customer endpoint.",
      hosts: {
        gateHttp: `${GATE_HOST}:${HTTP_PORT}`,
        gateSocks: `${GATE_HOST}:${SOCKS_PORT}`,
        agent: `wss://${AGENT_HOST}/v1/tunnel`,
        b2bAlias: B2B_ALIAS,
      },
      whyNotDirectIp:
        "Mobile carriers use CGNAT; public IPs rotate and block inbound. Routing uses live tunnel sockets keyed by device_id, never the phone’s current IP.",
      speed:
        "Warm multiplexed tunnels + regional edge POPs + sticky credentials. No per-request discovery of phone IP.",
      earnerTransparency:
        "Earner UI shows only share toggle, GB, and $. Host/user/pass/allowlists are operator-only.",
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
        exitEnabled: d.exitEnabled,
        online: d.online,
        lastSeenAt: d.lastSeenAt,
        tunnelId: d.tunnelId,
        lastPublicIp: d.lastPublicIp,
        bytesUp: d.bytesUp,
        bytesDown: d.bytesDown,
        // secret hash never exposed
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

  /**
   * Agent hello / heartbeat — phone reconnected (new IP irrelevant).
   */
  function agentHello(body) {
    const deviceId = body.deviceId || id("dev");
    let d = devices.get(deviceId);
    const providedSecret = body.deviceSecret;

    if (!d) {
      const secret = providedSecret || crypto.randomBytes(16).toString("hex");
      d = {
        deviceId,
        userId: body.userId || "unknown",
        name: body.name || "New device",
        platform: body.platform || "android",
        network: body.network || "wifi",
        country: body.country || "XX",
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
      pushEvent("agent_enroll", { deviceId, network: d.network });
      return {
        ok: true,
        deviceId,
        tunnelId: d.tunnelId,
        deviceSecret: secret,
        agentUrl: `wss://${AGENT_HOST}/v1/tunnel`,
        note: "Store deviceSecret on device; reconnect with same deviceId+secret after IP change.",
      };
    }

    if (providedSecret && hashSecret(providedSecret) !== d.deviceSecretHash) {
      throw new Error("Invalid device secret");
    }

    // IP may have changed — we only refresh socket identity
    d.online = true;
    d.lastSeenAt = now();
    d.tunnelId = id("tun");
    d.lastPublicIp = body.publicIp || d.lastPublicIp;
    if (body.network) d.network = body.network;
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
      body.username ||
      `bp_${crypto.randomBytes(4).toString("hex")}`;
    if (usernameIndex.has(username)) throw new Error("Username taken");
    const password = body.password || crypto.randomBytes(12).toString("base64url");
    const credId = id("cred");
    const allowlistIps = normalizeIpList(body.allowlistIps || body.allowlist || []);
    const boundDeviceId = body.boundDeviceId || null;
    if (boundDeviceId && !devices.has(boundDeviceId)) {
      throw new Error("boundDeviceId not found");
    }

    const cred = {
      id: credId,
      username,
      secretHash: hashSecret(password),
      label: body.label || "API access",
      boundDeviceId,
      boundCountry: body.boundCountry || null,
      allowlistIps,
      enabled: body.enabled !== false,
      createdAt: now(),
      lastUsedAt: 0,
      useCount: 0,
    };
    credentials.set(credId, cred);
    usernameIndex.set(username, credId);
    plaintextOnce.set(credId, password);
    pushEvent("cred_mint", { credId, username, boundDeviceId, allowlistIps });

    return {
      id: credId,
      username,
      password, // shown once
      label: cred.label,
      boundDeviceId,
      boundCountry: cred.boundCountry,
      allowlistIps,
      enabled: cred.enabled,
      endpoints: {
        http: `http://${username}:***@${GATE_HOST}:${HTTP_PORT}`,
        socks5: `socks5://${username}:***@${GATE_HOST}:${SOCKS_PORT}`,
        httpHost: GATE_HOST,
        httpPort: HTTP_PORT,
        socksHost: GATE_HOST,
        socksPort: SOCKS_PORT,
        b2bAlias: B2B_ALIAS,
      },
      note: "Password shown once. Earner never sees this. Store in your backend vault.",
    };
  }

  function listCredentials() {
    return [...credentials.values()].map((c) => ({
      id: c.id,
      username: c.username,
      label: c.label,
      boundDeviceId: c.boundDeviceId,
      boundCountry: c.boundCountry,
      allowlistIps: c.allowlistIps,
      enabled: c.enabled,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
      useCount: c.useCount,
      hasPasswordCached: plaintextOnce.has(c.id),
      endpoints: {
        httpHost: GATE_HOST,
        httpPort: HTTP_PORT,
        socksHost: GATE_HOST,
        socksPort: SOCKS_PORT,
        b2bAlias: B2B_ALIAS,
      },
    }));
  }

  function updateCredential(credId, patch) {
    const c = credentials.get(credId);
    if (!c) throw new Error("Credential not found");
    if (patch.label !== undefined) c.label = String(patch.label);
    if (patch.enabled !== undefined) c.enabled = Boolean(patch.enabled);
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

  function publicCred(c) {
    return {
      id: c.id,
      username: c.username,
      label: c.label,
      boundDeviceId: c.boundDeviceId,
      boundCountry: c.boundCountry,
      allowlistIps: c.allowlistIps,
      enabled: c.enabled,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
      useCount: c.useCount,
      password: plaintextOnce.get(c.id) || undefined,
      endpoints: {
        httpHost: GATE_HOST,
        httpPort: HTTP_PORT,
        socksHost: GATE_HOST,
        socksPort: SOCKS_PORT,
        b2bAlias: B2B_ALIAS,
        http: `http://${c.username}:***@${GATE_HOST}:${HTTP_PORT}`,
        socks5: `socks5://${c.username}:***@${GATE_HOST}:${SOCKS_PORT}`,
      },
    };
  }

  function revokeCredential(credId) {
    const c = credentials.get(credId);
    if (!c) throw new Error("Credential not found");
    credentials.delete(credId);
    usernameIndex.delete(c.username);
    plaintextOnce.delete(credId);
    pushEvent("cred_revoke", { credId, username: c.username });
    return { ok: true };
  }

  /**
   * Authorize a customer proxy attempt (what the edge does before opening a stream).
   */
  function connectCheck(body) {
    const username = body.username || "";
    const password = body.password || "";
    const sourceIp = body.sourceIp || body.ip || "";
    const targetHost = body.targetHost || body.host || "example.com";

    const credId = usernameIndex.get(username);
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
        return deny("ip_not_allowed", `Source ${sourceIp || "?"} not in allowlist`, {
          allowlistIps: c.allowlistIps,
        });
      }
    }

    let device = null;
    if (c.boundDeviceId) {
      device = devices.get(c.boundDeviceId) || null;
    } else {
      // pick best online exit-enabled device (optionally by country)
      const pool = listDevices().filter(
        (d) =>
          d.online &&
          d.exitEnabled &&
          (!c.boundCountry || d.country === c.boundCountry),
      );
      device = pool[0]
        ? devices.get(pool[0].deviceId)
        : null;
    }

    if (!device) return deny("no_capacity", "No device available for this credential");
    if (!device.exitEnabled) {
      return deny("device_disabled", "Exit disabled by operator (earner still sees app UI)");
    }
    if (!device.online || !device.tunnelId) {
      return deny("device_offline", "Device tunnel not connected — wait for agent reconnect");
    }

    c.lastUsedAt = now();
    c.useCount += 1;

    // Simulate stream open over reverse tunnel
    const streamId = id("str");
    pushEvent("connect_ok", {
      credId: c.id,
      deviceId: device.deviceId,
      sourceIp,
      targetHost,
      streamId,
      tunnelId: device.tunnelId,
    });

    return {
      ok: true,
      streamId,
      routedVia: {
        deviceId: device.deviceId,
        tunnelId: device.tunnelId,
        network: device.network,
        country: device.country,
        // lastPublicIp is metadata only
        devicePublicIpMetadata: device.lastPublicIp,
      },
      edge: {
        gate: GATE_HOST,
        b2bAlias: B2B_ALIAS,
      },
      message:
        "Authorized. Edge would multiplex this CONNECT over the device reverse tunnel (not dial the phone IP).",
    };
  }

  function deny(code, message, extra = {}) {
    pushEvent("connect_deny", { code, message, ...extra });
    return { ok: false, code, message, ...extra };
  }

  function snapshot() {
    const online = listDevices().filter((d) => d.online).length;
    return {
      architecture: publicArchitecture(),
      stats: {
        devices: devices.size,
        online,
        credentials: credentials.size,
        events: events.length,
      },
      devices: listDevices(),
      credentials: listCredentials(),
      events: events.slice(0, 40),
    };
  }

  singleton = {
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
  };
  return singleton;
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

/** Simple exact or CIDR /32-/24 style check for demo */
function ipAllowed(ip, allowlist) {
  if (allowlist.includes(ip)) return true;
  for (const rule of allowlist) {
    if (rule.includes("/")) {
      if (ipv4InCidr(ip, rule)) return true;
    }
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
