/**
 * Relay proxy engine — HTTP CONNECT + SOCKS5 TCP with username/password auth.
 */
import net from "node:net";
import http from "node:http";
import { Buffer } from "node:buffer";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProxyEngine() {
  /** @type {import('node:http').Server | null} */
  let httpServer = null;
  /** @type {import('node:net').Server | null} */
  let socksServer = null;

  const state = {
    status: /** @type {'stopped'|'starting'|'running'|'error'} */ ("stopped"),
    startedAt: /** @type {number|null} */ (null),
    lastError: /** @type {string|null} */ (null),
    bytesUp: 0,
    bytesDown: 0,
    activeConnections: 0,
    peakConnections: 0,
    localIp: "127.0.0.1",
    publicIp: /** @type {string|null} */ (null),
    httpPort: 8888,
    socksPort: 1080,
    username: "relay",
    password: "",
    bindMode: "lan",
    maxConnections: 128,
    httpEnabled: true,
    socksEnabled: true,
    events: /** @type {any[]} */ ([]),
  };

  function pushEvent(ev) {
    if (
      ev.errorMessage === "Auth failed" &&
      (!ev.destinationHost || ev.destinationHost === "/" || ev.destinationHost === "?")
    ) {
      return;
    }
    state.events.unshift({
      id: makeId(),
      timestamp: Date.now(),
      ...ev,
    });
    if (state.events.length > 200) state.events.length = 200;
  }

  function trackConn(delta) {
    state.activeConnections = Math.max(0, state.activeConnections + delta);
    state.peakConnections = Math.max(state.peakConnections, state.activeConnections);
  }

  function attachCounters(client, remote, meta) {
    let up = 0;
    let down = 0;
    let closed = false;
    trackConn(1);

    client.on("data", (chunk) => {
      up += chunk.length;
      state.bytesUp += chunk.length;
    });
    remote.on("data", (chunk) => {
      down += chunk.length;
      state.bytesDown += chunk.length;
    });

    const finish = (ok, errorMessage) => {
      if (closed) return;
      closed = true;
      trackConn(-1);
      const success = ok || up > 0 || down > 0;
      pushEvent({
        protocol: meta.protocol,
        destinationHost: meta.host,
        destinationPort: meta.port,
        bytesUp: up,
        bytesDown: down,
        success,
        errorMessage: success ? undefined : errorMessage,
        clientIp: meta.clientIp,
      });
    };

    client.on("error", (err) => {
      finish(false, err.message);
      try {
        remote.destroy();
      } catch {
        /* */
      }
    });
    remote.on("error", (err) => {
      finish(false, err.message);
      try {
        client.destroy();
      } catch {
        /* */
      }
    });
    client.on("close", () => finish(true));
    remote.on("close", () => finish(true));
  }

  function pipeBidirectional(client, remote, meta) {
    attachCounters(client, remote, meta);
    client.pipe(remote);
    remote.pipe(client);
  }

  function checkAuth(user, pass) {
    return user === state.username && pass === state.password;
  }

  function parseBasicAuth(header) {
    if (!header || !header.startsWith("Basic ")) return null;
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const i = decoded.indexOf(":");
      if (i < 0) return null;
      return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
    } catch {
      return null;
    }
  }

  function listenHttp() {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const auth = parseBasicAuth(req.headers["proxy-authorization"]);
        if (!auth || !checkAuth(auth.user, auth.pass)) {
          res.writeHead(407, {
            "Proxy-Authenticate": 'Basic realm="Relay"',
            "Content-Type": "text/plain",
          });
          res.end("Proxy Authentication Required");
          if (req.headers["proxy-authorization"]) {
            pushEvent({
              protocol: "http",
              destinationHost: req.url ?? "?",
              destinationPort: 0,
              bytesUp: 0,
              bytesDown: 0,
              success: false,
              errorMessage: "Auth failed",
              clientIp: req.socket.remoteAddress,
            });
          }
          return;
        }

        try {
          const target = new URL(req.url ?? "");
          const port = Number(target.port || 80);
          if (state.activeConnections >= state.maxConnections) {
            res.writeHead(503);
            res.end("Too many connections");
            return;
          }
          const upstream = net.connect(port, target.hostname, () => {
            const headers = [];
            for (const [k, v] of Object.entries(req.headers)) {
              if (!v) continue;
              const lk = k.toLowerCase();
              if (lk === "proxy-authorization" || lk === "proxy-connection") continue;
              headers.push(`${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
            }
            const path = target.pathname + target.search;
            upstream.write(
              `${req.method} ${path} HTTP/${req.httpVersion}\r\n${headers.join("\r\n")}\r\n\r\n`,
            );
            attachCounters(req.socket, upstream, {
              protocol: "http",
              host: target.hostname,
              port,
              clientIp: req.socket.remoteAddress,
            });
            req.pipe(upstream);
            upstream.pipe(res);
          });
          upstream.on("error", (err) => {
            if (!res.headersSent) {
              res.writeHead(502);
              res.end(err.message);
            }
            pushEvent({
              protocol: "http",
              destinationHost: target.hostname,
              destinationPort: port,
              bytesUp: 0,
              bytesDown: 0,
              success: false,
              errorMessage: err.message,
              clientIp: req.socket.remoteAddress,
            });
          });
        } catch (err) {
          res.writeHead(400);
          res.end(String(err));
        }
      });

      server.on("connect", (req, clientSocket, head) => {
        const auth = parseBasicAuth(req.headers["proxy-authorization"]);
        if (!auth || !checkAuth(auth.user, auth.pass)) {
          clientSocket.write(
            'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Relay"\r\n\r\n',
          );
          clientSocket.destroy();
          if (req.headers["proxy-authorization"]) {
            pushEvent({
              protocol: "http",
              destinationHost: req.url ?? "?",
              destinationPort: 0,
              bytesUp: 0,
              bytesDown: 0,
              success: false,
              errorMessage: "Auth failed",
              clientIp: clientSocket.remoteAddress,
            });
          }
          return;
        }

        if (state.activeConnections >= state.maxConnections) {
          clientSocket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
          clientSocket.destroy();
          return;
        }

        const [host, portStr] = (req.url ?? "").split(":");
        const port = Number(portStr || 443);
        const remote = net.connect(port, host, () => {
          clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          if (head?.length) remote.write(head);
          pipeBidirectional(clientSocket, remote, {
            protocol: "http",
            host,
            port,
            clientIp: clientSocket.remoteAddress,
          });
        });
        remote.on("error", (err) => {
          try {
            clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
          } catch {
            /* */
          }
          clientSocket.destroy();
          pushEvent({
            protocol: "http",
            destinationHost: host,
            destinationPort: port,
            bytesUp: 0,
            bytesDown: 0,
            success: false,
            errorMessage: err.message,
            clientIp: clientSocket.remoteAddress,
          });
        });
      });

      server.on("error", (err) => reject(err));

      const host = state.bindMode === "local" ? "127.0.0.1" : "0.0.0.0";
      server.listen(state.httpPort, host, () => {
        httpServer = server;
        resolve(undefined);
      });
    });
  }

  function listenSocks() {
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => {
        let buf = Buffer.alloc(0);
        let stage = "greeting";
        /** @type {{host:string,port:number}|null} */
        let dest = null;
        let handled = false;

        const fail = (msg) => {
          pushEvent({
            protocol: "socks5",
            destinationHost: dest?.host ?? "?",
            destinationPort: dest?.port ?? 0,
            bytesUp: 0,
            bytesDown: 0,
            success: false,
            errorMessage: msg,
            clientIp: socket.remoteAddress,
          });
          socket.destroy();
        };

        socket.on("data", onData);

        function onData(chunk) {
          if (handled) return;
          buf = Buffer.concat([buf, chunk]);

          if (stage === "greeting") {
            if (buf.length < 2) return;
            const nmethods = buf[1];
            if (buf.length < 2 + nmethods) return;
            socket.write(Buffer.from([0x05, 0x02]));
            buf = buf.subarray(2 + nmethods);
            stage = "auth";
          }

          if (stage === "auth") {
            if (buf.length < 2) return;
            const ulen = buf[1];
            if (buf.length < 2 + ulen + 1) return;
            const user = buf.subarray(2, 2 + ulen).toString("utf8");
            const plen = buf[2 + ulen];
            if (buf.length < 3 + ulen + plen) return;
            const pass = buf.subarray(3 + ulen, 3 + ulen + plen).toString("utf8");
            buf = buf.subarray(3 + ulen + plen);
            if (!checkAuth(user, pass)) {
              socket.write(Buffer.from([0x01, 0x01]));
              fail("Auth failed");
              return;
            }
            socket.write(Buffer.from([0x01, 0x00]));
            stage = "request";
          }

          if (stage === "request") {
            if (buf.length < 7) return;
            const cmd = buf[1];
            const atyp = buf[3];
            let offset = 4;
            let host = "";
            if (atyp === 0x01) {
              if (buf.length < offset + 4 + 2) return;
              host = `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`;
              offset += 4;
            } else if (atyp === 0x03) {
              const len = buf[offset];
              if (buf.length < offset + 1 + len + 2) return;
              host = buf.subarray(offset + 1, offset + 1 + len).toString("utf8");
              offset += 1 + len;
            } else {
              fail("Address type not supported");
              return;
            }
            const port = buf.readUInt16BE(offset);
            dest = { host, port };
            const leftover = buf.subarray(offset + 2);
            buf = Buffer.alloc(0);

            if (cmd !== 0x01) {
              socket.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
              fail("Only CONNECT supported");
              return;
            }
            if (state.activeConnections >= state.maxConnections) {
              socket.write(Buffer.from([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
              fail("Too many connections");
              return;
            }

            handled = true;
            socket.removeListener("data", onData);

            const remote = net.connect(port, host, () => {
              socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
              if (leftover.length) remote.write(leftover);
              pipeBidirectional(socket, remote, {
                protocol: "socks5",
                host,
                port,
                clientIp: socket.remoteAddress,
              });
            });
            remote.on("error", (err) => {
              try {
                socket.write(Buffer.from([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
              } catch {
                /* */
              }
              fail(err.message);
            });
          }
        }

        socket.on("error", () => socket.destroy());
      });

      server.on("error", (err) => reject(err));

      const host = state.bindMode === "local" ? "127.0.0.1" : "0.0.0.0";
      server.listen(state.socksPort, host, () => {
        socksServer = server;
        resolve(undefined);
      });
    });
  }

  async function detectIps() {
    try {
      const os = await import("node:os");
      const ifaces = os.networkInterfaces();
      for (const list of Object.values(ifaces)) {
        for (const item of list ?? []) {
          if (item.family === "IPv4" && !item.internal) {
            state.localIp = item.address;
            break;
          }
        }
      }
    } catch {
      state.localIp = "127.0.0.1";
    }

    try {
      const res = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        state.publicIp = data.ip ?? null;
      }
    } catch {
      /* keep */
    }
  }

  async function hardCloseServers() {
    const closeOne = (srv) =>
      new Promise((resolve) => {
        if (!srv) return resolve(undefined);
        try {
          srv.close(() => resolve(undefined));
          // force-drop lingering sockets
          setTimeout(() => resolve(undefined), 300);
        } catch {
          resolve(undefined);
        }
      });
    await closeOne(httpServer);
    await closeOne(socksServer);
    httpServer = null;
    socksServer = null;
  }

  async function start(config = {}) {
    if (state.status === "running" && httpServer) {
      applyConfig(config);
      return snapshot();
    }

    state.status = "starting";
    state.lastError = null;
    Object.assign(state, {
      username: config.username ?? state.username,
      password: config.password ?? state.password,
      httpPort: config.httpPort ?? state.httpPort,
      socksPort: config.socksPort ?? state.socksPort,
      bindMode: config.bindMode ?? state.bindMode,
      maxConnections: config.maxConnections ?? state.maxConnections,
      httpEnabled: config.httpEnabled ?? state.httpEnabled,
      socksEnabled: config.socksEnabled ?? state.socksEnabled,
    });

    try {
      await detectIps();
      await hardCloseServers();
      if (state.httpEnabled) await listenHttp();
      if (state.socksEnabled) await listenSocks();
      state.status = "running";
      state.startedAt = Date.now();
      return snapshot();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Retry once on bind collision
      if (msg.includes("EADDRINUSE")) {
        try {
          await hardCloseServers();
          await new Promise((r) => setTimeout(r, 200));
          if (state.httpEnabled) await listenHttp();
          if (state.socksEnabled) await listenSocks();
          state.status = "running";
          state.startedAt = Date.now();
          state.lastError = null;
          return snapshot();
        } catch (err2) {
          await hardCloseServers();
          state.status = "error";
          state.lastError = err2 instanceof Error ? err2.message : String(err2);
          throw err2;
        }
      }
      await hardCloseServers();
      state.status = "error";
      state.lastError = msg;
      throw err;
    }
  }

  async function stop() {
    await hardCloseServers();
    state.status = "stopped";
    state.startedAt = null;
    state.activeConnections = 0;
    return snapshot();
  }

  function applyConfig(config = {}) {
    Object.assign(state, {
      username: config.username ?? state.username,
      password: config.password ?? state.password,
      maxConnections: config.maxConnections ?? state.maxConnections,
    });
    return snapshot();
  }

  function snapshot() {
    return {
      status: state.status,
      startedAt: state.startedAt,
      lastError: state.lastError,
      bytesUp: state.bytesUp,
      bytesDown: state.bytesDown,
      activeConnections: state.activeConnections,
      peakConnections: state.peakConnections,
      localIp: state.localIp,
      publicIp: state.publicIp,
      httpPort: state.httpPort,
      socksPort: state.socksPort,
      events: state.events.slice(0, 100),
      bindMode: state.bindMode,
      username: state.username,
    };
  }

  return { start, stop, applyConfig, snapshot, detectIps };
}
