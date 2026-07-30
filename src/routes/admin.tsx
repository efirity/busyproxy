import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAdminHost } from "@/lib/host";

/**
 * Path /admin → operator console.
 * On admin.busyproxy.net → / ; elsewhere → /portal.
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAdminHost()) {
      throw redirect({ to: "/" });
    }
    throw redirect({ to: "/portal" });
  },
  component: () => null,
});
