/** Host helpers for multi-domain routing (busyproxy.net / portal.busyproxy.net). */

export function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.toLowerCase();
}

export function isPortalHost(host = getHostname()): boolean {
  return (
    host === "portal.busyproxy.net" ||
    host === "portal.localhost" ||
    host.startsWith("portal.")
  );
}

export function isMarketingHost(host = getHostname()): boolean {
  return !isPortalHost(host);
}
