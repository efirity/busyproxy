import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generatePassword } from "@/lib/utils";

export type BindMode = "local" | "lan" | "remote";
export type ProxyStatus = "stopped" | "starting" | "running" | "error";
export type Protocol = "http" | "socks5";
export type TabId = "home" | "activity" | "settings";
export type NetworkType = "wifi" | "cellular" | "ethernet" | "unknown";

export interface ConnectionEvent {
  id: string;
  timestamp: number;
  protocol: Protocol;
  destinationHost: string;
  destinationPort: number;
  bytesUp: number;
  bytesDown: number;
  success: boolean;
  errorMessage?: string;
  clientIp?: string;
}

export interface RelaySettings {
  username: string;
  password: string;
  httpEnabled: boolean;
  socksEnabled: boolean;
  httpPort: number;
  socksPort: number;
  bindMode: BindMode;
  startOnBoot: boolean;
  maxConnections: number;
  logVerbose: boolean;
  biometricReveal: boolean;
}

export interface RelayState {
  onboarded: boolean;
  tab: TabId;
  status: ProxyStatus;
  startedAt: number | null;
  lastError: string | null;
  settings: RelaySettings;
  localIp: string;
  publicIp: string | null;
  networkType: NetworkType;
  bytesUp: number;
  bytesDown: number;
  activeConnections: number;
  peakConnections: number;
  events: ConnectionEvent[];
  showPassword: boolean;
  toast: string | null;
  demoMode: boolean;
  engineLive: boolean;

  completeOnboarding: () => void;
  setTab: (tab: TabId) => void;
  startProxy: () => Promise<void>;
  stopProxy: () => Promise<void>;
  toggleProxy: () => Promise<void>;
  updateSettings: (partial: Partial<RelaySettings>) => void;
  rotatePassword: () => void;
  setShowPassword: (v: boolean) => void;
  setToast: (msg: string | null) => void;
  clearLogs: () => void;
  addEvent: (event: Omit<ConnectionEvent, "id" | "timestamp">) => void;
  tickStats: (deltaUp: number, deltaDown: number, active?: number) => void;
  setNetworkInfo: (info: {
    localIp?: string;
    publicIp?: string | null;
    networkType?: NetworkType;
  }) => void;
  setEngineLive: (live: boolean) => void;
  hydrateFromEngine: (payload: Partial<EngineSnapshot>) => void;
}

export interface EngineSnapshot {
  status: ProxyStatus;
  startedAt: number | null;
  lastError: string | null;
  bytesUp: number;
  bytesDown: number;
  activeConnections: number;
  peakConnections: number;
  localIp: string;
  publicIp: string | null;
  httpPort: number;
  socksPort: number;
  events: ConnectionEvent[];
}

const defaultSettings = (): RelaySettings => ({
  username: "relay",
  password: generatePassword(16),
  httpEnabled: true,
  socksEnabled: true,
  httpPort: 8888,
  socksPort: 1080,
  bindMode: "lan",
  startOnBoot: false,
  maxConnections: 128,
  logVerbose: false,
  biometricReveal: false,
});

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function engineFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

export const useRelayStore = create<RelayState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      tab: "home",
      status: "stopped",
      startedAt: null,
      lastError: null,
      settings: defaultSettings(),
      localIp: "192.168.1.42",
      publicIp: null,
      networkType: "wifi",
      bytesUp: 0,
      bytesDown: 0,
      activeConnections: 0,
      peakConnections: 0,
      events: [],
      showPassword: false,
      toast: null,
      demoMode: true,
      engineLive: false,

      completeOnboarding: () => set({ onboarded: true }),
      setTab: (tab) => set({ tab }),
      setShowPassword: (v) => set({ showPassword: v }),
      setToast: (msg) => set({ toast: msg }),
      clearLogs: () => set({ events: [], bytesUp: 0, bytesDown: 0, peakConnections: 0 }),
      setEngineLive: (live) => set({ engineLive: live, demoMode: !live }),
      setNetworkInfo: (info) =>
        set((s) => ({
          localIp: info.localIp ?? s.localIp,
          publicIp: info.publicIp !== undefined ? info.publicIp : s.publicIp,
          networkType: info.networkType ?? s.networkType,
        })),

      updateSettings: (partial) =>
        set((s) => ({
          settings: { ...s.settings, ...partial },
        })),

      rotatePassword: () => {
        const password = generatePassword(16);
        set((s) => ({
          settings: { ...s.settings, password },
          toast: "Password rotated — clients must reconnect",
        }));
        const { engineLive, status, settings } = get();
        if (engineLive && status === "running") {
          void engineFetch("/config", {
            method: "POST",
            body: JSON.stringify({ ...settings, password }),
          }).catch(() => undefined);
        }
      },

      addEvent: (event) =>
        set((s) => ({
          events: [
            { ...event, id: makeId(), timestamp: Date.now() },
            ...s.events,
          ].slice(0, 200),
        })),

      tickStats: (deltaUp, deltaDown, active) =>
        set((s) => {
          const activeConnections =
            active !== undefined ? active : s.activeConnections;
          return {
            bytesUp: s.bytesUp + deltaUp,
            bytesDown: s.bytesDown + deltaDown,
            activeConnections,
            peakConnections: Math.max(s.peakConnections, activeConnections),
          };
        }),

      hydrateFromEngine: (payload) =>
        set((s) => ({
          status: payload.status ?? s.status,
          startedAt: payload.startedAt !== undefined ? payload.startedAt : s.startedAt,
          lastError: payload.lastError !== undefined ? payload.lastError : s.lastError,
          bytesUp: payload.bytesUp ?? s.bytesUp,
          bytesDown: payload.bytesDown ?? s.bytesDown,
          activeConnections: payload.activeConnections ?? s.activeConnections,
          peakConnections: payload.peakConnections ?? s.peakConnections,
          localIp: payload.localIp ?? s.localIp,
          publicIp: payload.publicIp !== undefined ? payload.publicIp : s.publicIp,
          events: payload.events ?? s.events,
          settings: {
            ...s.settings,
            httpPort: payload.httpPort ?? s.settings.httpPort,
            socksPort: payload.socksPort ?? s.settings.socksPort,
          },
        })),

      startProxy: async () => {
        const state = get();
        if (state.status === "running" || state.status === "starting") return;
        set({ status: "starting", lastError: null });

        try {
          const data = await engineFetch("/start", {
            method: "POST",
            body: JSON.stringify(state.settings),
          });
          set({
            status: "running",
            startedAt: data.startedAt ?? Date.now(),
            engineLive: true,
            demoMode: false,
            localIp: data.localIp ?? state.localIp,
            publicIp: data.publicIp ?? state.publicIp,
            lastError: null,
            toast: "Proxy is running",
          });
        } catch {
          // Demo fallback — full interactive simulation for preview
          set({
            status: "running",
            startedAt: Date.now(),
            engineLive: false,
            demoMode: true,
            lastError: null,
            toast: "Proxy running (demo engine)",
            publicIp: state.publicIp ?? "85.132.1" + Math.floor(Math.random() * 90 + 10),
          });
          startDemoTraffic(get, set);
        }
      },

      stopProxy: async () => {
        const state = get();
        stopDemoTraffic();
        try {
          if (state.engineLive) {
            await engineFetch("/stop", { method: "POST" });
          }
        } catch {
          /* ignore */
        }
        set({
          status: "stopped",
          startedAt: null,
          activeConnections: 0,
          toast: "Proxy stopped",
        });
      },

      toggleProxy: async () => {
        const { status, startProxy, stopProxy } = get();
        if (status === "running" || status === "starting") await stopProxy();
        else await startProxy();
      },
    }),
    {
      name: "relay-proxy-v1",
      partialize: (s) => ({
        onboarded: s.onboarded,
        settings: s.settings,
      }),
    },
  ),
);

