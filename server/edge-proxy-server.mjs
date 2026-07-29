/**
 * Customer-facing edge proxy listeners (HTTP CONNECT + SOCKS5).
 * Auth + sticky/rotate resolved via edge-gateway; traffic dialed from this host
 * until real reverse-tunnel mux is attached (then dial via device tunnel).
 *
 * Production: run on gate.busyproxy.net :18080 / :11080 behind LB.
 */
import net from "node:net";
import http from "node:http";
import { getEdgeGateway } from "./edge-gateway.mjs";

const g = globalThis;

export function ensureEdgeProxyServers() {
  if (g.__busyEdgeProxy) return g.__busyEdgeProxy;
  const edge = getEdgeGateway();
  const ports = edge.getPorts();

  const state = {
    httpPort: ports.http,
    socksPort: ports.socks,
    httpListening: false,
    socksListening: false,
    lastError: null,
    connects: 0,
    denies: 0,
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

  function pipeWithMeter(client, remote, deviceId) {
    let up = 0;
    let down = 0;
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

  // ---- HTTP CONNECT proxy ----
  const httpServer = http.createServer((req, res) => {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("Use HTTP CONNECT or SOCKS5 for BusyProxy gate");
  });

  httpServer.on("connect", (req, clientSocket, head) => {
    const sourceIp =
      req.socket.remoteAddress?.replace(/^::ffff:/, "") || "";
    const auth = parseProxyAuth(req.headers["proxy-authorization"]);
    const [host, portStr] = (req.url || "").split(":");
    const port = Number(portStr) || 443;

    if (!auth) {
      clientSocket.write(
        "HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=\"BusyProxy\"\r\n\r\n",
      );
      clientSocket.end();
      state.denies += 1;
      return;
    }

    const route = authorize(auth.user, auth.pass, sourceIp, host);
    if (!route.ok) {
      clientSocket.write(
        `HTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ error: route.code, message: route.message })}\r\n`,
      );
      clientSocket.end();
      return;
    }

    // P0: dial from edge. P1: open stream on route.routedVia.tunnelId
    const remote = net.connect(port, host, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head?.length) remote.write(head);
      pipeWithMeter(clientSocket, remote, route.routedVia.deviceId);
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
          // require username/password (0x02)
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
            // IPv6 not implemented
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
          const remote = net.connect(port, host, () => {
            const resp = Buffer.from([
              0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0,
            ]);
            socket.write(resp);
            pipeWithMeter(socket, remote, route.routedVia.deviceId);
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

  function listen() {
    return new Promise((resolve) => {
      let left = 2;
      const done = () => {
        left -= 1;
        if (left <= 0) resolve(snapshot());
      };
      httpServer.once("error", (err) => {
        state.lastError = err.message;
        done();
      });
      socksServer.once("error", (err) => {
        state.lastError = err.message;
        done();
      });
      httpServer.listen(state.httpPort, "0.0.0.0", () => {
        state.httpListening = true;
        done();
      });
      socksServer.listen(state.socksPort, "0.0.0.0", () => {
        state.socksListening = true;
        done();
      });
    });
  }

  function snapshot() {
    return {
      ...state,
      host: ports.host,
      note: "P0 dials targets from edge host while assigning a mobile device identity. P1 multiplexes through reverse tunnel so the public exit IP is the phone.",
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
