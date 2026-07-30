import { createFileRoute } from "@tanstack/react-router";
import { AppPreviewPage } from "@/components/earner/app-preview-page";
import { MarketingShell } from "@/components/layout/shell";
import { assertOperatorHostOnly } from "@/lib/host";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    assertOperatorHostOnly();
  },
  head: () => ({
    meta: [
      {
        title: "BusyProxy App — Android earner client (real screenshots)",
      },
      {
        name: "description",
        content:
          "Preview the real BusyProxy Android earner app: phone OTP, Wi‑Fi & mobile sharing, live agent status, Stripe withdrawals. Screenshots from Pixel 4a and OnePlus.",
      },
      { name: "robots", content: "index,follow" },
      {
        property: "og:title",
        content: "BusyProxy earner app — real Android design",
      },
      {
        property: "og:description",
        content:
          "Native Android client with OTP login, network modes, reverse tunnel agent, and cash-out. Not a demo mock.",
      },
      {
        property: "og:image",
        content: "https://busyproxy.net/app/04-agent-traffic.png?v7",
      },
    ],
    links: [{ rel: "canonical", href: "https://busyproxy.net/app" }],
  }),
  component: AppPage,
});

function AppPage() {
  return (
    <MarketingShell>
      <AppPreviewPage />
    </MarketingShell>
  );
}
