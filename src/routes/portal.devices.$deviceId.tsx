import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

/**
 * Deep link to one device’s full detail page.
 *
 * Example:
 *   https://admin.busyproxy.net/portal/devices/dev_926fbc84d59da7ec
 *
 * Refresh keeps this device open (does not bounce to the table).
 */
export const Route = createFileRoute("/portal/devices/$deviceId")({
  head: ({ params }) => ({
    meta: [
      {
        title: `Device ${params.deviceId} — BusyProxy Admin`,
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DeviceDetailRoute,
});

function DeviceDetailRoute() {
  return <AdminDashboard />;
}
