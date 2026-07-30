/**
 * Android install target for the public website.
 *
 * Until Google Play is approved, earners download the beta APK from this site.
 * When Play is live, flip `channel` to `"play"` — nav, hero, and Download section
 * all follow this single switch.
 *
 * APK is promo-code gated (server: APK_PROMO_CODE, default 5409).
 * Direct /downloads/*.apk is blocked without a valid code.
 */
export type AppDownloadChannel = "apk" | "play";

/**
 * ← flip to `"play"` after Play Store approval.
 * Keep the type annotation so TS allows both branches.
 */
export const APP_DOWNLOAD_CHANNEL: AppDownloadChannel = "apk";

export const APP_DOWNLOAD = {
  get channel(): AppDownloadChannel {
    return APP_DOWNLOAD_CHANNEL;
  },
  /** Package id for Play Store listing */
  packageId: "net.busyproxy.app",
  versionLabel: "0.1.0-beta",
  /**
   * Gated download API (requires promo code query).
   * Prefer the Download section UI over linking this raw.
   */
  apkPath: "/api/download/apk",
  apkFileName: "BusyProxy-latest-debug.apk",
  sha256Path: "/api/download/apk-sha256",
  /** Static path is blocked without ?code= — do not advertise open. */
  apkStaticPath: "/downloads/BusyProxy-latest-debug.apk",
  /** Placeholder until listing is public — update URL when approved */
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=net.busyproxy.app",
  /** Anchor used on the marketing home page */
  sectionId: "download",
  /** Promo code is validated server-side only (never trust client). */
  promoRequired: true as boolean,
} as const;

/**
 * Download CTA target.
 * - Play: store listing
 * - APK: always the home-page promo gate (`/#download`) so links work from
 *   `/app`, footer, hero, etc. — not a relative `#download` (no-op off home).
 */
export function appDownloadHref(): string {
  return APP_DOWNLOAD_CHANNEL === "play"
    ? APP_DOWNLOAD.playStoreUrl
    : `/#${APP_DOWNLOAD.sectionId}`;
}

export function appDownloadCtaLabel(): string {
  return APP_DOWNLOAD_CHANNEL === "play"
    ? "Get it on Google Play"
    : "Download Android APK";
}

export function appDownloadIsApk(): boolean {
  return APP_DOWNLOAD_CHANNEL === "apk";
}
