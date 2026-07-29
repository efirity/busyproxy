export type EdgeDevice = {
  deviceId: string;
  userId: string;
  name: string;
  platform: string;
  network: string;
  country: string;
  exitEnabled: boolean;
  online: boolean;
  lastSeenAt: number | null;
  tunnelId: string | null;
  lastPublicIp: string | null;
  bytesUp: number;
  bytesDown: number;
};

export type EdgeCredential = {
  id: string;
  username: string;
  label: string;
  boundDeviceId: string | null;
  boundCountry: string | null;
  allowlistIps: string[];
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
    http?: string;
    socks5?: string;
  };
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
    };
    whyNotDirectIp: string;
    speed: string;
    earnerTransparency: string;
  };
  stats: {
    devices: number;
    online: number;
    credentials: number;
    events: number;
  };
  devices: EdgeDevice[];
  credentials: EdgeCredential[];
  events: Array<Record<string, unknown>>;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/edge${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
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
}) {
  return json<EdgeCredential & { password?: string; note?: string }>(
    "/credentials",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function patchCredential(
  id: string,
  body: Record<string, unknown>,
) {
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

export function agentHello(body: Record<string, unknown>) {
  return json<Record<string, unknown>>("/agent/hello", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
