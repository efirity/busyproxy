import { lazy, Suspense, useEffect, useState } from "react";
import {
  History,
  LayoutDashboard,
  Smartphone,
  Wallet,
} from "lucide-react";
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
import { openPayoutReceipt } from "@/lib/stripe-client";
import {
  fetchSession,
  getStoredUser,
  logout,
  type AuthUser,
} from "@/lib/auth-client";
import { fetchAccountBundle } from "@/lib/stripe-client";
import { gb, money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const EarningsChart = lazy(() =>
  import("@/components/dashboard/earnings-chart").then((m) => ({
    default: m.EarningsChart,
  })),
);

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
      referenceId?: string | null;
      receiptAvailable?: boolean;
    }>
  >([]);
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
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
          network: d.network,
        }))
      : DEMO_DEVICES.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          lastSeen: d.lastSeen,
          network: (d as { network?: string }).network || d.platform || "—",
        }));

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 sm:px-6 md:py-8">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-20 space-y-1 rounded-2xl border border-border bg-bg-elevated p-3">
          <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Account
          </p>
          <p className="px-2 text-sm font-semibold">{displayName}</p>
          <p className="px-2 font-mono text-xs text-fg-muted">{user.phone}</p>
          <div className="px-2 pb-2 pt-1">
            <Badge tone="success">OTP Session</Badge>
          </div>
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setSection(n.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition",
                section === n.id
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:bg-surface/60 hover:text-fg",
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
          <Button
            size="sm"
            className="w-full"
            variant="secondary"
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
                sub={todayEarn ? "From ledger" : gb(DEMO_USER.todayBytes)}
              />
              <Kpi
                label="This week"
                cents={weekEarn || DEMO_USER.weekEarnCents}
                sub={weekEarn ? "From ledger" : gb(DEMO_USER.weekBytes)}
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
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-xs text-fg-muted">
                      Loading chart…
                    </div>
                  }
                >
                  <EarningsChart data={chartData} />
                </Suspense>
              </div>
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
                  ? "Recent earnings activity — download receipts for cash-outs"
                  : "No earnings history yet — share to start earning"}
              </p>
            </div>
            {receiptError && (
              <p className="text-sm text-danger">{receiptError}</p>
            )}
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-fg-subtle">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2.5 font-medium">When</th>
                      <th className="px-5 py-2.5 font-medium">Description</th>
                      <th className="px-5 py-2.5 font-medium">Type</th>
                      <th className="px-5 py-2.5 font-medium text-right">
                        Amount
                      </th>
                      <th className="px-5 py-2.5 font-medium text-right">
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((e) => {
                      const canReceipt =
                        e.type === "withdrawal" && Boolean(e.referenceId);
                      const wid = e.referenceId || "";
                      return (
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
                                  : e.amountCents >= 0
                                    ? "success"
                                    : "neutral"
                              }
                            >
                              {e.type}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Money cents={e.amountCents} size="sm" />
                          </td>
                          <td className="px-5 py-3 text-right">
                            {canReceipt ? (
                              <button
                                type="button"
                                disabled={receiptBusy === wid}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-surface disabled:opacity-50"
                                onClick={() => {
                                  setReceiptError(null);
                                  setReceiptBusy(wid);
                                  void openPayoutReceipt(wid)
                                    .catch((err) =>
                                      setReceiptError(
                                        err instanceof Error
                                          ? err.message
                                          : "Receipt failed",
                                      ),
                                    )
                                    .finally(() => setReceiptBusy(null));
                                }}
                              >
                                {receiptBusy === wid ? "Opening…" : "Download"}
                              </button>
                            ) : (
                              <span className="text-xs text-fg-subtle">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!ledger.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-fg-muted"
                        >
                          No rows yet
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
                Phones linked to your account
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {deviceList.map((d) => (
                <Card key={d.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-fg-muted">
                        {d.network || "—"} · last {d.lastSeen}
                      </p>
                    </div>
                    <StatusDot
                      status={
                        d.status === "sharing" || d.status === "online"
                          ? "online"
                          : "offline"
                      }
                    />
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {loading && (
          <p className="text-xs text-fg-subtle">Refreshing wallet…</p>
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
      <Money cents={cents} size="lg" className="mt-1 block" />
      {sub && <p className="mt-1 text-[11px] text-fg-subtle">{sub}</p>}
    </Card>
  );
}
