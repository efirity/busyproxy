import { Outlet, createFileRoute } from "@tanstack/react-router";
import { OperatorShell } from "@/components/admin/operator-shell";

/**
 * Operator console layout — all sections under /portal/:section
 *
 * - https://admin.busyproxy.net/portal/devices
 * - https://busyproxy.net/portal/devices
 * - https://portal.busyproxy.net/portal/devices
 *
 * Refresh keeps the active section via the URL path.
 */
export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "BusyProxy Admin — Fleet, devices & proxies" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "Operator console: all earner devices, tunnels, and proxy credentials.",
      },
    ],
  }),
  component: PortalLayout,
});

function PortalLayout() {
  // OperatorShell provides auth chrome; child routes fill <Outlet />
  return (
    <OperatorShell>
      <Outlet />
    </OperatorShell>
  );
}
