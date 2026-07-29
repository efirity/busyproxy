import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

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
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">
              BP
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">BusyProxy Portal</p>
              <p className="text-[10px] text-fg-subtle">Operator console</p>
            </div>
          </div>
          <p className="hidden text-xs text-fg-muted sm:block">
            portal.busyproxy.net · not linked from marketing
          </p>
        </div>
      </header>
      <AdminDashboard />
    </div>
  );
}
