import { useState } from "react";
import { ArrowDownToLine, Loader2, Wallet } from "lucide-react";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import { Badge, Button, Input, Money } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Compact wallet + cash-out for the mobile earner app */
export function MobileStripeWallet({
  showHistory = true,
}: {
  showHistory?: boolean;
}) {
  const {
    wallet,
    config,
    loading,
    busy,
    message,
    error,
    connectStripe,
    withdraw,
    savePaypal,
    addDemoFunds,
    refresh,
  } = useStripeWallet();

  const [rail, setRail] = useState<"sandbox" | "paypal" | "bank" | "stripe">(
    "sandbox",
  );
  const [paypalEmail, setPaypalEmail] = useState("");

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
  const canCashOut = wallet.availableCents >= wallet.minWithdrawCents;
  const testMode = config?.mode === "test" || wallet.sandboxPayouts;
  const method =
    rail === "stripe" && !ready && testMode
      ? "sandbox"
      : rail === "stripe" && !ready
        ? "paypal"
        : rail;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">Available balance</p>
          <Badge tone={canCashOut ? "success" : "neutral"}>
            {canCashOut ? "Ready" : "Earning"}
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
            : "You can cash out now"}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {testMode && (
            <Chip
              label="Instant"
              active={rail === "sandbox"}
              onClick={() => setRail("sandbox")}
            />
          )}
          <Chip
            label="PayPal"
            active={rail === "paypal"}
            onClick={() => setRail("paypal")}
          />
          <Chip
            label="Bank"
            active={rail === "bank"}
            onClick={() => setRail("bank")}
          />
          <Chip
            label="Card"
            active={rail === "stripe"}
            onClick={() => setRail("stripe")}
          />
        </div>

        {rail === "paypal" && (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="PayPal email"
              value={paypalEmail || wallet.email || ""}
              onChange={(e) => setPaypalEmail(e.target.value)}
            />
          </div>
        )}

        <Button
          className="mt-4 w-full"
          disabled={busy || !canCashOut}
          onClick={() =>
            void withdraw(wallet.availableCents, {
              method,
              paypalEmail: paypalEmail || wallet.email || undefined,
            })
          }
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowDownToLine className="h-4 w-4" />
          )}
          {canCashOut ? "Cash out" : "Need $20 min"}
        </Button>

        {rail === "stripe" && !ready && (
          <Button
            className="mt-2 w-full"
            variant="secondary"
            disabled={busy}
            onClick={() => void connectStripe()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {connected ? "Continue card setup" : "Link card or bank"}
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
            {error?.toLowerCase().includes("connect")
              ? "Try Instant or PayPal cash-out instead."
              : error || message}
          </p>
        )}

        {wallet.pendingWithdrawCents > 0 && (
          <p className="mt-2 text-[11px] text-warning">
            Pending {money(wallet.pendingWithdrawCents)}
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

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium",
        active
          ? "bg-primary text-primary-fg"
          : "bg-surface-3 text-fg-muted",
      )}
    >
      {label}
    </button>
  );
}
