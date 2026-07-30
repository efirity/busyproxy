import type { ReactNode } from "react";
import {
  Battery,
  BookOpen,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRelayStore } from "@/store/relay-store";

export function SettingsScreen() {
  const settings = useRelayStore((s) => s.settings);
  const updateSettings = useRelayStore((s) => s.updateSettings);
  const rotatePassword = useRelayStore((s) => s.rotatePassword);
  const showPassword = useRelayStore((s) => s.showPassword);
  const setShowPassword = useRelayStore((s) => s.setShowPassword);
  const setToast = useRelayStore((s) => s.setToast);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-1">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-fg-muted">Access, ports, and reliability</p>
      </header>

      <Section title="Access" icon={KeyRound}>
        <Field label="Username">
          <input
            value={settings.username}
            onChange={(e) => updateSettings({ username: e.target.value || "relay" })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-fg outline-none focus:border-primary"
          />
        </Field>
        <Field label="Password">
          <div className="flex gap-2">
            <input
              type={showPassword ? "text" : "password"}
              value={settings.password}
              onChange={(e) => updateSettings({ password: e.target.value })}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 font-mono text-sm text-fg outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="h-11 shrink-0 rounded-xl border border-border px-3 text-xs text-fg-muted hover:text-fg"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        <button
          type="button"
          onClick={rotatePassword}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 text-sm font-medium hover:bg-surface-3"
        >
          <RefreshCw className="h-4 w-4" />
          Rotate password
        </button>
      </Section>

      <Section title="Protocols & ports" icon={Shield}>
        <ToggleRow
          label="HTTP proxy"
          description={`Port ${settings.httpPort}`}
          checked={settings.httpEnabled}
          onChange={(v) => updateSettings({ httpEnabled: v })}
        />
        <Field label="HTTP port">
          <input
            type="number"
            min={1024}
            max={65535}
            value={settings.httpPort}
            onChange={(e) =>
              updateSettings({ httpPort: clampPort(Number(e.target.value) || 8888) })
            }
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 font-mono text-sm outline-none focus:border-primary"
          />
        </Field>
        <ToggleRow
          label="SOCKS5"
          description={`Port ${settings.socksPort}`}
          checked={settings.socksEnabled}
          onChange={(v) => updateSettings({ socksEnabled: v })}
        />
        <Field label="SOCKS5 port">
          <input
            type="number"
            min={1024}
            max={65535}
            value={settings.socksPort}
            onChange={(e) =>
              updateSettings({ socksPort: clampPort(Number(e.target.value) || 1080) })
            }
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 font-mono text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Max connections">
          <input
            type="number"
            min={1}
            max={512}
            value={settings.maxConnections}
            onChange={(e) =>
              updateSettings({
                maxConnections: Math.min(512, Math.max(1, Number(e.target.value) || 128)),
              })
            }
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 font-mono text-sm outline-none focus:border-primary"
          />
        </Field>
      </Section>

      <Section title="Reliability" icon={Battery}>
        <ToggleRow
          label="Start on boot"
          description="Requires install on a real device"
          checked={settings.startOnBoot}
          onChange={(v) => {
            updateSettings({ startOnBoot: v });
            setToast(v ? "Will apply on Android build" : "Start on boot off");
          }}
        />
        <button
          type="button"
          onClick={() => setToast("On Android: open Battery → Unrestricted for Relay")}
          className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
        >
          <span>Battery optimization guide</span>
          <ExternalLink className="h-4 w-4 text-fg-muted" />
        </button>
      </Section>

      <Section title="About" icon={BookOpen}>
        <div className="rounded-xl border border-border bg-bg px-3 py-3 text-xs leading-relaxed text-fg-muted">
          <p className="font-medium text-fg">Relay · interactive build</p>
          <p className="mt-1">
            This preview is a full product simulation with a real Node proxy engine (HTTP CONNECT + SOCKS5) when the sandbox allows binding ports. On a physical Android device, the same UX runs as a foreground service.
          </p>
          <p className="mt-2 text-fg-subtle">Design spec: ANDROID_MOBILE_PROXY_APP_DESIGN.md</p>
          <p className="mt-2">
            Support:{" "}
            <a href="mailto:support@busyproxy.net" className="text-primary hover:underline">
              support@busyproxy.net
            </a>
          </p>
        </div>
      </Section>
    </div>
  );
}

function clampPort(n: number) {
  return Math.min(65535, Math.max(1024, n));
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Shield;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {description && <p className="text-[11px] text-fg-subtle">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
