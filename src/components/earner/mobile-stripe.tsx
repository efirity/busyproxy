import { ArrowDownToLine, Loader2, Wallet } from "lucide-react";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import { Badge, Button, Money } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Compact Stripe controls embedded in the mobile earner app */
export function MobileStripeWallet({
  showHistory = true,
}: {
  showHistory?: boolean;
}) {
  const {
    wallet,
    loading,
    busy,
    message,
    error,
    stripeOk,
    connectStripe,
    withdraw,
    addDemoFunds,
    fundPlatform,
    refresh,
  } = useStripeWallet();

  if (loading || !wallet) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-4 text-sm text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading wallet…
      </div>
    );
  }

  const progress = Math.min(
    1,
    wallet.availableCents / Math.max(1, wallet.minWithdrawCents),
  );
  const need = Math.max(0, wallet.minWithdrawCents - wallet.availableCents);
  const ready = wallet.payoutsEnabled;
  const connected = Boolean(wallet.stripeAccountId);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">Available balance</p>
          <Badge tone={stripeOk ? "success" : "danger"}>
            {stripeOk ? "Stripe test" : "Offline"}
          </Badge>
        </div>
        <Money cents={wallet.availableCents} size="xl" className="mt-1 block" />
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          {need > 0
            ? `${money(need)} more to reach $20`
            : ready
              ? "Ready to withdraw"
              : "Connect Stripe to withdraw"}
        </p>

        {!ready ? (
          <Button
            className="mt-4 w-full"
            disabled={busy}
            onClick={() => void connectStripe()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {connected ? "Continue Stripe setup" : "Connect Stripe"}
          </Button>
        ) : (
          <Button
            className="mt-4 w-full"
            disabled={busy || wallet.availableCents < wallet.minWithdrawCents}
            onClick={() => void withdraw()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Withdraw
          </Button>
        )}

        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => void addDemoFunds()}
          >
            +$10
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </div>

        {(message || error) && (
          <p
            className={cn(
              "mt-3 text-[11px] leading-relaxed",
              error ? "text-danger" : "text-fg-muted",
            )}
          >
            {error || message}
          </p>
        )}

        {wallet.pendingWithdrawCents > 0 && (
          <p className="mt-2 text-[11px] text-warning">
            Pending {money(wallet.pendingWithdrawCents)}
          </p>
        )}

        <p className="mt-2 text-[10px] text-fg-subtle">
          {ready
            ? "Payouts enabled"
            : connected
              ? "Finish onboarding in Stripe"
              : "No payout method yet"}
          {" · "}
          <button
            type="button"
            className="underline"
            disabled={busy}
            onClick={() => void fundPlatform()}
          >
            fund platform
          </button>
        </p>
      </div>

      {showHistory && wallet.withdrawals.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface">
          <p className="border-b border-border px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            Withdrawals
          </p>
          <ul className="divide-y divide-border">
            {wallet.withdrawals.slice(0, 5).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between px-3.5 py-2.5"
              >
                <div>
                  <p className="text-xs text-fg-muted">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </p>
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
                <Money cents={-Math.abs(w.amountCents)} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
