/** Host helpers for multi-domain routing (busyproxy.net / admin / portal). */

import { redirect } from "@tanstack/react-router";

export function getHostname(): string {
  if (typeof window !== "undefined") {
    return window.location.hostname.toLowerCase();
  }
  return "";
}

/** Dedicated operator admin host: admin.busyproxy.net */
export function isAdminHost(host = getHostname()): boolean {
  const h = host.toLowerCase();
  return (
    h === "admin.busyproxy.net" ||
    h === "admin.localhost" ||
    h.startsWith("admin.")
  );
}

/** Legacy operator host: portal.busyproxy.net (still supported). */
export function isPortalHost(host = getHostname()): boolean {
  const h = host.toLowerCase();
  return (
    h === "portal.busyproxy.net" ||
    h === "portal.localhost" ||
    h.startsWith("portal.")
  );
}

/** Any host that must only show the operator admin console. */
export function isOperatorHost(host = getHostname()): boolean {
  return isAdminHost(host) || isPortalHost(host);
}

export function isMarketingHost(host = getHostname()): boolean {
  return !isOperatorHost(host);
}

/** Path for the admin console on this host (`/` on admin.*, `/portal` elsewhere). */
export function operatorHomePath(host = getHostname()): "/" | "/portal" {
  return isAdminHost(host) ? "/" : "/portal";
}

/**
 * Earner/marketing routes are forbidden on admin/portal hosts.
 * Bounce to the operator console.
 */
export function assertOperatorHostOnly() {
  if (typeof window === "undefined") return;
  if (isOperatorHost()) {
    throw redirect({ to: operatorHomePath() });
  }
}

/** @deprecated use assertOperatorHostOnly */
export function assertPortalIsAdminOnly() {
  assertOperatorHostOnly();
}
