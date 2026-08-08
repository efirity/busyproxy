/**
 * Reverse-tunnel hub: phones open outbound WSS; gate CONNECT streams
 * are multiplexed as JSON frames so exit IP is the phone.
 *
 * Protocol (matches android TunnelProtocol.kt):
 *   server→phone: open | data | close | ping
 *   phone→server: hello | open_ok | open_err | data | close | stats | pong
 */
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { rateLimit } from "./edge-rate-limit.mjs";
import { bump, setMetric } from "./edge-metrics.mjs";

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

/** @type {ReturnType<typeof createTunnelHub> | null} */
let singleton = null;

export function getTunnelHub() {
  if (!singleton) singleton = createTunnelHub();
  return singleton;
}

function createTunnelHub() {
  /** deviceId → { ws, deviceId, network, connectedAt, streams: Map } */
  const agents = new Map();
  const ee = new EventEmitter();
  ee.setMaxListeners(200);

  function attach(ws, req) {
    let deviceId = null;
    let authed = false;
    const streams = new Map(); // streamId → { onData, onClose, closed }
    const ip =
      req?.socket?.remoteAddress?.replace(/^::ffff:/, "") ||
      req?.headers?.["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      "unknown";

    const send = (obj) => {
      if (ws.readyState === 1) {
        try {
          ws.send(typeof obj === "string" ? obj : JSON.stringify(obj));
        } catch {
          /* */
        }
      }
    };

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      const type = msg.type;

      if (type === "hello") {
        const rl = rateLimit("tunnel_hello", ip, {
          limit: Number(process.env.EDGE_TUNNEL_RATE_LIMIT || 30),
          windowMs: 60_000,
        });
        if (!rl.ok) {
          bump("tunnelRateLimited");
          send({ type: "hello_err", code: "rate_limited" });
          try {
            ws.close();
          } catch {
            /* */
          }
          return;
        }
        const edge = getEdgeGateway();
        const did = msg.deviceId;
        if (!did) {
          send({ type: "hello_err", code: "missing_device" });
          return;
        }
        // Re-bind: device must already be enrolled via /agent/hello (or accept live bind)
        const secret = msg.deviceSecret;
        try {
          // Keep registry in sync / mark online
          edge.agentHello({
            deviceId: did,
            deviceSecret: secret,
            network: msg.network,
            publicIp: msg.egressIp || msg.publicIp,
            userId: msg.userId,
            name: msg.name,
            platform: msg.platform || "android",
            country: msg.country,
            installId: msg.installId || msg.install_id,
          });
        } catch (err) {
          // If secret mismatch on reconnect, still allow first-time socket if enroll open
          send({
            type: "hello_err",
            code: "auth",
            message: err instanceof Error ? err.message : String(err),
          });
          return;
        }

        // Drop previous socket for same device
        const prev = agents.get(did);
        if (prev && prev.ws !== ws) {
          try {
            prev.ws.close(4000, "replaced");
          } catch {
            /* */
          }
        }

        deviceId = did;
        authed = true;
        agents.set(did, {
          ws,
          deviceId: did,
          network: msg.network || "unknown",
          platform: String(msg.platform || "android").toLowerCase(),
          connectedAt: Date.now(),
          streams,
          send,
        });
        send({
          type: "hello_ok",
          deviceId: did,
          message: "tunnel bound — CONNECT streams will exit via this phone",
        });
        bump("tunnelAgentConnect");
        setMetric("lastTunnelAt", new Date().toISOString());
        // process.stderr — survives vite/esbuild console drop; visible in journalctl
        process.stderr.write(
          `[edge-tunnel] agent_online device=${did} platform=${msg.platform || "?"} network=${msg.network || "?"} agents=${agents.size}\n`,
        );
        ee.emit("agent_online", did);
        return;
      }

      if (!authed || !deviceId) return;

      if (type === "open_ok") {
        bump("tunnelOpenOk");
        // Normalize streamId to string (iOS/Android may encode differently)
        const sid = msg.streamId != null ? String(msg.streamId) : "";
        if (sid) ee.emit(`open_ok:${sid}`, { ...msg, streamId: sid });
        return;
      }
      if (type === "open_err") {
        bump("tunnelOpenErr");
        const sid = msg.streamId != null ? String(msg.streamId) : "";
        process.stderr.write(
          `[edge-tunnel] open_err device=${deviceId} stream=${sid} code=${msg.code || "?"}\n`,
        );
        if (sid) ee.emit(`open_err:${sid}`, { ...msg, streamId: sid });
        return;
      }
      if (type === "data") {
        const st = streams.get(msg.streamId);
        if (st?.onData && msg.b64) {
          try {
            st.onData(Buffer.from(msg.b64, "base64"));
          } catch {
            /* */
          }
        }
        return;
      }
      if (type === "close") {
        const st = streams.get(msg.streamId);
        if (st && !st.closed) {
          st.closed = true;
          streams.delete(msg.streamId);
          try {
            st.onClose?.(msg.reason || "remote");
          } catch {
            /* */
          }
        }
        return;
      }
      if (type === "stats") {
        // optional: update egress meta from phone
        if (msg.egressIp && deviceId) {
          try {
            getEdgeGateway().agentHello({
              deviceId,
              publicIp: msg.egressIp,
              network: msg.network,
            });
          } catch {
            /* */
          }
        }
        return;
      }
      if (type === "pong") return;
    });

    ws.on("close", (code, reasonBuf) => {
      const reason =
        reasonBuf && reasonBuf.length
          ? String(reasonBuf).slice(0, 80)
          : "";
      if (deviceId && agents.get(deviceId)?.ws === ws) {
        const prev = agents.get(deviceId);
        const heldMs = prev?.connectedAt ? Date.now() - prev.connectedAt : 0;
        agents.delete(deviceId);
        try {
          getEdgeGateway().agentBye(deviceId);
        } catch {
          /* */
        }
        process.stderr.write(
          `[edge-tunnel] agent_offline device=${deviceId} code=${code} reason=${reason || "-"} heldMs=${heldMs} agents=${agents.size}\n`,
        );
        ee.emit("agent_offline", deviceId);
      } else if (deviceId) {
        process.stderr.write(
          `[edge-tunnel] ws_close_stale device=${deviceId} code=${code} reason=${reason || "-"}\n`,
        );
      }
      for (const [sid, st] of streams) {
        if (!st.closed) {
          st.closed = true;
          try {
            st.onClose?.("agent_disconnect");
          } catch {
            /* */
          }
        }
        streams.delete(sid);
      }
    });

    ws.on("error", () => {});

    // keepalive
    const pingTimer = setInterval(() => {
      if (ws.readyState !== 1) {
        clearInterval(pingTimer);
        return;
      }
      send({ type: "ping", t: Date.now() });
    }, 25000);
    ws.on("close", () => clearInterval(pingTimer));
  }

  function hasAgent(deviceId) {
    const a = agents.get(deviceId);
    return Boolean(a && a.ws.readyState === 1);
  }

  function listAgents() {
    return [...agents.values()].map((a) => ({
      deviceId: a.deviceId,
      network: a.network,
      connectedAt: a.connectedAt,
      live: a.ws.readyState === 1,
      streams: a.streams.size,
    }));
  }

  /**
   * Open a TCP stream on the phone and bridge to a Node Duplex-like callbacks.
   * @returns {Promise<{ streamId: string, write: (buf: Buffer)=>void, close: ()=>void }>}
   */
  function openStream(deviceId, host, port, { onData, onClose, timeoutMs = 15000 } = {}) {
    return new Promise(async (resolve, reject) => {
      const agent = agents.get(deviceId);
      if (!agent || agent.ws.readyState !== 1) {
        reject(new Error("device_tunnel_offline"));
        return;
      }
      const isIos = agent.platform === "ios";
      // iOS: only one live CONNECT at a time — concurrent streams + big WSS frames → 1006
      if (isIos && agent.streams.size >= 1) {
        const waitStart = Date.now();
        while (agent.streams.size >= 1 && Date.now() - waitStart < 20_000) {
          if (agent.ws.readyState !== 1) {
            reject(new Error("device_tunnel_offline"));
            return;
          }
          await new Promise((r) => setTimeout(r, 40));
        }
        if (agent.streams.size >= 1) {
          reject(new Error("ios_stream_busy"));
          return;
        }
      }

      const streamId = String(id("str"));
      let settled = false;
      const st = {
        onData,
        onClose: (reason) => {
          onClose?.(reason);
        },
        closed: false,
      };
      agent.streams.set(streamId, st);

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        agent.streams.delete(streamId);
        ee.off(`open_ok:${streamId}`, onOk);
        ee.off(`open_err:${streamId}`, onErr);
        bump("tunnelOpenTimeout");
        process.stderr.write(
          `[edge-tunnel] open_timeout device=${deviceId} stream=${streamId} ${host}:${port} (phone did not open_ok — check NE dialer)\n`,
        );
        reject(new Error("open_timeout"));
      }, timeoutMs);

      const onOk = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ee.off(`open_err:${streamId}`, onErr);
        process.stderr.write(
          `[edge-tunnel] open_ok device=${deviceId} stream=${streamId} ${host}:${port}\n`,
        );
        // iOS URLSession WebSocket dies (close 1006) if we push huge base64 JSON
        // frames (full TLS records / multi-MB curl). Chunk to ~8KB raw.
        const maxChunk = isIos ? 8 * 1024 : 48 * 1024;
        resolve({
          streamId,
          write: (buf) => {
            if (st.closed || !buf?.length) return;
            if (agent.ws.readyState !== 1) return;
            const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
            for (let i = 0; i < b.length; i += maxChunk) {
              if (st.closed || agent.ws.readyState !== 1) return;
              // Backpressure: if socket is flooded, drop remaining (stream will retry/fail)
              if (typeof agent.ws.bufferedAmount === "number" && agent.ws.bufferedAmount > 512 * 1024) {
                process.stderr.write(
                  `[edge-tunnel] ws_backpressure device=${deviceId} stream=${streamId} buffered=${agent.ws.bufferedAmount}\n`,
                );
                return;
              }
              const slice = b.subarray(i, Math.min(i + maxChunk, b.length));
              agent.send({
                type: "data",
                streamId,
                b64: slice.toString("base64"),
              });
            }
          },
          close: (reason = "local") => {
            if (st.closed) return;
            st.closed = true;
            agent.streams.delete(streamId);
            agent.send({ type: "close", streamId, reason });
          },
        });
      };
      const onErr = (msg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ee.off(`open_ok:${streamId}`, onOk);
        agent.streams.delete(streamId);
        process.stderr.write(
          `[edge-tunnel] open_err device=${deviceId} stream=${streamId} ${host}:${port} code=${msg?.code || "?"}\n`,
        );
        reject(new Error(msg?.code || "open_err"));
      };

      ee.once(`open_ok:${streamId}`, onOk);
      ee.once(`open_err:${streamId}`, onErr);

      agent.send({
        type: "open",
        streamId,
        host,
        port: Number(port) || 443,
      });
      bump("tunnelOpenSent");
      process.stderr.write(
        `[edge-tunnel] open_sent device=${deviceId} stream=${streamId} ${host}:${port} liveStreams=${agent.streams.size} platform=${agent.platform || "?"}\n`,
      );
    });
  }

  return {
    attach,
    hasAgent,
    listAgents,
    openStream,
    agentCount: () => agents.size,
  };
}
