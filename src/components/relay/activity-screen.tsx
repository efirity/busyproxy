import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { useRelayStore } from "@/store/relay-store";

export function ActivityScreen() {
  const events = useRelayStore((s) => s.events);
  const bytesUp = useRelayStore((s) => s.bytesUp);
  const bytesDown = useRelayStore((s) => s.bytesDown);
  const peakConnections = useRelayStore((s) => s.peakConnections);
  const clearLogs = useRelayStore((s) => s.clearLogs);
  const status = useRelayStore((s) => s.status);

  const maxBar = Math.max(bytesUp + bytesDown, 1);
  const upPct = Math.round((bytesUp / maxBar) * 100);
  const downPct = Math.round((bytesDown / maxBar) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-1">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
          <p className="text-xs text-fg-muted">
            {status === "running" ? "Live connection log" : "Start the proxy to capture traffic"}
          </p>
        </div>
        <button
          type="button"
          onClick={clearLogs}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-fg-muted hover:text-fg"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </header>

      <div className="mb-3 rounded-2xl border border-border bg-surface p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
              Bandwidth mix
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular">
              {formatBytes(bytesUp + bytesDown)}
            </p>
          </div>
          <p className="text-xs text-fg-muted">
            Peak <span className="font-mono tabular text-fg">{peakConnections}</span> conns
          </p>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="bg-primary transition-all duration-300" style={{ width: `${upPct}%` }} />
          <div className="bg-success transition-all duration-300" style={{ width: `${downPct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-fg-muted">
          <span className="flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-primary" />
            Up {formatBytes(bytesUp)}
          </span>
          <span className="flex items-center gap-1">
            <ArrowDownLeft className="h-3 w-3 text-success" />
            Down {formatBytes(bytesDown)}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-surface">
        {events.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-fg">No connections yet</p>
            <p className="mt-1 max-w-[28ch] text-xs leading-relaxed text-fg-muted">
              Start the proxy and point a client at your proxy URL. Requests will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 px-3.5 py-3">
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    ev.success ? "bg-success" : "bg-danger",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-fg">
                      {ev.destinationHost}
                      <span className="text-fg-subtle">:{ev.destinationPort}</span>
                    </p>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-fg-subtle">
                      {ev.protocol}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg-muted">
                    <span className="tabular">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <span>·</span>
                    <span className="tabular">
                      ↑{formatBytes(ev.bytesUp)} ↓{formatBytes(ev.bytesDown)}
                    </span>
                    {ev.clientIp && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{ev.clientIp}</span>
                      </>
                    )}
                  </div>
                  {!ev.success && ev.errorMessage && (
                    <p className="mt-1 text-[11px] text-danger">{ev.errorMessage}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
