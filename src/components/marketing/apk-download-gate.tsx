import { useState, type ReactNode } from "react";
import { Download, KeyRound, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { APP_DOWNLOAD } from "@/data/app-download";
import { cn } from "@/lib/utils";

type VerifyOk = {
  ok: true;
  downloadUrl: string;
  sha256Url: string;
  fileName: string;
  available: boolean;
};

/**
 * Promo-code gate for the beta APK. Server validates the code;
 * without it the binary is not downloadable.
 */
export function ApkDownloadGate({
  size = "lg",
  className,
  showChecksum = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  showChecksum?: boolean;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<VerifyOk | null>(null);

  const verify = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/download/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | VerifyOk
        | { ok?: false; error?: string };
      if (!res.ok || !("ok" in data) || !data.ok) {
        setUnlocked(null);
        setErr(
          (data as { error?: string }).error ||
            "Invalid promo code. Ask for the invite code to download.",
        );
        return;
      }
      if (!data.available) {
        setErr("APK is not on the server yet — try again later.");
        setUnlocked(null);
        return;
      }
      setUnlocked(data);
    } catch (e) {
      setUnlocked(null);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md space-y-3", className)}>
      {!unlocked ? (
        <>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
            <Lock className="h-3.5 w-3.5 text-primary" />
            Promo code required
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="apk-promo-code">
              Promo code
            </label>
            <div className="relative min-w-0 flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                id="apk-promo-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter promo code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void verify();
                }}
                className={cn(
                  "h-11 w-full rounded-xl border border-border bg-bg px-3 pl-10 font-mono text-sm text-fg",
                  "placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
                )}
              />
            </div>
            <Button
              type="button"
              size={size === "sm" ? "sm" : "lg"}
              disabled={busy || !code.trim()}
              onClick={() => void verify()}
              className="shrink-0"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
              Unlock
            </Button>
          </div>
          {err && (
            <p className="text-sm text-danger" role="alert">
              {err}
            </p>
          )}
          <p className="text-xs text-fg-subtle">
            The beta APK is invite-only. Enter the promo code you received, then
            download.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-success">
            <Unlock className="h-3.5 w-3.5" />
            Code accepted
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={unlocked.downloadUrl} download={unlocked.fileName}>
              <Button size={size === "sm" ? "sm" : "lg"}>
                <Download className="h-4 w-4" />
                Download Android APK
              </Button>
            </a>
            {showChecksum && (
              <a
                href={unlocked.sha256Url}
                className="inline-flex items-center text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
              >
                SHA-256 checksum
              </a>
            )}
          </div>
          <p className="font-mono text-[11px] text-fg-subtle">
            {unlocked.fileName}
            {APP_DOWNLOAD.versionLabel
              ? ` · ${APP_DOWNLOAD.versionLabel}`
              : ""}
          </p>
          <button
            type="button"
            className="text-xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
            onClick={() => {
              setUnlocked(null);
              setCode("");
            }}
          >
            Use a different code
          </button>
        </>
      )}
    </div>
  );
}

/** Hero / compact CTA: scrolls to download gate instead of open APK URL. */
export function ApkDownloadCtaLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={`#${APP_DOWNLOAD.sectionId}`} className={className}>
      {children}
    </a>
  );
}
