import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { DocsPage } from "@/components/docs/docs-page";

export const Route = createFileRoute("/docs")({
  component: () => (
    <MarketingShell>
      <DocsPage />
    </MarketingShell>
  ),
});
