import { createFileRoute } from "@tanstack/react-router";
import { DocsPage } from "@/components/docs/docs-page";
import { assertOperatorHostOnly } from "@/lib/host";

/**
 * Internal project specs — not linked from public marketing nav. noindex.
 */
export const Route = createFileRoute("/docs")({
  beforeLoad: () => {
    assertOperatorHostOnly();
  },
  head: () => ({
    meta: [
      { title: "BusyProxy — Specs (internal)" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="border-b border-border px-4 py-2 text-center text-[11px] text-fg-subtle">
        Internal project docs · not part of public marketing site
      </div>
      <DocsPage />
    </div>
  ),
});
