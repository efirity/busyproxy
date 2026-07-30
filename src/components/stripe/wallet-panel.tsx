import {
  ArrowDownToLine,
  Building2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import {
  Badge,
  Button,
  Card,
  Money,
  SectionLabel,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Stripe wallet: link bank (SG) or card via Connect Express, then cash out.
 */
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
    connectStripe,
    openDashboard,
    withdraw,
    fundPlatform,
    addDemoFunds,
    refresh,
  } = useStripeWallet();

  if (loading || !wallet) {
    return (
      <Card
        className={cn(
          "flex items-center gap-2 p-5 text-sm text-fg-muted",
          className,
        )}
      >
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
  const linked = Boolean(wallet.stripeAccountId);
  const ready = Boolean(wallet.payoutsEnabled);
  const methods = wallet.payoutMethods || [];
  const bank = methods.find((m) => m.type === "bank_account");
  const card = methods.find((m) => m.type === "card");
  const primary = bank || card;
  const hasMethod = Boolean(primary);
  const canCashOut =
    wallet.availableCents >= wallet.minWithdrawCents && ready && hasMethod;
  const testMode = config?.mode === "test";

  return (
    <div className={cn("space-y-3", className)}>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Your wallet</SectionLabel>
            <p className="mt-1 text-xs text-fg-muted">
              Cash out to your bank · min $
              {(wallet.minWithdrawCents / 100).toFixed(0)}
            </p>
          </div>
          <Badge
            tone={
              ready && hasMethod
                ? "success"
                : linked
                  ? "warning"
                  : "neutral"
            }
          >
            {ready && hasMethod
              ? "Payout ready"
              : hasMethod
                ? "Verifying…"
                : linked
                  ? "Finish setup"
                  : "No payout method"}
          </Badge>
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
            ? `$${(need / 100).toFixed(2)} more to reach $${(wallet.minWithdrawCents / 100).toFixed(0)} minimum`
            : ready && hasMethod
              ? "Minimum reached — you can cash out"
              : hasMethod
                ? "Bank linked — waiting for Stripe verification"
                : "Minimum reached — link a bank account to cash out"}
        </p>

        <div className="mt-4 rounded-xl border border-border bg-bg px-3.5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {bank ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              {bank ? (
                <>
                  <p className="text-sm font-medium">
                    {bank.bankName || "Bank"} · •••• {bank.last4}
                  </p>
                  <p className="text-[11px] text-fg-muted">
                    Linked for payouts
                    {ready ? " · ready" : " · verifying with Stripe"}
                  </p>
                </>
              ) : card ? (
                <>
                  <p className="text-sm font-medium capitalize">
                    {card.brand || "Card"} · •••• {card.last4}
                  </p>
                  <p className="text-[11px] text-fg-muted">Linked for payouts</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">No bank linked yet</p>
                  <p className="text-[11px] text-fg-muted">
                    You’ll add it in a secure Stripe screen — we never see full
                    account numbers
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {wallet.pendingWithdrawCents > 0 && (
          <p className="mt-2 text-xs text-warning">
            Pending:{" "}
            <span className="font-mono">
              ${(wallet.pendingWithdrawCents / 100).toFixed(2)}
            </span>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!ready || !hasMethod ? (
            <Button onClick={() => void connectStripe()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : bank ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {linked ? "Finish linking" : "Link bank for payouts"}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => void withdraw(wallet.availableCents)}
                disabled={busy || !canCashOut}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}
                {canCashOut
                  ? `Cash out $${(wallet.availableCents / 100).toFixed(2)}`
                  : `Need $${(wallet.minWithdrawCents / 100).toFixed(0)} min`}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void openDashboard()}
                disabled={busy}
              >
                <ExternalLink className="h-4 w-4" />
                Manage bank
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
          </div>
        )}

        <p className="mt-3 text-[11px] text-fg-subtle">
          Account · {wallet.phone}
        </p>
      </Card>

      {!compact && testMode && (
        <Card className="p-4">
          <SectionLabel>Test helpers</SectionLabel>
          <p className="mt-2 text-xs text-fg-muted">
            Add demo earnings or fund the platform balance so cash-out can run
            in test mode.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void addDemoFunds(1000)}
            >
              + $10 earnings
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void fundPlatform()}
            >
              Fund payout balance
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
                  <p className="text-xs text-fg-muted">
                    Bank payout · {new Date(w.createdAt).toLocaleString()}
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
