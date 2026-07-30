import { createFileRoute, redirect } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { LandingPage } from "@/components/marketing/landing";
import { DEFAULT_ADMIN_SECTION } from "@/lib/admin-sections";
import { isAdminHost, isPortalHost } from "@/lib/host";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Operator console lives at /portal/:section (URL survives refresh)
    if (typeof window !== "undefined" && isAdminHost()) {
      throw redirect({
        to: "/portal/$section",
        params: { section: DEFAULT_ADMIN_SECTION },
      });
    }
    if (typeof window !== "undefined" && isPortalHost() && !isAdminHost()) {
      throw redirect({
        to: "/portal/$section",
        params: { section: DEFAULT_ADMIN_SECTION },
      });
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
          "Earn money by sharing spare Wi‑Fi or mobile bandwidth with BusyProxy. Phone OTP login, transparent rates, Stripe payouts from $20.",
      },
      {
        property: "og:title",
        content: "BusyProxy — Share bandwidth. Get paid.",
      },
      {
        property: "og:description",
        content:
          "Turn spare connection capacity into earnings. Phone OTP, transparent rates, secure withdrawals.",
      },
    ],
    links: [{ rel: "canonical", href: "https://busyproxy.net/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <MarketingShell>
      <LandingPage />
    </MarketingShell>
  );
}
