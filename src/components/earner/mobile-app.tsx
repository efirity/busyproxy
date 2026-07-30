import { useEffect, useState } from "react";
import {
  ChevronLeft,
  History,
  Home,
  Radio,
  Settings,
  Signal,
  User,
  Wallet,
  Wifi,
} from "lucide-react";
import { OtpLogin } from "@/components/auth/otp-login";
import { Badge, Button, Money, StatusDot } from "@/components/ui/primitives";
import { MobileStripeWallet } from "@/components/earner/mobile-stripe";
import { DEMO_HISTORY, DEMO_LEDGER, DEMO_USER } from "@/data/demo";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import {
  fetchSession,
  getStoredUser,
  logout,
  type AuthUser,
} from "@/lib/auth-client";
import { gb, money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "home" | "history" | "wallet" | "settings";
type Screen = Tab | "account";

function networkLabel(
  sharing: boolean,
  network: "wifi" | "cellular",
  wifiOnly: boolean,
): string {
  if (!sharing) return "Any network when on";
  if (wifiOnly) return "Wi‑Fi only";
  return network === "wifi"
    ? "Wi‑Fi · mobile allowed"
    : "Mobile data · Wi‑Fi allowed";
}

function networkShort(
  network: "wifi" | "cellular",
  wifiOnly: boolean,
): string {
  if (wifiOnly) return "Wi‑Fi only";
  return network === "wifi" ? "Wi‑Fi" : "Mobile";
}

export function EarnerMobileApp() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>("home");
  const [sharing, setSharing] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [network, setNetwork] = useState<"wifi" | "cellular">("cellular");

  useEffect(() => {
    void fetchSession().then((s) => {
      setUser(s?.user || getStoredUser());
      setReady(true);
    });
  }, []);

  const goTab = (id: Tab) => {
    setTab(id);
    setScreen(id);
  };

  if (!ready) {
    return (
      <PhoneChrome>
        <div className="flex flex-1 items-center justify-center text-sm text-fg-muted">
          Loading…
        </div>
      </PhoneChrome>
    );
  }

  if (!user) {
    return (
      <PhoneChrome>
        <OtpLogin
          variant="mobile"
          defaultPhone="+37368182830"
          onSuccess={(u) => {
            setUser(u);
            setScreen("home");
            setTab("home");
          }}
        />
      </PhoneChrome>
    );
  }

  return (
    <PhoneChrome>
      <div className="flex min-h-0 flex-1 flex-col">
        {screen === "account" && (
          <AccountScreen
            user={user}
            onBack={() => setScreen(tab)}
            onLogout={async () => {
              await logout();
              setUser(null);
              setScreen("home");
              setTab("home");
            }}
            onUser={setUser}
          />
        )}
        {screen === "home" && (
          <HomeTab
            user={user}
            sharing={sharing}
            network={network}
            wifiOnly={wifiOnly}
            onToggleShare={() => setSharing((s) => !s)}
            onOpenAccount={() => setScreen("account")}
            onOpenWallet={() => goTab("wallet")}
            onCycleNetwork={() =>
              setNetwork((n) => (n === "wifi" ? "cellular" : "wifi"))
            }
          />
        )}
        {screen === "history" && <HistoryTab />}
        {screen === "wallet" && <WalletTab />}
        {screen === "settings" && (
          <SettingsTab
            user={user}
            wifiOnly={wifiOnly}
            onWifiOnly={setWifiOnly}
            onOpenAccount={() => setScreen("account")}
            onLogout={async () => {
              await logout();
              setUser(null);
            }}
          />
        )}
        {screen !== "account" && (
          <nav className="grid shrink-0 grid-cols-4 border-t border-border bg-bg-elevated/95 px-1 pb-2 pt-1">
            {(
              [
                ["home", "Home", Home],
                ["history", "History", History],
                ["wallet", "Wallet", Wallet],
                ["settings", "Settings", Settings],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => goTab(id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium",
                  tab === id ? "text-fg" : "text-fg-subtle",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", tab === id && "text-primary")}
                  strokeWidth={tab === id ? 2.25 : 1.75}
                />
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </PhoneChrome>
  );
}

function PhoneChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[390px] flex-col overflow-hidden rounded-phone border border-border-strong bg-bg phone-shadow sm:h-[min(780px,calc(100dvh-8rem))]">
      <div className="flex shrink-0 items-center justify-between px-5 pt-3 text-[11px] text-fg-muted tabular">
        <span>9:41</span>
        <span className="h-2 w-3.5 rounded-sm border border-fg-muted/60" />
      </div>
      {children}
    </div>
  );
}

function AccountAvatarButton({
  user,
  onClick,
}: {
  user: AuthUser;
  onClick: () => void;
}) {
  const initials = (user.displayName || user.phone || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Account"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-fg transition hover:border-border-strong hover:bg-surface-2"
    >
      {initials || <User className="h-4 w-4" />}
    </button>
  );
}

function AccountScreen({
  user,
  onBack,
  onLogout,
}: {
  user: AuthUser;
  onBack: () => void;
  onLogout: () => void;
  onUser: (u: AuthUser) => void;
}) {
  const { wallet } = useStripeWallet();
  const name = user.displayName || wallet?.displayName || "Earner";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">Account</h1>
      </div>

      <div className="mt-6 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-primary/15 text-lg font-semibold text-primary">
          {initials}
        </div>
        <p className="mt-3 text-lg font-semibold">{name}</p>
        <p className="mt-0.5 font-mono text-sm text-fg-muted">{user.phone}</p>
        <div className="mt-2">
          <Badge tone="success">OTP verified</Badge>
        </div>
      </div>

      <div className="mt-6 space-y-0 overflow-hidden rounded-2xl border border-border bg-surface">
        <InfoRow label="Phone" value={user.phone} mono />
        <InfoRow label="Display name" value={name} />
        <InfoRow label="Email" value={user.email || "Not set (optional)"} />
        <InfoRow
          label="Password"
          value="Not set · phone OTP only for now"
        />
        <InfoRow label="User ID" value={user.id} mono last />
      </div>

      <div className="mt-4 space-y-0 overflow-hidden rounded-2xl border border-border bg-surface">
        <InfoRow
          label="Available balance"
          value={money(wallet?.availableCents ?? 0)}
          mono
        />
        <InfoRow
          label="Lifetime earned"
          value={money(wallet?.lifetimeEarnCents ?? 0)}
          mono
        />
        <InfoRow
          label="Payout method"
          value={
            wallet?.payoutsEnabled
              ? "Stripe connected"
              : wallet?.stripeAccountId
                ? "Stripe onboarding…"
                : "Not set up"
          }
          last
        />
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-fg-subtle">
        Login is phone + OTP via Twilio. Email/password fields exist for later.
      </p>

      <Button variant="secondary" className="mt-4 w-full" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-3.5 py-3",
        !last && "border-b border-border",
      )}
    >
      <span className="shrink-0 text-sm text-fg-muted">{label}</span>
      <span
        className={cn(
          "max-w-[60%] break-all text-right text-sm font-medium text-fg",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function HomeTab({
  user,
  sharing,
  network,
  wifiOnly,
  onToggleShare,
  onOpenAccount,
  onOpenWallet,
  onCycleNetwork,
}: {
  user: AuthUser;
  sharing: boolean;
  network: "wifi" | "cellular";
  wifiOnly: boolean;
  onToggleShare: () => void;
  onOpenAccount: () => void;
  onOpenWallet: () => void;
  onCycleNetwork: () => void;
}) {
  const { wallet, loading, reload } = useStripeWallet();
  useEffect(() => {
    void reload();
  }, [user.id]);

  const available = wallet?.availableCents ?? 0;
  const minW = wallet?.minWithdrawCents ?? 2000;
  const progress = Math.min(1, available / Math.max(1, minW));
  const left = Math.max(0, minW - available);
  const NetIcon = network === "wifi" ? Wifi : Signal;
  const name = user.displayName || "Earner";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight">Home</p>
          <p className="text-xs text-fg-muted">{name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg-muted">
            <StatusDot status={sharing ? "sharing" : "offline"} />
            {sharing ? "Sharing" : "Paused"}
          </span>
          <AccountAvatarButton user={user} onClick={onOpenAccount} />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs text-fg-muted">Available balance</p>
        {loading ? (
          <p className="mt-1 text-2xl text-fg-subtle">…</p>
        ) : (
          <Money cents={available} size="xl" className="mt-1 block" />
        )}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          {left > 0
            ? `${money(left)} more to reach $20`
            : "Min withdraw reached"}
        </p>
        <Button className="mt-4 w-full" variant="secondary" onClick={onOpenWallet}>
          Open wallet · Stripe
        </Button>
      </div>

      <div
        className={cn(
          "mt-5 rounded-2xl border p-4",
          sharing
            ? "border-success/30 bg-success-soft/35"
            : "border-border bg-surface",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">
              {sharing ? "Sharing is on" : "Sharing is off"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
              <NetIcon className="h-3.5 w-3.5" />
              {networkLabel(sharing, network, wifiOnly)}
            </p>
            {!wifiOnly && (
              <p className="mt-1 text-[11px] text-fg-subtle">
                Works on Wi‑Fi and mobile data
              </p>
            )}
          </div>
          {sharing && (
            <button
              type="button"
              onClick={onCycleNetwork}
              className="rounded-lg border border-border bg-bg/50 px-2 py-1 text-[10px] font-medium text-fg-muted"
            >
              {networkShort(network, wifiOnly)}
            </button>
          )}
        </div>
        <Button
          className="mt-3 w-full"
          variant={sharing ? "danger" : "success"}
          onClick={onToggleShare}
        >
          {sharing ? "Stop sharing" : "Start sharing"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat
          label="Today"
          cents={DEMO_USER.todayEarnCents}
          sub={gb(DEMO_USER.todayBytes)}
        />
        <Stat
          label="This week"
          cents={DEMO_USER.weekEarnCents}
          sub={gb(DEMO_USER.weekBytes)}
        />
      </div>

      <p className="mt-5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        Recent activity
      </p>
      <ul className="mt-2 space-y-2">
        {DEMO_LEDGER.filter((e) => e.type === "traffic_earn")
          .slice(0, 3)
          .map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">+{gb(e.gb * 1024 ** 3)}</p>
                <p className="text-[11px] text-fg-subtle">Shared bandwidth</p>
              </div>
              <Money cents={e.amountCents} size="sm" className="text-success" />
            </li>
          ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  cents,
  sub,
}: {
  label: string;
  cents: number;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <Money cents={cents} size="sm" className="mt-1 block" />
      <p className="mt-0.5 font-mono text-[11px] text-fg-muted">{sub}</p>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2">
      <h1 className="text-lg font-semibold">History</h1>
      <p className="text-xs text-fg-muted">Daily traffic & earnings</p>
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
        {DEMO_HISTORY.map((d) => (
          <li
            key={d.day}
            className="flex items-center justify-between px-3.5 py-3"
          >
            <div>
              <p className="text-sm font-medium">{shortDate(d.day)}</p>
              <p className="font-mono text-[11px] text-fg-muted">
                {gb(d.bytes)}
              </p>
            </div>
            <Money cents={d.earnCents} size="sm" className="text-success" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function WalletTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2">
      <h1 className="text-lg font-semibold">Wallet</h1>
      <p className="mb-3 text-xs text-fg-muted">
        Your balance · cash out from $20
      </p>
      <MobileStripeWallet />
    </div>
  );
}

function SettingsTab({
  user,
  wifiOnly,
  onWifiOnly,
  onOpenAccount,
  onLogout,
}: {
  user: AuthUser;
  wifiOnly: boolean;
  onWifiOnly: (v: boolean) => void;
  onOpenAccount: () => void;
  onLogout: () => void;
}) {
  const name = user.displayName || "Earner";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4 pt-2">
      <h1 className="text-lg font-semibold">Settings</h1>

      <button
        type="button"
        onClick={onOpenAccount}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition hover:bg-surface-2"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{name}</p>
          <p className="truncate font-mono text-xs text-fg-muted">
            {user.phone}
          </p>
        </div>
        <User className="h-4 w-4 shrink-0 text-fg-subtle" />
      </button>

      <div className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-3">
        <RowToggle
          label="Wi‑Fi only"
          hint={
            wifiOnly
              ? "Sharing only on Wi‑Fi (mobile data off)"
              : "Share on Wi‑Fi and mobile data"
          }
          checked={wifiOnly}
          onChange={onWifiOnly}
        />
        <div className="border-t border-border pt-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Radio className="h-3.5 w-3.5 text-primary" />
            Networks
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {wifiOnly
              ? "Only Wi‑Fi is used for sharing."
              : "Any available network — Wi‑Fi and mobile — is used when sharing is on."}
          </p>
        </div>
      </div>
      <Button variant="secondary" className="mt-4 w-full" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}

function RowToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-fg-subtle">{hint}</p>
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
