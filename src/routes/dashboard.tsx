import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { UserDashboard } from "@/components/dashboard/user-dashboard";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <MarketingShell>
      <UserDashboard />
    </MarketingShell>
  ),
});
