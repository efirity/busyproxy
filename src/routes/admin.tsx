import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const Route = createFileRoute("/admin")({
  component: () => (
    <MarketingShell>
      <AdminDashboard />
    </MarketingShell>
  ),
});
