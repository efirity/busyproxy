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
          ? "Back from Stripe — checking your debit card…"
          : "Refreshing card status…",
      );
      void refreshConnectStatus()
        .then((w) => {
          setWallet(w);
          const methods = w.payoutMethods || [];
          const hasMethod = methods.some(
            (m) => m.type === "bank_account" || m.type === "card",
          );
          setMessage(
            w.payoutsEnabled && hasMethod
              ? "Payout method linked. You can cash out when balance ≥ $20."
              : hasMethod
                ? "Bank saved — Stripe may still be verifying. Tap Refresh in a moment."
                : "Almost done — finish any remaining steps if cash-out is still locked.",
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
      setMessage("Opening secure Stripe card setup…");
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
      setMessage("Opened Stripe to manage your card");
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
      const result = await requestWithdraw(amount, { method: "stripe" });
      setWallet(result.wallet);
      if (result.ok) {
        setMessage(
          result.message ||
            `$${(amount / 100).toFixed(2)} sent to your debit card.`,
        );
      } else {
        setError(result.error || "Cash-out pending platform funds");
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
      const result = await fundPlatformTest(10000);
      setMessage(
        `Platform funded (test). Available may take a moment to settle. ${result.note || ""}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const addDemoFunds = async (cents = 1000) => {
    setBusy(true);
    setError(null);
    try {
      const w = await creditDemoBalance(cents);
      setWallet(w);
      setMessage(`Added $${(cents / 100).toFixed(2)} earnings`);
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
      setMessage(
        w.payoutsEnabled
          ? "Card status updated — ready to cash out"
          : "Status updated",
      );
    } catch {
      await reload();
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
    savePaypal: async () => {},
    fundPlatform,
    addDemoFunds,
    refresh,
    reload,
    setMessage,
    setError,
  };
}
