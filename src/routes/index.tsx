import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { LandingPage } from "@/components/marketing/landing";

export const Route = createFileRoute("/")({
  component: () => (
    <MarketingShell>
      <LandingPage />
    </MarketingShell>
  ),
});
