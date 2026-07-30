import { ArrowDownToLine, CreditCard, Loader2, Unlink } from "lucide-react";
import { useState } from "react";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import { Badge, Button, Money } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Mobile earner wallet — Stripe Instant Payouts only (+ unlink bank) */
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
    connectStripe,
    unlinkBank,
    withdraw,
    addDemoFunds,
    refresh,
  } = useStripeWallet();
  const [confirmUnlink, setConfirmUnlink] = useState(false);

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
  const linked = Boolean(wallet.stripeAccountId);
  const canCashOut = wallet.availableCents >= wallet.minWithdrawCents && ready;
  const card = (wallet.payoutMethods || []).find((m) => m.type === "card");

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">Available balance</p>
          <Badge tone={ready ? "success" : linked ? "warning" : "neutral"}>
            {ready ? "Card linked" : linked ? "Finish setup" : "No card"}
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
              ? "Ready for instant cash-out"
              : "Link a debit card to cash out"}
        </p>

        {card && (
          <p className="mt-3 rounded-xl border border-border bg-bg px-3 py-2 text-xs">
            <span className="capitalize">{card.brand || "Card"}</span> · ••••{" "}
            {card.last4}
          </p>
        )}

        {!ready ? (
          <Button
            className="mt-4 w-full"
            disabled={busy}
            onClick={() => void connectStripe()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            {linked ? "Finish linking card" : "Link debit card"}
          </Button>
        ) : (
          <Button
            className="mt-4 w-full"
            disabled={busy || !canCashOut}
            onClick={() => void withdraw()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            {canCashOut ? "Cash out instantly" : "Need $20 min"}
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

        {linked && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 w-full text-danger hover:text-danger"
            disabled={busy || wallet.pendingWithdrawCents > 0}
            onClick={() => setConfirmUnlink(true)}
          >
            <Unlink className="h-3.5 w-3.5" />
            Unlink bank
          </Button>
        )}

        {confirmUnlink && linked && (
          <div className="mt-2 rounded-xl border border-danger/40 bg-danger-soft/30 px-3 py-2.5">
            <p className="text-xs font-medium text-fg">Unlink payout bank?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
              Removes your linked bank/card. Balance stays. Link again later to
              cash out.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                className="flex-1"
                disabled={busy}
                onClick={() => {
                  void unlinkBank()
                    .then(() => setConfirmUnlink(false))
                    .catch(() => {});
                }}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Yes, unlink"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1"
                disabled={busy}
                onClick={() => setConfirmUnlink(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

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
