import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  Info,
  Loader2,
  QrCode,
  Share2,
  Signal,
  Wifi,
} from "lucide-react";
import { cn, copyText, formatBytes, formatDuration } from "@/lib/utils";
import {
  bindHost,
  proxyUrl,
  useRelayStore,
  type BindMode,
} from "@/store/relay-store";

const modes: { id: BindMode; label: string; hint: string }[] = [
  { id: "local", label: "Local", hint: "This device only" },
  { id: "lan", label: "Wi‑Fi", hint: "Same network" },
  { id: "remote", label: "Remote", hint: "Needs tunnel" },
];

export function HomeScreen() {
  const status = useRelayStore((s) => s.status);
  const startedAt = useRelayStore((s) => s.startedAt);
  const settings = useRelayStore((s) => s.settings);
  const localIp = useRelayStore((s) => s.localIp);
  const publicIp = useRelayStore((s) => s.publicIp);
  const networkType = useRelayStore((s) => s.networkType);
  const bytesUp = useRelayStore((s) => s.bytesUp);
  const bytesDown = useRelayStore((s) => s.bytesDown);
  const activeConnections = useRelayStore((s) => s.activeConnections);
  const showPassword = useRelayStore((s) => s.showPassword);
  const demoMode = useRelayStore((s) => s.demoMode);
  const toggleProxy = useRelayStore((s) => s.toggleProxy);
  const updateSettings = useRelayStore((s) => s.updateSettings);
  const setShowPassword = useRelayStore((s) => s.setShowPassword);
  const setToast = useRelayStore((s) => s.setToast);

  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);

  const running = status === "running";
  const starting = status === "starting";
  const host = bindHost(settings.bindMode, localIp);
  const uptime = running && startedAt ? formatDuration(now - startedAt) : "00:00:00";

  const onCopy = async (key: string, text: string) => {
    await copyText(text);
    setCopied(key);
    setToast("Copied to clipboard");
    setTimeout(() => setCopied(null), 1400);
  };

  const httpUrl = proxyUrl("http", settings, host, showPassword);
  const socksUrl = proxyUrl("socks5", settings, host, showPassword);
  const httpFull = proxyUrl("http", settings, host, true);
  const socksFull = proxyUrl("socks5", settings, host, true);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-1">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Relay</h1>
          <p className="text-xs text-fg-muted">
            {demoMode ? "Interactive demo engine" : "Live proxy engine"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-fg-muted hover:text-fg"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </header>

      {/* Status card */}
      <section
        className={cn(
          "rounded-2xl border p-4 transition-colors duration-300",
          running
            ? "border-success/30 bg-success-soft/40"
            : "border-border bg-surface",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "mt-0.5 h-2.5 w-2.5 rounded-full",
                running ? "bg-success status-pulse" : starting ? "bg-warning" : "bg-fg-subtle",
              )}
            />
            <div>
              <p className="text-sm font-semibold tracking-wide">
                {running ? "RUNNING" : starting ? "STARTING" : "STOPPED"}
              </p>
              <p className="mt-0.5 font-mono text-xs tabular text-fg-muted">{uptime}</p>
            </div>
          </div>
          <div className="text-right text-xs text-fg-muted">
            <div className="flex items-center justify-end gap-1">
              {networkType === "wifi" ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <Signal className="h-3.5 w-3.5" />
              )}
              <span className="capitalize">{networkType}</span>
            </div>
            <p className="mt-0.5 font-mono tabular">
              {publicIp ? `IP ${publicIp}` : "Public IP —"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={starting}
          onClick={() => void toggleProxy()}
          className={cn(
            "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-60",
            running
              ? "bg-danger text-white hover:bg-danger/90"
              : "bg-primary text-primary-fg hover:bg-primary/90",
          )}
        >
          {starting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting…
            </>
          ) : running ? (
            "Stop proxy"
          ) : (
            "Start proxy"
          )}
        </button>
      </section>

      {/* Mode */}
      <section className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
          Connection mode
        </p>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((m) => {
            const active = settings.bindMode === m.id;
            const remoteLocked = m.id === "remote";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (remoteLocked) {
                    setToast("Remote mode needs a tunnel — coming in v1.1");
                    return;
                  }
                  updateSettings({ bindMode: m.id });
                  if (running) setToast("Mode updated — restart proxy to rebind");
                }}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-left transition",
                  active
                    ? "border-primary/50 bg-primary-soft text-fg"
                    : "border-border bg-surface text-fg-muted hover:border-border-strong",
                  remoteLocked && "opacity-70",
                )}
              >
                <p className="text-sm font-semibold text-fg">{m.label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-fg-subtle">{m.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Endpoints */}
      <section className="mt-4 space-y-3">
        {settings.httpEnabled && (
          <EndpointCard
            title="HTTP proxy"
            url={httpUrl}
            copied={copied === "http"}
            onCopy={() => void onCopy("http", httpFull)}
            onShare={() => void onCopy("http-share", httpFull)}
          />
        )}
        {settings.socksEnabled && (
          <EndpointCard
            title="SOCKS5"
            url={socksUrl}
            copied={copied === "socks"}
            onCopy={() => void onCopy("socks", socksFull)}
            onShare={() => void onCopy("socks-share", socksFull)}
          />
        )}
      </section>

      {/* Stats */}
      <section className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Upload" value={formatBytes(bytesUp)} />
        <Stat label="Download" value={formatBytes(bytesDown)} />
        <Stat label="Active" value={String(activeConnections)} />
      </section>

      {/* Tips */}
      <div className="mt-4 flex gap-2 rounded-xl border border-border bg-surface-2/60 p-3 text-xs leading-relaxed text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          {settings.bindMode === "lan" && networkType === "cellular" ? (
            <p>
              On cellular, other devices usually cannot reach this phone’s IP (CGNAT). Use Wi‑Fi mode on the same network, or Remote tunnel later.
            </p>
          ) : settings.bindMode === "local" ? (
            <p>
              Local mode binds to 127.0.0.1 — only apps on this device can connect.
            </p>
          ) : (
            <p>
              Point a client on the same Wi‑Fi at the URL above. Guest networks with client isolation may block access.
            </p>
          )}
          <p className="mt-1.5 flex items-center gap-1 text-fg-subtle">
            <Globe2 className="h-3 w-3" />
            Host for clients: <span className="font-mono text-fg-muted">{host}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="mt-1 font-mono text-sm font-medium tabular text-fg">{value}</p>
    </div>
  );
}

function EndpointCard({
  title,
  url,
  copied,
  onCopy,
  onShare,
}: {
  title: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{title}</p>
      <p className="mt-2 break-all font-mono text-[12px] leading-relaxed text-fg">{url}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 text-xs font-medium text-fg hover:bg-surface-3"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg"
          aria-label="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg"
          aria-label="QR code"
          title="Copy for QR tools"
        >
          <QrCode className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
