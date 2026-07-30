import { useEffect, useState } from "react";
import {
  History,
  LayoutDashboard,
  Smartphone,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { OtpLogin } from "@/components/auth/otp-login";
import {
  Badge,
  Button,
  Card,
  Money,
  SectionLabel,
  StatusDot,
} from "@/components/ui/primitives";
import { StripeWalletPanel } from "@/components/stripe/wallet-panel";
import { DEMO_DEVICES, DEMO_HISTORY, DEMO_USER } from "@/data/demo";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import {
  fetchSession,
  getStoredUser,
  logout,
  type AuthUser,
} from "@/lib/auth-client";
import { fetchAccountBundle } from "@/lib/stripe-client";
import { gb, money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "history", label: "History", icon: History },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "devices", label: "Devices", icon: Smartphone },
] as const;

export function UserDashboard() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const { wallet, loading, reload } = useStripeWallet();
  const [section, setSection] = useState<(typeof nav)[number]["id"]>("overview");
  const [ledger, setLedger] = useState<
    Array<{
      id: string;
      type: string;
      description: string | null;
      amountCents: number;
      at: string;
    }>
  >([]);
  const [devices, setDevices] = useState<
    Array<{
      id: string;
      name: string;
      platform: string | null;
      status: string;
      lastSeen: string | null;
      network: string | null;
    }>
  >([]);

  useEffect(() => {
    void fetchSession().then((s) => {
      setUser(s?.user || getStoredUser());
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    void reload();
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe")) setSection("wallet");
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchAccountBundle()
      .then((b) => {
        setLedger(b.ledger || []);
        setDevices(b.devices || []);
      })
      .catch(() => {});
  }, [user?.id, wallet?.availableCents]);

  if (!authReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <SectionLabel>User dashboard</SectionLabel>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Sign in with phone
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
            Twilio OTP — same account as the mobile app.
          </p>
        </div>
        <OtpLogin
          variant="web"
          defaultPhone="+37368182830"
          onSuccess={(u) => setUser(u)}
        />
      </div>
    );
  }

  const chartData = [...DEMO_HISTORY].reverse().map((d) => ({
    day: shortDate(d.day),
    earn: d.earnCents / 100,
    gb: d.bytes / 1024 ** 3,
  }));

  const available = wallet?.availableCents ?? 0;
  const lifetime = wallet?.lifetimeEarnCents ?? 0;
  const displayName = user.displayName || wallet?.displayName || "Earner";

  const now = Date.now();
  const dayMs = 86400000;
  const todayEarn = ledger
    .filter(
      (e) =>
        e.amountCents > 0 &&
        now - new Date(e.at).getTime() < dayMs &&
        e.type !== "withdrawal",
    )
    .reduce((s, e) => s + e.amountCents, 0);
  const weekEarn = ledger
    .filter(
      (e) =>
        e.amountCents > 0 &&
        now - new Date(e.at).getTime() < 7 * dayMs &&
        e.type !== "withdrawal",
    )
    .reduce((s, e) => s + e.amountCents, 0);

  const deviceList =
    devices.length > 0
      ? devices.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status as
            | "sharing"
            | "offline"
            | "online"
            | "pending"
            | "banned",
          lastSeen: d.lastSeen
            ? new Date(d.lastSeen).toLocaleString()
            : "—",
          platform: d.platform || "android",
        }))
      : DEMO_DEVICES.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          lastSeen: d.lastSeen,
          platform: d.platform,
        }));

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl gap-0 md:gap-6 md:px-6 md:py-6">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border p-4 md:flex md:rounded-2xl md:border md:bg-surface">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
          Account
        </p>
        <p className="mt-2 font-semibold">{displayName}</p>
        <p className="font-mono text-xs text-fg-muted">{user.phone}</p>
        <Badge tone="success" className="mt-2 w-fit">
          OTP session
        </Badge>
        <nav className="mt-6 space-y-1">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setSection(n.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm",
                section === n.id
                  ? "bg-primary/10 text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-border bg-bg p-3">
            <p className="text-xs text-fg-muted">Available</p>
            {loading ? (
              <p className="mt-1 text-sm text-fg-subtle">…</p>
            ) : (
              <Money cents={available} size="md" className="mt-1 block" />
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={async () => {
              await logout();
              setUser(null);
            }}
          >
            Log out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-4 p-4 md:p-0">
        <div className="flex items-center justify-between gap-2 md:hidden">
          <div>
            <p className="font-semibold">{displayName}</p>
            <p className="font-mono text-xs text-fg-muted">{user.phone}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await logout();
              setUser(null);
            }}
          >
            Log out
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto md:hidden">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setSection(n.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                section === n.id ? "bg-surface text-fg" : "text-fg-muted",
              )}
            >
              {n.label}
            </button>
          ))}
        </div>

        {section === "overview" && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
              <p className="text-sm text-fg-muted">
                Live wallet for {user.phone}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Available" cents={available} />
              <Kpi
                label="Today"
                cents={todayEarn || DEMO_USER.todayEarnCents}
                sub={
                  todayEarn
                    ? "From ledger"
                    : gb(DEMO_USER.todayBytes)
                }
              />
              <Kpi
                label="This week"
                cents={weekEarn || DEMO_USER.weekEarnCents}
                sub={
                  weekEarn
                    ? "From ledger"
                    : gb(DEMO_USER.weekBytes)
                }
              />
              <Kpi label="Lifetime" cents={lifetime} />
            </div>

            <StripeWalletPanel compact />

            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionLabel>Earnings (7 days)</SectionLabel>
                <span className="text-xs text-fg-muted">
                  Rate {money(DEMO_USER.rateCentsPerGb)}/GB
                </span>
              </div>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#5c6a82", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#5c6a82", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#141a24",
                        border: "1px solid #273244",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earn"
                      stroke="#3b82f6"
                      fill="url(#earnFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <SectionLabel>Devices</SectionLabel>
              <ul className="mt-3 space-y-2">
                {deviceList.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <StatusDot status={d.status} />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-[11px] text-fg-subtle">
                          {d.status} · {d.lastSeen}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        {section === "wallet" && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
              <p className="text-sm text-fg-muted">
                Your earnings and cash-out
              </p>
            </div>
            <StripeWalletPanel />
          </>
        )}

        {section === "history" && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">History</h1>
              <p className="text-sm text-fg-muted">
                {ledger.length
                  ? "Recent earnings activity"
                  : "No earnings history yet — share to start earning"}
              </p>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs text-fg-subtle">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2.5 font-medium">When</th>
                      <th className="px-5 py-2.5 font-medium">Description</th>
                      <th className="px-5 py-2.5 font-medium">Type</th>
                      <th className="px-5 py-2.5 font-medium text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((e) => (
                      <tr key={e.id} className="border-b border-border/70">
                        <td className="px-5 py-3 text-fg-muted">
                          {new Date(e.at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          {e.description || e.type}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            tone={
                              e.type === "withdrawal"
                                ? "warning"
                                : e.type === "bonus"
                                  ? "primary"
                                  : "success"
                            }
                          >
                            {e.type.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Money
                            cents={e.amountCents}
                            size="sm"
                            className={e.amountCents >= 0 ? "text-success" : ""}
                          />
                        </td>
                      </tr>
                    ))}
                    {!ledger.length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-sm text-fg-muted"
                        >
                          No ledger rows yet — use +$10 on Wallet to credit.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {section === "devices" && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
              <p className="text-sm text-fg-muted">Phones linked to your account</p>
            </div>
            <Card className="p-5">
              <ul className="space-y-2">
                {deviceList.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <StatusDot status={d.status} />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-[11px] text-fg-subtle">
                          {d.platform} · {d.lastSeen}
                        </p>
                      </div>
                    </div>
                    <Badge
                      tone={d.status === "sharing" ? "success" : "neutral"}
                    >
                      {d.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({
  label,
  cents,
  sub,
}: {
  label: string;
  cents: number;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <Money cents={cents} size="md" className="mt-1 block" />
      {sub && (
        <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{sub}</p>
      )}
    </Card>
  );
}
