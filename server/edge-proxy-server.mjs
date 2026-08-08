/**
 * Customer-facing edge proxy listeners (HTTP CONNECT + SOCKS5).
 * Prefer reverse-tunnel through the phone when WSS agent is live;
 * fall back to edge-host dial only if no tunnel (P0).
 */
import net from "node:net";
import http from "node:http";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { getTunnelHub } from "./edge-tunnel-hub.mjs";
import { rateLimit } from "./edge-rate-limit.mjs";
import { bump, setMetric } from "./edge-metrics.mjs";

const g = globalThis;

export function ensureEdgeProxyServers() {
  if (g.__busyEdgeProxy) return g.__busyEdgeProxy;
  const edge = getEdgeGateway();
  const hub = getTunnelHub();
  const ports = edge.getPorts();

  const state = {
    httpPort: ports.http,
    socksPort: ports.socks,
    httpListening: false,
    socksListening: false,
    lastError: null,
    connects: 0,
    denies: 0,
    viaTunnel: 0,
    viaEdgeDial: 0,
  };

  function authorize(username, password, sourceIp, targetHost) {
    const result = edge.resolveRoute({
      username,
      password,
      sourceIp,
      targetHost,
    });
    if (!result.ok) {
      state.denies += 1;
      return result;
    }
    state.connects += 1;
    return result;
  }

  function pipeLocal(client, remote, deviceId) {
    let up = 0;
    let down = 0;
    // Always attach error handlers BEFORE pipe — unhandled 'error' on Socket
    // crashes the whole Node process (admin Check proxy IP → nginx 502).
    const swallow = () => {
      try {
        if (!client.destroyed) client.destroy();
      } catch {
        /* */
      }
      try {
        if (!remote.destroyed) remote.destroy();
      } catch {
        /* */
      }
    };
    client.on("error", swallow);
    remote.on("error", swallow);
    client.on("data", (c) => {
      up += c.length;
    });
    remote.on("data", (c) => {
      down += c.length;
    });
    const done = () => {
      try {
        edge.recordTraffic(deviceId, up, down);
      } catch {
        /* */
      }
    };
    client.on("close", done);
    remote.on("close", done);
    client.pipe(remote);
    remote.pipe(client);
  }

  /**
   * Bridge client TCP ↔ phone reverse tunnel stream.
   */
  async function bridgeViaTunnel(clientSocket, head, host, port, deviceId) {
    let up = 0;
    let down = 0;
    let stream;
    try {
      stream = await hub.openStream(deviceId, host, port, {
        onData: (buf) => {
          down += buf.length;
          try {
            if (!clientSocket.destroyed) clientSocket.write(buf);
          } catch {
            /* */
          }
        },
        onClose: () => {
          try {
            edge.recordTraffic(deviceId, up, down);
          } catch {
            /* */
          }
          try {
            clientSocket.end();
          } catch {
            /* */
          }
        },
        timeoutMs: 20000,
      });
    } catch (err) {
      throw err;
    }

    state.viaTunnel += 1;
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head?.length) {
      up += head.length;
      stream.write(head);
    }

    clientSocket.on("data", (chunk) => {
      up += chunk.length;
      stream.write(chunk);
    });
    clientSocket.on("close", () => {
      try {
        edge.recordTraffic(deviceId, up, down);
      } catch {
        /* */
      }
      stream.close("client_close");
    });
    clientSocket.on("error", () => {
      stream.close("client_error");
    });
  }

  function dialLocal(clientSocket, head, host, port, deviceId) {
    state.viaEdgeDial += 1;
    const remote = net.connect(port, host, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head?.length) remote.write(head);
      pipeLocal(clientSocket, remote, deviceId);
    });
    remote.on("error", () => {
      try {
        clientSocket.end();
      } catch {
        /* */
      }
    });
    clientSocket.on("error", () => {
      try {
        remote.destroy();
      } catch {
        /* */
      }
    });
  }

  // ---- HTTP CONNECT proxy ----
  const httpServer = http.createServer((req, res) => {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("Use HTTP CONNECT or SOCKS5 for BusyProxy gate");
  });

  httpServer.on("connect", (req, clientSocket, head) => {
    // Attach early so ECONNRESET during handshake never becomes uncaught
    clientSocket.on("error", () => {
      try {
        clientSocket.destroy();
      } catch {
        /* */
      }
    });
    const sourceIp =
      req.socket.remoteAddress?.replace(/^::ffff:/, "") || "";
    const rl = rateLimit("proxy_connect", sourceIp, {
      limit: Number(process.env.EDGE_PROXY_RATE_LIMIT || 120),
      windowMs: 60_000,
    });
    if (!rl.ok) {
      bump("proxyRateLimited");
      state.denies += 1;
      clientSocket.write(
        "HTTP/1.1 429 Too Many Requests\r\nContent-Type: text/plain\r\nRetry-After: 60\r\n\r\nrate_limited\r\n",
      );
      clientSocket.end();
      return;
    }
    const auth = parseProxyAuth(req.headers["proxy-authorization"]);
    const [host, portStr] = (req.url || "").split(":");
    const port = Number(portStr) || 443;

    if (!auth) {
      clientSocket.write(
        "HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=\"BusyProxy\"\r\n\r\n",
      );
      clientSocket.end();
      state.denies += 1;
      bump("proxyConnectDeny");
      return;
    }

    const route = authorize(auth.user, auth.pass, sourceIp, host);
    if (!route.ok) {
      bump("proxyConnectDeny");
      clientSocket.write(
        `HTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ error: route.code, message: route.message })}\r\n`,
      );
      clientSocket.end();
      return;
    }
    bump("proxyConnectOk");
    setMetric("lastProxyAt", new Date().toISOString());

    const deviceId = route.routedVia.deviceId;

    // Prefer phone reverse tunnel so public exit IP is the device
    if (hub.hasAgent(deviceId)) {
      bridgeViaTunnel(clientSocket, head, host, port, deviceId).catch(
        (err) => {
          // Fallback to edge dial if tunnel open fails
          try {
            dialLocal(clientSocket, head, host, port, deviceId);
          } catch {
            try {
              clientSocket.end();
            } catch {
              /* */
            }
          }
        },
      );
      return;
    }

    // No live WSS agent — edge dial (shows droplet IP)
    dialLocal(clientSocket, head, host, port, deviceId);
  });

  // ---- SOCKS5 ----
  const socksServer = net.createServer((socket) => {
    let phase = "greeting";
    let username = "";
    let password = "";
    let buf = Buffer.alloc(0);

    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      try {
        if (phase === "greeting") {
          if (buf.length < 2) return;
          const nmethods = buf[1];
          if (buf.length < 2 + nmethods) return;
          socket.write(Buffer.from([0x05, 0x02]));
          buf = Buffer.alloc(0);
          phase = "auth";
          return;
        }
        if (phase === "auth") {
          if (buf.length < 2) return;
          const ulen = buf[1];
          if (buf.length < 2 + ulen + 1) return;
          const plen = buf[2 + ulen];
          if (buf.length < 2 + ulen + 1 + plen) return;
          username = buf.slice(2, 2 + ulen).toString("utf8");
          password = buf.slice(3 + ulen, 3 + ulen + plen).toString("utf8");
          socket.write(Buffer.from([0x01, 0x00]));
          buf = buf.slice(3 + ulen + plen);
          phase = "req";
        }
        if (phase === "req") {
          if (buf.length < 7) return;
          if (buf[0] !== 0x05 || buf[1] !== 0x01) {
            socket.end();
            return;
          }
          const atyp = buf[3];
          let host = "";
          let port = 0;
          let offset = 4;
          if (atyp === 0x01) {
            if (buf.length < 10) return;
            host = `${buf[4]}.${buf[5]}.${buf[6]}.${buf[7]}`;
            port = buf.readUInt16BE(8);
            offset = 10;
          } else if (atyp === 0x03) {
            const len = buf[4];
            if (buf.length < 5 + len + 2) return;
            host = buf.slice(5, 5 + len).toString("utf8");
            port = buf.readUInt16BE(5 + len);
            offset = 7 + len;
          } else {
            socket.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
            socket.end();
            return;
          }
          buf = buf.slice(offset);
          const sourceIp =
            socket.remoteAddress?.replace(/^::ffff:/, "") || "";
          const route = authorize(username, password, sourceIp, host);
          if (!route.ok) {
            socket.write(
              Buffer.from([0x05, 0x02, 0x00, 0x01, 0, 0, 0, 0, 0, 0]),
            );
            socket.end();
            return;
          }
          phase = "connect";
          const deviceId = route.routedVia.deviceId;
          const respOk = Buffer.from([
            0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0,
          ]);

          const finishLocal = () => {
            const remote = net.connect(port, host, () => {
              socket.write(respOk);
              pipeLocal(socket, remote, deviceId);
            });
            remote.on("error", () => {
              try {
                socket.write(
                  Buffer.from([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]),
                );
                socket.end();
              } catch {
                /* */
              }
            });
          };

          if (hub.hasAgent(deviceId)) {
            let up = 0;
            let down = 0;
            hub
              .openStream(deviceId, host, port, {
                onData: (b) => {
                  down += b.length;
                  try {
                    if (!socket.destroyed) socket.write(b);
                  } catch {
                    /* */
                  }
                },
                onClose: () => {
                  try {
                    edge.recordTraffic(deviceId, up, down);
                  } catch {
                    /* */
                  }
                  try {
                    socket.end();
                  } catch {
                    /* */
                  }
                },
              })
              .then((stream) => {
                state.viaTunnel += 1;
                socket.write(respOk);
                socket.on("data", (chunk) => {
                  up += chunk.length;
                  stream.write(chunk);
                });
                socket.on("close", () => {
                  try {
                    edge.recordTraffic(deviceId, up, down);
                  } catch {
                    /* */
                  }
                  stream.close("client_close");
                });
              })
              .catch(() => finishLocal());
          } else {
            finishLocal();
          }
        }
      } catch {
        try {
          socket.destroy();
        } catch {
          /* */
        }
      }
    });
    socket.on("error", () => {});
  });

  /**
   * Bind a port; if another blue/green slot still holds it (EADDRINUSE),
   * retry until free so the new process can take over after the old one exits.
   */
  function listenWithRetry(server, port, label, onListening) {
    let attempts = 0;
    const maxAttempts = 60; // ~2 min
    const tryOnce = () => {
      attempts += 1;
      const onError = (err) => {
        server.off("listening", onListen);
        if (err && err.code === "EADDRINUSE" && attempts < maxAttempts) {
          console.warn(
            `[edge-proxy] ${label} :${port} busy (blue/green handoff) — retry ${attempts}/${maxAttempts}`,
          );
          setTimeout(tryOnce, 2_000);
          return;
        }
        state.lastError = err?.message || String(err);
        console.error(`[edge-proxy] ${label} :${port} failed:`, state.lastError);
        onListening(false);
      };
      const onListen = () => {
        server.off("error", onError);
        onListening(true);
      };
      server.once("error", onError);
      server.once("listening", onListen);
      try {
        server.listen(port, "0.0.0.0");
      } catch (err) {
        onError(err);
      }
    };
    tryOnce();
  }

  function listen() {
    return new Promise((resolve) => {
      let left = 2;
      const done = () => {
        left -= 1;
        if (left <= 0) resolve(snapshot());
      };
      listenWithRetry(httpServer, state.httpPort, "HTTP CONNECT", (ok) => {
        state.httpListening = ok;
        done();
      });
      listenWithRetry(socksServer, state.socksPort, "SOCKS5", (ok) => {
        state.socksListening = ok;
        done();
      });
    });
  }

  function snapshot() {
    return {
      ...state,
      host: ports.host,
      liveAgents: hub.agentCount(),
      agents: hub.listAgents(),
      note: hub.agentCount()
        ? "Reverse-tunnel live: CONNECT prefers phone exit IP when agent WSS is connected."
        : "No live agent tunnels — CONNECT falls back to edge-host dial (droplet IP).",
    };
  }

  const api = {
    listen,
    snapshot,
    httpServer,
    socksServer,
  };
  g.__busyEdgeProxy = api;
  return api;
}

function parseProxyAuth(header) {
  if (!header || !header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i < 0) return null;
    return {
      user: decodeURIComponent(decoded.slice(0, i)),
      pass: decodeURIComponent(decoded.slice(i + 1)),
    };
  } catch {
    return null;
  }
}
