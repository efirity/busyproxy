import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PhoneShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-bg p-0 sm:p-6 md:p-10">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-success/5 blur-[90px]" />
      </div>

      <div className="relative z-10 w-full max-w-[430px] sm:max-w-[390px]">
        {/* Desktop branding */}
        <div className="mb-4 hidden sm:flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-fg-subtle">
              Relay
            </p>
            <p className="text-sm text-fg-muted">Phone proxy — live demo</p>
          </div>
          <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted">
            Android preview
          </div>
        </div>

        <div
          className={cn(
            "relative mx-auto flex h-dvh w-full flex-col overflow-hidden bg-bg sm:h-[min(844px,calc(100dvh-6rem))] sm:rounded-phone sm:border sm:border-border-strong sm:phone-shadow",
            className,
          )}
        >
          {/* Status bar */}
          <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-1 text-[11px] font-medium text-fg-muted tabular">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-3.5 rounded-sm border border-fg-muted/70">
                <span className="block h-full w-2/3 bg-fg-muted/70" />
              </span>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}
