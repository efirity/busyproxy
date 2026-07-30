export type EdgeDevice = {
  deviceId: string;
  userId: string;
  name: string;
  platform: string;
  network: string;
  country: string;
  countryName?: string | null;
  city?: string | null;
  region?: string | null;
  zip?: string | null;
  lat?: number | null;
  lon?: number | null;
  carrier?: string | null;
  isp?: string | null;
  org?: string | null;
  asn?: string | null;
  asOrg?: string | null;
  ipType?: string;
  exitEnabled: boolean;
  online: boolean;
  lastSeenAt: number | null;
  tunnelId: string | null;
  lastPublicIp: string | null;
  bytesUp: number;
  bytesDown: number;
  source?: string;
  enrolledAt?: number | null;
  geoAt?: number | null;
};

export type EdgeCredential = {
  id: string;
  username: string;
  label: string;
  boundDeviceId: string | null;
  boundCountry: string | null;
  allowlistIps: string[];
  defaultMode?: string;
  defaultType?: string;
  enabled: boolean;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  password?: string;
  endpoints: {
    httpHost: string;
    httpPort: number;
    socksHost: string;
    socksPort: number;
    b2bAlias: string;
    username?: string;
    sessionId?: string | null;
    mode?: string;
    type?: string;
    http?: string;
    socks5?: string;
    httpDisplay?: string;
    socks5Display?: string;
    curlExample?: string;
  };
};

export type StickySession = {
  key: string;
  credId: string;
  username?: string;
  sessionId: string;
  deviceId: string;
  deviceOnline: boolean;
  exitIp?: string | null;
  carrier?: string | null;
  country?: string;
  createdAt: number;
  lastUsedAt: number;
  hits: number;
};

