import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OperatorShell } from "@/components/admin/operator-shell";
import { MarketingShell } from "@/components/layout/shell";
import { LandingPage } from "@/components/marketing/landing";
import { isAdminHost, isPortalHost } from "@/lib/host";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // portal.* still uses /portal path; admin.* serves console at /
    if (typeof window !== "undefined" && isPortalHost() && !isAdminHost()) {
      throw redirect({ to: "/portal" });
    }
  },
  head: () => {
    const admin = typeof window !== "undefined" ? isAdminHost() : false;
    if (admin) {
      return {
        meta: [
          { title: "BusyProxy Admin — Fleet, devices & proxies" },
          { name: "robots", content: "noindex,nofollow" },
          {
            name: "description",
            content:
              "Operator admin: all users’ devices, tunnels, and proxy credentials.",
          },
        ],
      };
    }
    return {
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
    };
  },
  component: HomePage,
});

function HomePage() {
  // Avoid SSR/host mismatch: decide admin host after mount
  const [mode, setMode] = useState<"loading" | "admin" | "marketing">(
    "loading",
  );

  useEffect(() => {
    setMode(isAdminHost() ? "admin" : "marketing");
  }, []);

  if (mode === "loading") {
    return <div className="min-h-dvh bg-bg" aria-busy="true" />;
  }
  if (mode === "admin") {
    return <OperatorShell />;
  }
  return (
    <MarketingShell>
      <LandingPage />
    </MarketingShell>
  );
}
