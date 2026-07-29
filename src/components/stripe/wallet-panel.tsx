import {
  ArrowDownToLine,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import { Badge, Button, Card, Money, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function StripeWalletPanel({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const {
    wallet,
    config,
    loading,
    busy,
    message,
    error,
    stripeOk,
    connectStripe,
    openDashboard,
    withdraw,
    fundPlatform,
    addDemoFunds,
    refresh,
  } = useStripeWallet();

  if (loading || !wallet) {
    return (
      <Card className={cn("flex items-center gap-2 p-5 text-sm text-fg-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading wallet…
      </Card>
    );
  }

  const progress = Math.min(
    1,
    wallet.availableCents / Math.max(1, wallet.minWithdrawCents),
  );
  const need = Math.max(0, wallet.minWithdrawCents - wallet.availableCents);
  const connected = Boolean(wallet.stripeAccountId);
  const ready = wallet.payoutsEnabled;
  const onSupabase = wallet.storage === "supabase";

  return (
    <div className={cn("space-y-3", className)}>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Live wallet</SectionLabel>
            <p className="mt-1 text-xs text-fg-muted">
              Stripe test ·{" "}
              {(wallet.currency || config?.currency || "usd").toUpperCase()} ·{" "}
              {onSupabase ? "Supabase" : "local fallback"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={stripeOk ? "success" : "danger"}>
              {stripeOk ? "Stripe OK" : "Stripe error"}
            </Badge>
            <Badge tone={onSupabase ? "primary" : "warning"}>
              {onSupabase ? "Supabase" : "Local"}
            </Badge>
            <Badge tone={ready ? "success" : connected ? "warning" : "neutral"}>
              {ready
                ? "Payouts on"
                : connected
                  ? "Onboarding"
                  : "Not connected"}
            </Badge>
          </div>
        </div>

        <p className="mt-4 text-xs text-fg-muted">Available balance</p>
        <Money cents={wallet.availableCents} size="xl" className="mt-1 block" />
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          {need > 0
            ? `$${(need / 100).toFixed(2)} more to reach $${(wallet.minWithdrawCents / 100).toFixed(0)} min withdraw`
            : "Minimum reached — withdraw when Stripe payouts are enabled"}
        </p>

        {wallet.pendingWithdrawCents > 0 && (
          <p className="mt-2 text-xs text-warning">
            Pending:{" "}
            <span className="font-mono">
              ${(wallet.pendingWithdrawCents / 100).toFixed(2)}
            </span>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!ready ? (
            <Button onClick={() => void connectStripe()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {connected ? "Continue Stripe setup" : "Connect Stripe"}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => void withdraw()}
                disabled={
                  busy || wallet.availableCents < wallet.minWithdrawCents
                }
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}
                Withdraw all
              </Button>
              <Button
                variant="secondary"
                onClick={() => void openDashboard()}
                disabled={busy}
              >
                <ExternalLink className="h-4 w-4" />
                Stripe dashboard
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={busy}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {(message || error) && (
          <div
            className={cn(
              "mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed",
              error
                ? "border-danger/40 bg-danger-soft/40 text-danger"
                : "border-border bg-bg text-fg-muted",
            )}
          >
            {error || message}
            {error?.toLowerCase().includes("connect") && (
              <p className="mt-2">
                <a
                  href="https://dashboard.stripe.com/test/connect"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline"
                >
                  Open Stripe Connect setup →
                </a>
              </p>
            )}
          </div>
        )}

        {onSupabase && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
            <Database className="h-3.5 w-3.5" />
            User {wallet.userId.slice(0, 8)}… · {wallet.phone}
          </p>
        )}
      </Card>

      {!compact && (
        <Card className="p-4">
          <SectionLabel>Test helpers</SectionLabel>
          <p className="mt-2 text-xs text-fg-muted">
            Credits write to Supabase wallet + ledger. Platform fund is a Stripe
            test charge (may land in pending balance first).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void addDemoFunds()}
            >
              + $10 demo earnings
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void fundPlatform()}
            >
              Fund platform ($50 test)
            </Button>
          </div>
        </Card>
      )}

      {!compact && wallet.withdrawals?.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <SectionLabel>Withdrawal history</SectionLabel>
          </div>
          <ul className="divide-y divide-border">
            {wallet.withdrawals.slice(0, 8).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-mono text-xs text-fg-muted">
                    {w.id.slice(0, 12)}…
                  </p>
                  <p className="text-[11px] text-fg-subtle">
                    {new Date(w.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <Money cents={-Math.abs(w.amountCents)} size="sm" />
                  <div className="mt-0.5">
                    <Badge
                      tone={
                        w.status === "paid"
                          ? "success"
                          : w.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {w.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
