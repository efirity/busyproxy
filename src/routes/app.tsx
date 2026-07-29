import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { EarnerMobileApp } from "@/components/earner/mobile-app";
import { SectionLabel } from "@/components/ui/primitives";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "BusyProxy App — Start earning from shared bandwidth" },
      {
        name: "description",
        content:
          "BusyProxy earner app preview: phone OTP login, share Wi‑Fi or mobile data, track earnings, withdraw with Stripe.",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "https://busyproxy.net/app" }],
  }),
  component: AppPage,
});

function AppPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 max-w-xl">
          <SectionLabel>Earner app</SectionLabel>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Simple client — money & traffic only
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Sign in with phone OTP, share on any network, watch your balance grow.
            Withdraw from $20.{" "}
            <Link to="/dashboard" className="text-primary hover:underline">
              Same account on the web dashboard →
            </Link>
          </p>
        </div>
        <div className="flex justify-center pb-12">
          <EarnerMobileApp />
        </div>
      </div>
    </MarketingShell>
  );
}