export type EdgeSnapshot = {
  architecture: {
    model: string;
    summary: string;
    hosts: {
      gateHttp: string;
      gateSocks: string;
      agent: string;
      b2bAlias: string;
      webPortal?: string;
    };
    modes?: Record<string, string>;
    mobileByDefault?: string;
    whyNotDirectIp: string;
    usernameGrammar?: string;
    exampleUris?: Record<string, string>;
    speed?: string;
    earnerTransparency?: string;
  };
  stats: {
    devices: number;
    online: number;
    mobileOnline?: number;
    credentials: number;
    stickySessions?: number;
    events: number;
  };
  devices: EdgeDevice[];
  credentials: EdgeCredential[];
  stickySessions?: StickySession[];
  events: Array<Record<string, unknown>>;
  uriPreview?: Record<string, unknown>;
  proxyListeners?: Record<string, unknown>;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  // Re-use earner/admin OTP session token for gated /api/edge operator routes
  let token: string | null = null;
  if (typeof window !== "undefined") {
    try {
      token = localStorage.getItem("relay_session_token");
    } catch {
      token = null;
    }
  }
  try {
    res = await fetch(`/api/edge${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Request timed out — try again (phone must be sharing)");
    }
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        (data as { error?: string }).error ||
          "Admin login required — sign in with an operator phone",
      );
    }
    throw new Error(
      (data as { error?: string; message?: string }).error ||
        (data as { message?: string }).message ||
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export function fetchEdgeSnapshot() {
  return json<EdgeSnapshot>("/status");
}

export function setDeviceExit(deviceId: string, enabled: boolean) {
  return json<{ device: EdgeDevice }>(
    `/devices/${encodeURIComponent(deviceId)}/exit`,
    {
      method: "POST",
      body: JSON.stringify({ enabled }),
    },
  );
}

export function mintCredential(body: {
  label?: string;
  boundDeviceId?: string | null;
  allowlistIps?: string[];
  defaultMode?: "rotate" | "sticky";
  defaultType?: "mobile" | "residential" | "any";
  boundCountry?: string | null;
}) {
  return json<EdgeCredential & { password?: string; note?: string }>(
    "/credentials",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function patchCredential(id: string, body: Record<string, unknown>) {
  return json<EdgeCredential>(`/credentials/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function revokeCredential(id: string) {
  return json<{ ok: boolean }>(`/credentials/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function connectCheck(body: {
  username: string;
  password: string;
  sourceIp: string;
  targetHost?: string;
}) {
  return json<Record<string, unknown>>("/connect-check", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type ProxyExitTestResult = {
  ok: boolean;
  mode?: string;
  type?: string;
  sessionId?: string | null;
  username?: string;
  password?: string;
  seenIp?: string | null;
  expectedEgressIp?: string | null;
  match?: boolean | null;
  matchNote?: string;
  classification?: {
    ip?: string | null;
    country?: string | null;
    countryCode?: string | null;
    city?: string | null;
    region?: string | null;
    asn?: string | null;
    org?: string | null;
    isp?: string | null;
    looksMobile?: boolean;
    deviceNetwork?: string | null;
    deviceIpType?: string | null;
    source?: string | null;
  };
  device?: EdgeDevice | null;
  route?: Record<string, unknown>;
  fleetHint?: {
    online: number;
    cellular: number;
    wifi: number;
    devices: Array<Partial<EdgeDevice> & { deviceId: string; name?: string }>;
  };
  endpoints?: {
    http?: string;
    httpMasked?: string;
    socks5?: string;
    curlWhoami?: string;
    whoamiUrl?: string;
  };
  durationMs?: number;
  error?: string;
  note?: string;
};

/** Live sticky/rotate exit test through gate → BusyProxy whoami. */
export function testProxyExit(body: {
  credentialId?: string;
  username?: string;
  password?: string;
  mode?: "sticky" | "rotate";
  type?: "mobile" | "residential" | "any";
  sessionId?: string;
  deviceId?: string;
  country?: string;
  timeoutMs?: number;
}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 28_000);
  return json<ProxyExitTestResult>("/proxy-exit-test", {
    method: "POST",
    body: JSON.stringify(body),
    signal: ctrl.signal as RequestInit["signal"],
  }).finally(() => clearTimeout(timer));
}

export function releaseSticky(body: {
  username: string;
  sessionId?: string;
}) {
  return json<{ ok: boolean; released: boolean }>("/sessions/release", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function uriPreview(body: Record<string, unknown>) {
  return json<Record<string, unknown>>("/uri-preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchDevice(deviceId: string) {
  return json<{ device: EdgeDevice }>(
    `/devices/${encodeURIComponent(deviceId)}`,
  );
}

export function refreshDeviceGeo(deviceId: string) {
  return json<{ device: EdgeDevice }>(
    `/devices/${encodeURIComponent(deviceId)}/geo`,
    { method: "POST", body: "{}" },
  );
}

export function removeDevice(deviceId: string) {
  return json<{ ok: boolean }>(`/devices/${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
  });
}

export type DeviceProbeIpResult = {
  ok: boolean;
  device: EdgeDevice;
  expectedEgressIp?: string | null;
  seenIp?: string | null;
  match?: boolean | null;
  matchNote?: string;
  classification?: ProxyExitTestResult["classification"];
  httpCode?: number;
  bytes?: number;
  probe?: Record<string, unknown>;
  error?: string;
  note?: string;
  durationMs?: number;
};

export function probeDeviceIp(deviceId: string) {
  // Client-side abort so UI never hangs if server stalls
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  return json<DeviceProbeIpResult>(
    `/devices/${encodeURIComponent(deviceId)}/probe-ip`,
    {
      method: "POST",
      body: JSON.stringify({ timeoutMs: 12_000 }),
      signal: ctrl.signal as RequestInit["signal"],
    },
  ).finally(() => clearTimeout(timer));
}

export type DeviceTrafficResult = {
  ok?: boolean;
  jobId?: string;
  deviceId?: string;
  status?: "running" | "done" | "error" | "cancelled";
  startedAt?: number;
  finishedAt?: number | null;
  durationSec?: number;
  targetBytes?: number;
  parallel?: number;
  chunkMb?: number | null;
  progress?: {
    elapsedMs: number;
    totalBytes: number;
    okCount: number;
    failCount: number;
    hits: number;
    lastUrl?: string | null;
    lastError?: string | null;
    mb: number;
    inFlight?: number;
    peakInFlight?: number;
  };
  device?: EdgeDevice;
  recentHits?: Array<Record<string, unknown>>;
  summary?: {
    urls?: number;
    rounds?: number;
    hits: number;
    okCount: number;
    totalBytes: number;
    durationMs: number;
    mb?: number;
  };
  hits?: Array<Record<string, unknown>>;
  probe?: Record<string, unknown>;
  note?: string;
  error?: string;
};

/** Start long multi-MB job (default 5 min / 25 MB). Returns immediately with jobId. */
export function runDeviceTraffic(
  deviceId: string,
  body?: {
    durationSec?: number;
    targetMb?: number;
    chunkMb?: number;
    /** Concurrent CONNECT streams through the phone (default 10) */
    parallel?: number;
    rounds?: number;
    wait?: boolean;
  },
) {
  return json<DeviceTrafficResult>(
    `/devices/${encodeURIComponent(deviceId)}/traffic`,
    {
      method: "POST",
      body: JSON.stringify({
        durationSec: 180,
        targetMb: 100,
        chunkMb: 1.5,
        parallel: 10,
        ...body,
      }),
    },
  );
}

export function fetchTrafficJob(jobId: string) {
  return json<DeviceTrafficResult>(
    `/traffic-jobs/${encodeURIComponent(jobId)}`,
  );
}

export function cancelDeviceTrafficJob(jobId: string) {
  return json<DeviceTrafficResult>(
    `/traffic-jobs/${encodeURIComponent(jobId)}/cancel`,
    { method: "POST", body: "{}" },
  );
}
