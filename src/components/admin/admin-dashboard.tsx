import {
  Activity,
  Flag,
  LayoutDashboard,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Money,
  SectionLabel,
} from "@/components/ui/primitives";
import {
  ADMIN_KPIS,
  ADMIN_USERS,
  ADMIN_WITHDRAWALS,
} from "@/data/demo";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Users", icon: Users },
  { label: "Devices", icon: Smartphone },
  { label: "Traffic", icon: Activity },
  { label: "Withdrawals", icon: Wallet },
  { label: "Risk", icon: Flag },
];

export function AdminDashboard() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1400px]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-bg-elevated p-4 lg:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          Relay Admin
        </p>
        <nav className="mt-6 space-y-0.5">
          {nav.map((n) => (
            <div
              key={n.label}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                n.active
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-fg-muted">
            Users, devices, traffic liability & payouts
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_KPIS.map((k) => (
            <Card key={k.label} className="p-4">
              <p className="text-xs text-fg-muted">{k.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular tracking-tight">
                {k.value}
              </p>
              {k.delta && (
                <p className="mt-1 text-xs text-fg-subtle">{k.delta}</p>
              )}
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="overflow-hidden p-0 xl:col-span-3">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <SectionLabel>Users</SectionLabel>
              <span className="text-xs text-fg-subtle">Demo data</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-fg-subtle">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 font-medium">Phone</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">CC</th>
                    <th className="px-4 py-2 font-medium text-right">Balance</th>
                    <th className="px-4 py-2 font-medium text-right">Lifetime</th>
                    <th className="px-4 py-2 font-medium">Devices</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_USERS.map((u) => (
                    <tr key={u.phone} className="border-b border-border/60">
                      <td className="px-4 py-2.5 font-mono text-xs">{u.phone}</td>
                      <td className="px-4 py-2.5">{u.name}</td>
                      <td className="px-4 py-2.5 text-fg-muted">{u.country}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Money cents={u.balance} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-right text-fg-muted">
                        <Money cents={u.lifetime} size="sm" />
                      </td>
                      <td className="px-4 py-2.5">{u.devices}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={u.status === "active" ? "success" : "danger"}
                        >
                          {u.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 xl:col-span-2">
            <SectionLabel>Withdrawal queue</SectionLabel>
            <ul className="mt-3 space-y-2">
              {ADMIN_WITHDRAWALS.map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border border-border bg-bg p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-fg-muted">{w.phone}</p>
                      <Money cents={w.amount} size="sm" className="mt-1 block" />
                      <p className="mt-0.5 text-[11px] text-fg-subtle">{w.at}</p>
                    </div>
                    <Badge
                      tone={
                        w.status === "paid"
                          ? "success"
                          : w.status === "pending"
                            ? "warning"
                            : "primary"
                      }
                    >
                      {w.status}
                    </Badge>
                  </div>
                  {w.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="success" className="flex-1">
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" className="flex-1">
                        Hold
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-5">
          <SectionLabel>Ops notes</SectionLabel>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg-muted">
            <li>Ledger is source of truth — never edit balances in place.</li>
            <li>Min withdraw $20 enforced server-side; Stripe webhooks settle status.</li>
            <li>Device tunnel status feeds “Sharing now” KPI every 15s.</li>
            <li>Risk flags auto-hold withdrawals when severity = high.</li>
          </ul>
          <p className="mt-4 text-xs text-fg-subtle">
            Full data model: docs/SYSTEM_SPEC.md · SQL: docs/supabase/001_init.sql
          </p>
        </Card>
      </main>
    </div>
  );
}
