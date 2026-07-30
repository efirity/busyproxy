import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import {
  DEFAULT_ADMIN_SECTION,
  isAdminSection,
} from "@/lib/admin-sections";

/**
 * /portal/devices · /portal/users · … — section is the URL path segment.
 * Refresh restores the same section.
 */
export const Route = createFileRoute("/portal/$section")({
  beforeLoad: ({ params }) => {
    if (!isAdminSection(params.section)) {
      throw redirect({
        to: "/portal/$section",
        params: { section: DEFAULT_ADMIN_SECTION },
      });
    }
  },
  component: AdminSectionPage,
});

function AdminSectionPage() {
  return <AdminDashboard />;
}
