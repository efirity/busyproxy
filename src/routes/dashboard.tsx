import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export const Route = createFileRoute("/dashboard")({
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
  component: () => (
    <MarketingShell>
      <UserDashboard />
    </MarketingShell>
  ),
});
