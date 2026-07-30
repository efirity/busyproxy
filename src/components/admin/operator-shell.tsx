import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { BrandLogo } from "@/components/brand/logo";
import { getHostname, isAdminHost } from "@/lib/host";

/**
 * Full-screen operator console (all users’ devices + proxy credentials).
 * Served on admin.busyproxy.net and portal.busyproxy.net (and /portal on main).
 */
export function OperatorShell() {
  const host =
    typeof window !== "undefined" ? getHostname() : "admin.busyproxy.net";
  const label = isAdminHost(host)
    ? "admin.busyproxy.net · operator only"
    : host.startsWith("portal.")
      ? "portal.busyproxy.net · operator only"
      : "busyproxy.net/portal · operator only";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border/80 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Admin
            </span>
          </div>
          <p className="text-xs text-fg-muted">{label}</p>
        </div>
      </header>
      <AdminDashboard />
    </div>
  );
}
