import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { DesignSystemPage } from "@/components/design/design-system-page";

export const Route = createFileRoute("/design")({
  component: () => (
    <MarketingShell>
      <DesignSystemPage />
    </MarketingShell>
  ),
});
