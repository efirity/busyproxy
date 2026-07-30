import { createFileRoute, redirect } from "@tanstack/react-router";
import { OperatorShell } from "@/components/admin/operator-shell";
import { isAdminHost } from "@/lib/host";

/**
 * Operator admin console — all devices, proxy credentials, fleet.
 *
 * Preferred host: https://admin.busyproxy.net/  (root)
 * Also: https://portal.busyproxy.net/portal · https://busyproxy.net/portal
 *
 * Earner wallet: https://busyproxy.net/dashboard only.
 */
export const Route = createFileRoute("/portal")({
  beforeLoad: () => {
    // On admin.* keep URLs clean — console lives at /
    if (typeof window !== "undefined" && isAdminHost()) {
      throw redirect({ to: "/" });
    }
  },
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
  component: () => <OperatorShell />,
});
