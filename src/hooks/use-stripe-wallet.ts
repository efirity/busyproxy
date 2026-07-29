import { useCallback, useEffect, useState } from "react";
import {
  creditDemoBalance,
  fetchStripeConfig,
  fetchWallet,
  fundPlatformTest,
  openStripeDashboard,
  refreshConnectStatus,
  requestWithdraw,
  startConnectOnboarding,
  type StripeConfig,
  type StripeWallet,
  verifyStripe,
} from "@/lib/stripe-client";

export function useStripeWallet() {
  const [wallet, setWallet] = useState<StripeWallet | null>(null);
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeOk, setStripeOk] = useState<boolean | null>(null);

  const reload = useCallback(async () => {
    try {
      const [w, c, v] = await Promise.all([
        fetchWallet(),
        fetchStripeConfig(),
        verifyStripe().catch(() => ({ ok: false as const })),
      ]);
      setWallet(w);
      setConfig(c);
      setStripeOk(Boolean(v.ok));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("stripe");
    if (flag === "return" || flag === "refresh") {
      setMessage(
        flag === "return"
          ? "Returned from Stripe — refreshing payout status…"
          : "Stripe onboarding refreshed — checking status…",
      );
      void refreshConnectStatus()
        .then((w) => {
          setWallet(w);
          setMessage(
            w.payoutsEnabled
              ? "Stripe payouts enabled. You can withdraw when balance ≥ $20."
              : "Stripe account saved. Finish any remaining steps if payouts are still disabled.",
          );
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : String(err)),
        );
    }
  }, []);

  const connectStripe = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await startConnectOnboarding(window.location.origin);
      setWallet(result.wallet);
      setMessage("Redirecting to Stripe Connect…");
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const openDashboard = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await openStripeDashboard();
      window.open(url, "_blank", "noopener,noreferrer");
      setMessage("Opened Stripe Express dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (amountCents?: number) => {
    if (!wallet) return;
    const amount = amountCents ?? wallet.availableCents;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestWithdraw(amount);
      setWallet(result.wallet);
      if (result.ok) {
        setMessage(
          `Withdrawal of $${(amount / 100).toFixed(2)} sent via Stripe Transfer.`,
        );
      } else {
        setError(result.error || "Withdraw pending platform funds");
        setMessage(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const fundPlatform = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await fundPlatformTest(5000);
      const id = result.chargeId || result.paymentIntentId || "ok";
      setMessage(
        `Platform funded (test): ${id.slice(0, 18)}… status ${result.status}. Funds may be pending first.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const addDemoFunds = async () => {
    setBusy(true);
    setError(null);
    try {
      const w = await creditDemoBalance(1000);
      setWallet(w);
      setMessage("Added $10.00 demo earnings to wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const w = await refreshConnectStatus();
      setWallet(w);
      setMessage("Status refreshed from Stripe");
    } catch (err) {
      await reload();
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return {
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
    reload,
    setMessage,
    setError,
  };
}
