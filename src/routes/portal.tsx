import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { BrandLogo } from "@/components/brand/logo";

/**
 * Operator admin console.
 * Public site: https://portal.busyproxy.net (and /portal on main host for dev).
 * Not linked from marketing navigation.
 */
export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "BusyProxy Portal — Operator console" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "Internal operator dashboard for BusyProxy.",
      },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border/80 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo size="sm" />
          <p className="hidden text-xs text-fg-muted sm:block">
            portal.busyproxy.net · operator only
          </p>
        </div>
      </header>
      <AdminDashboard />
    </div>
  );
}