let demoTimer: ReturnType<typeof setInterval> | null = null;
let demoBurst: ReturnType<typeof setInterval> | null = null;

const DEMO_HOSTS = [
  { host: "api.ipify.org", port: 443 },
  { host: "www.google.com", port: 443 },
  { host: "cdn.jsdelivr.net", port: 443 },
  { host: "github.com", port: 443 },
  { host: "registry.npmjs.org", port: 443 },
  { host: "api.open-meteo.com", port: 443 },
  { host: "httpbin.org", port: 443 },
  { host: "cloudflare.com", port: 443 },
];

function startDemoTraffic(
  get: () => RelayState,
  set: (
    partial: Partial<RelayState> | ((s: RelayState) => Partial<RelayState>),
  ) => void,
) {
  stopDemoTraffic();

  demoTimer = setInterval(() => {
    const s = get();
    if (s.status !== "running") return;
    // gentle background bytes
    const up = Math.floor(Math.random() * 400);
    const down = Math.floor(Math.random() * 2400);
    set({
      bytesUp: s.bytesUp + up,
      bytesDown: s.bytesDown + down,
      activeConnections: Math.max(0, s.activeConnections + (Math.random() > 0.6 ? 1 : -1)),
    });
  }, 1200);

  demoBurst = setInterval(() => {
    const s = get();
    if (s.status !== "running") return;
    const target = DEMO_HOSTS[Math.floor(Math.random() * DEMO_HOSTS.length)];
    const success = Math.random() > 0.08;
    const bytesUp = success ? 200 + Math.floor(Math.random() * 800) : 80;
    const bytesDown = success ? 1500 + Math.floor(Math.random() * 12000) : 0;
    const protocol: Protocol = Math.random() > 0.35 ? "http" : "socks5";
    const event: ConnectionEvent = {
      id: makeId(),
      timestamp: Date.now(),
      protocol,
      destinationHost: target.host,
      destinationPort: target.port,
      bytesUp,
      bytesDown,
      success,
      errorMessage: success ? undefined : "Connection refused by destination",
      clientIp: s.settings.bindMode === "local" ? "127.0.0.1" : "192.168.1." + (10 + Math.floor(Math.random() * 40)),
    };
    set({
      events: [event, ...s.events].slice(0, 200),
      bytesUp: s.bytesUp + bytesUp,
      bytesDown: s.bytesDown + bytesDown,
      activeConnections: Math.min(s.settings.maxConnections, s.activeConnections + 1),
      peakConnections: Math.max(s.peakConnections, s.activeConnections + 1),
    });
    setTimeout(() => {
      const cur = get();
      if (cur.status === "running") {
        set({ activeConnections: Math.max(0, cur.activeConnections - 1) });
      }
    }, 800 + Math.random() * 2000);
  }, 2800);
}

function stopDemoTraffic() {
  if (demoTimer) clearInterval(demoTimer);
  if (demoBurst) clearInterval(demoBurst);
  demoTimer = null;
  demoBurst = null;
}

export function proxyUrl(
  protocol: "http" | "socks5",
  settings: RelaySettings,
  host: string,
  showPassword: boolean,
): string {
  const port = protocol === "http" ? settings.httpPort : settings.socksPort;
  const pass = showPassword ? settings.password : "••••••••";
  const scheme = protocol === "http" ? "http" : "socks5";
  return `${scheme}://${settings.username}:${pass}@${host}:${port}`;
}

export function bindHost(mode: BindMode, localIp: string): string {
  if (mode === "local") return "127.0.0.1";
  return localIp;
}
