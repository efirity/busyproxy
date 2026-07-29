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
import {
  Badge,
  Card,
  Money,
  SectionLabel,
  StatusDot,
} from "@/components/ui/primitives";
import { StripeWalletPanel } from "@/components/stripe/wallet-panel";
import { DEMO_DEVICES, DEMO_HISTORY, DEMO_USER } from "@/data/demo";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
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
  const { wallet, loading } = useStripeWallet();
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

  const chartData = [...DEMO_HISTORY].reverse().map((d) => ({
    day: shortDate(d.day),
    earn: d.earnCents / 100,
    gb: d.bytes / 1024 ** 3,
  }));

  const available = wallet?.availableCents ?? DEMO_USER.availableCents;
  const lifetime = wallet?.lifetimeEarnCents ?? DEMO_USER.lifetimeEarnCents;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe")) setSection("wallet");
  }, []);

  useEffect(() => {
    void fetchAccountBundle()
      .then((b) => {
        setLedger(b.ledger || []);
        setDevices(b.devices || []);
      })
      .catch(() => {
        /* keep demo fallbacks */
      });
  }, [wallet?.availableCents, wallet?.userId]);

  const deviceList =
    devices.length > 0
      ? devices.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status as "sharing" | "offline" | "online" | "pending" | "banned",
          lastSeen: d.lastSeen
            ? new Date(d.lastSeen).toLocaleString()
            : "—",
          platform: d.platform || "android",
          todayGb: 0,
        }))
      : DEMO_DEVICES;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl gap-0 md:gap-6 md:px-6 md:py-6">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border p-4 md:flex md:rounded-2xl md:border md:bg-surface">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
          Account
        </p>
        <p className="mt-2 font-semibold">
          {wallet?.displayName ?? DEMO_USER.displayName}
        </p>
        <p className="font-mono text-xs text-fg-muted">
          {wallet?.phone ?? DEMO_USER.phone}
        </p>
        {wallet?.storage === "supabase" && (
          <Badge tone="primary" className="mt-2 w-fit">
            Supabase
          </Badge>
        )}
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
        <div className="mt-auto rounded-xl border border-border bg-bg p-3">
          <p className="text-xs text-fg-muted">Available</p>
          {loading ? (
            <p className="mt-1 text-sm text-fg-subtle">…</p>
          ) : (
            <Money cents={available} size="md" className="mt-1 block" />
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-4 p-4 md:p-0">
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
                Live Supabase wallet + Stripe test payouts
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Available" cents={available} />
              <Kpi
                label="Today"
                cents={DEMO_USER.todayEarnCents}
                sub={gb(DEMO_USER.todayBytes)}
              />
              <Kpi
                label="This week"
                cents={DEMO_USER.weekEarnCents}
                sub={gb(DEMO_USER.weekBytes)}
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
                Supabase balances · Stripe Connect Express
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
                  ? "Live ledger from Supabase"
                  : "Demo samples (no ledger yet)"}
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
                    {(ledger.length
                      ? ledger
                      : []
                    ).map((e) => (
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
              <p className="text-sm text-fg-muted">
                From Supabase `devices` table
              </p>
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
