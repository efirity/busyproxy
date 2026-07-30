import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { MarketingShell } from "@/components/layout/shell";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import {
  assertOperatorHostOnly,
  isOperatorHost,
  operatorHomePath,
} from "@/lib/host";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    // admin.* / portal.* must never show the earner wallet UI
    assertOperatorHostOnly();
  },
  head: () => ({
    meta: [
      { title: "BusyProxy Dashboard — Earnings & wallet" },
      {
        name: "description",
        content:
          "Sign in to your BusyProxy dashboard: traffic, earnings, devices, and Stripe withdrawals.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  // Belt-and-suspenders: if SPA beforeLoad missed (stale tab), hard-redirect operator hosts
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isOperatorHost()) {
      window.location.replace(operatorHomePath());
    }
  }, []);

  if (typeof window !== "undefined" && isOperatorHost()) {
    return <div className="min-h-dvh bg-bg" aria-busy="true" />;
  }

  return (
    <MarketingShell>
      <UserDashboard />
    </MarketingShell>
  );
}
