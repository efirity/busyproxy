import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/primitives";

/**
 * Stripe Connect Account Links require https return/refresh URLs.
 * Mobile apps open Stripe in the system browser, then Stripe sends users here.
 * We immediately deep-link into the app: busyproxy://stripe?status=return|refresh
 */
export const Route = createFileRoute("/mobile/stripe-return")({
  head: () => ({
    meta: [
      { title: "BusyProxy — Return to app" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MobileStripeReturn,
});

function MobileStripeReturn() {
  const status = useMemo(() => {
    if (typeof window === "undefined") return "return";
    const q = new URLSearchParams(window.location.search);
    const s = q.get("stripe") || "return";
    return s === "refresh" ? "refresh" : "return";
  }, []);

  const deepLink = `busyproxy://stripe?status=${status}`;
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setTried(true);
    // Attempt automatic open of the installed app
    window.location.href = deepLink;
  }, [deepLink]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center text-fg">
      <BrandLogo size="lg" />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        {status === "refresh"
          ? "Finish linking in Stripe"
          : "Bank link complete"}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
        {status === "refresh"
          ? "Stripe needs another step. Open the BusyProxy app and tap Link bank again if the window closed."
          : "Return to the BusyProxy app — we’ll refresh your payout status automatically."}
      </p>
      <a href={deepLink} className="mt-8 block w-full max-w-xs">
        <Button size="lg" className="w-full">
          Open BusyProxy app
        </Button>
      </a>
      <a
        href="/dashboard"
        className="mt-4 text-sm text-fg-muted underline-offset-2 hover:text-fg hover:underline"
      >
        Or continue in the website dashboard
      </a>
      {tried && (
        <p className="mt-6 max-w-xs text-xs text-fg-subtle">
          If nothing opens, install BusyProxy from TestFlight / Play Store, then
          tap the button above.
        </p>
      )}
    </div>
  );
}
