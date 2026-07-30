import {
  ArrowDownToLine,
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
 * Stripe-only wallet: link debit card via Connect Express, Instant Payout cash-out.
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
  const canCashOut = wallet.availableCents >= wallet.minWithdrawCents && ready;
  const cards = (wallet.payoutMethods || []).filter((m) => m.type === "card");
  const primaryCard = cards[0];
  const testMode = config?.mode === "test";

  return (
    <div className={cn("space-y-3", className)}>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel>Your wallet</SectionLabel>
            <p className="mt-1 text-xs text-fg-muted">
              Cash out to your debit card · min $
              {(wallet.minWithdrawCents / 100).toFixed(0)}
            </p>
          </div>
          <Badge
            tone={
              ready ? "success" : linked ? "warning" : "neutral"
            }
          >
            {ready
              ? "Card linked"
              : linked
                ? "Finish card setup"
                : "No card yet"}
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
            : ready
              ? "Minimum reached — you can cash out instantly"
              : "Minimum reached — link a debit card to cash out"}
        </p>

        {/* Linked card summary */}
        <div className="mt-4 rounded-xl border border-border bg-bg px-3.5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <CreditCard className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              {primaryCard ? (
                <>
                  <p className="text-sm font-medium capitalize">
                    {primaryCard.brand || "Card"} · •••• {primaryCard.last4}
                  </p>
                  <p className="text-[11px] text-fg-muted">
                    {primaryCard.funding === "debit"
                      ? "Debit · instant payouts"
                      : primaryCard.funding
                        ? `${primaryCard.funding} card`
                        : "Linked for payouts"}
                    {primaryCard.expMonth
                      ? ` · exp ${primaryCard.expMonth}/${primaryCard.expYear}`
                      : ""}
                  </p>
                </>
              ) : ready ? (
                <>
                  <p className="text-sm font-medium">Payout method ready</p>
                  <p className="text-[11px] text-fg-muted">
                    Managed securely by Stripe
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">No debit card linked</p>
                  <p className="text-[11px] text-fg-muted">
                    You’ll add it in a secure Stripe screen — we never see the
                    full card number
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
          {!ready ? (
            <Button onClick={() => void connectStripe()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {linked ? "Finish linking card" : "Link debit card"}
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
                Manage card
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
            {userFacingError(error) || message}
            {error?.toLowerCase().includes("connect") && (
              <p className="mt-2">
                Platform setup (one time):{" "}
                <a
                  href={
                    testMode
                      ? "https://dashboard.stripe.com/test/connect"
                      : "https://dashboard.stripe.com/connect"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  Enable Stripe Connect →
                </a>
              </p>
            )}
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
            Add demo earnings or fund the platform float so Instant Payouts can
            run in test mode.
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
                    Instant card · {new Date(w.createdAt).toLocaleString()}
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

function userFacingError(error: string | null | undefined) {
  if (!error) return null;
  const lower = error.toLowerCase();
  if (lower.includes("connect") || lower.includes("signed up")) {
    return "Card payouts need Stripe Connect enabled once on the company account. Use the link below, then try “Link debit card” again.";
  }
  if (lower.includes("platform") && lower.includes("balance")) {
    return error;
  }
  return error;
}
