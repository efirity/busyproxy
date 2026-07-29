import {
  ArrowDownToLine,
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
  Button,
  Card,
  Money,
  SectionLabel,
  StatusDot,
} from "@/components/ui/primitives";
import { DEMO_DEVICES, DEMO_HISTORY, DEMO_LEDGER, DEMO_USER } from "@/data/demo";
import { gb, money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "history", label: "History", icon: History },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "devices", label: "Devices", icon: Smartphone },
] as const;

export function UserDashboard() {
  const chartData = [...DEMO_HISTORY].reverse().map((d) => ({
    day: shortDate(d.day),
    earn: d.earnCents / 100,
    gb: d.bytes / 1024 ** 3,
  }));
  const progress = Math.min(1, DEMO_USER.availableCents / DEMO_USER.minWithdrawCents);
  const canWithdraw = DEMO_USER.availableCents >= DEMO_USER.minWithdrawCents;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl gap-0 md:gap-6 md:px-6 md:py-6">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border p-4 md:flex md:rounded-2xl md:border md:bg-surface">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
          Account
        </p>
        <p className="mt-2 font-semibold">{DEMO_USER.displayName}</p>
        <p className="font-mono text-xs text-fg-muted">{DEMO_USER.phone}</p>
        <nav className="mt-6 space-y-1">
          {nav.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm",
                n.id === "overview"
                  ? "bg-primary/10 text-fg"
                  : "text-fg-muted",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </div>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-border bg-bg p-3">
          <p className="text-xs text-fg-muted">Available</p>
          <Money cents={DEMO_USER.availableCents} size="md" className="mt-1 block" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-4 p-4 md:p-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
            <p className="text-sm text-fg-muted">
              Same live wallet as the mobile app
            </p>
          </div>
          <Button disabled={!canWithdraw}>
            <ArrowDownToLine className="h-4 w-4" />
            Withdraw
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Available" cents={DEMO_USER.availableCents} />
          <Kpi label="Today" cents={DEMO_USER.todayEarnCents} sub={gb(DEMO_USER.todayBytes)} />
          <Kpi label="This week" cents={DEMO_USER.weekEarnCents} sub={gb(DEMO_USER.weekBytes)} />
          <Kpi label="Lifetime" cents={DEMO_USER.lifetimeEarnCents} />
        </div>

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

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionLabel>Withdraw progress</SectionLabel>
            <Money cents={DEMO_USER.availableCents} size="lg" className="mt-2 block" />
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              Minimum withdraw {money(DEMO_USER.minWithdrawCents)} · Stripe Connect
            </p>
          </Card>

          <Card className="p-5">
            <SectionLabel>Devices</SectionLabel>
            <ul className="mt-3 space-y-2">
              {DEMO_DEVICES.map((d) => (
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
                  <span className="font-mono text-xs text-fg-muted">
                    {d.todayGb} GB
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-fg-subtle">
              Start/stop sharing is controlled on the phone app.
            </p>
          </Card>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3">
            <SectionLabel>Recent ledger</SectionLabel>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-fg-subtle">
                <tr className="border-b border-border">
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-5 py-2.5 font-medium">Description</th>
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_LEDGER.map((e) => (
                  <tr key={e.id} className="border-b border-border/70">
                    <td className="px-5 py-3 text-fg-muted">
                      {new Date(e.at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">{e.description}</td>
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
              </tbody>
            </table>
          </div>
        </Card>
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
      {sub && <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{sub}</p>}
    </Card>
  );
}
