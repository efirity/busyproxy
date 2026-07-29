import { createFileRoute, redirect } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { LandingPage } from "@/components/marketing/landing";
import { isPortalHost } from "@/lib/host";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && isPortalHost()) {
      throw redirect({ to: "/portal" });
    }
  },
  head: () => ({
    meta: [
      {
        title: "BusyProxy — Share bandwidth. Get paid per GB.",
      },
      {
        name: "description",
        content:
          "Earn money by sharing spare Wi‑Fi or mobile bandwidth with BusyProxy. Simple app, phone login, Stripe payouts from $20.",
      },
      { property: "og:title", content: "BusyProxy — Share bandwidth. Get paid." },
      {
        property: "og:description",
        content:
          "Turn spare connection capacity into earnings. Phone OTP, transparent rates, secure withdrawals.",
      },
    ],
    links: [{ rel: "canonical", href: "https://busyproxy.net/" }],
  }),
  component: () => (
    <MarketingShell>
      <LandingPage />
    </MarketingShell>
  ),
});
