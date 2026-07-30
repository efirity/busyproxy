import { createFileRoute } from "@tanstack/react-router";
import { DesignSystemPage } from "@/components/design/design-system-page";
import { assertOperatorHostOnly } from "@/lib/host";

/**
 * Internal project page — design system.
 * Not linked from public marketing nav. noindex.
 */
export const Route = createFileRoute("/design")({
  beforeLoad: () => {
    assertOperatorHostOnly();
  },
  head: () => ({
    meta: [
      { title: "BusyProxy — Design system (internal)" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="border-b border-border px-4 py-2 text-center text-[11px] text-fg-subtle">
        Internal project page · not part of public marketing site
      </div>
      <DesignSystemPage />
    </div>
  ),
});
