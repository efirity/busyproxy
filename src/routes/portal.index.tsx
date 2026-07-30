import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_ADMIN_SECTION } from "@/lib/admin-sections";

/** /portal → /portal/devices (default section) */
export const Route = createFileRoute("/portal/")({
  beforeLoad: () => {
    throw redirect({
      to: "/portal/$section",
      params: { section: DEFAULT_ADMIN_SECTION },
    });
  },
  component: () => null,
});
