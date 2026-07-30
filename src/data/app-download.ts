/**
 * Android install target for the public website.
 *
 * Until Google Play is approved, earners download the beta APK from this site.
 * When Play is live, flip `channel` to `"play"` — nav, hero, and Download section
 * all follow this single switch.
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
  /** Public HTTPS path (served from `public/downloads/`) */
  apkPath: "/downloads/BusyProxy-latest-debug.apk",
  apkFileName: "BusyProxy-latest-debug.apk",
  sha256Path: "/downloads/BusyProxy-latest-debug.apk.sha256",
  /** Placeholder until listing is public — update URL when approved */
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=net.busyproxy.app",
  /** Anchor used on the marketing home page */
  sectionId: "download",
} as const;

export function appDownloadHref(): string {
  return APP_DOWNLOAD_CHANNEL === "play"
    ? APP_DOWNLOAD.playStoreUrl
    : APP_DOWNLOAD.apkPath;
}

export function appDownloadCtaLabel(): string {
  return APP_DOWNLOAD_CHANNEL === "play"
    ? "Get it on Google Play"
    : "Download Android APK";
}

export function appDownloadIsApk(): boolean {
  return APP_DOWNLOAD_CHANNEL === "apk";
}
