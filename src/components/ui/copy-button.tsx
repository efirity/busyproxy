import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, Copy, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopy } from "@/hooks/use-copy";

type CopySize = "icon" | "sm" | "md";

export type CopyButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "children"
> & {
  /** Text written to the clipboard */
  text: string;
  /** Optional label when idle (e.g. "Copy HTTP URI"). Hidden for size=icon unless set. */
  label?: string;
  /** Label while flashing (default "Copied") */
  copiedLabel?: string;
  size?: CopySize;
  /** Async prep before copy (e.g. fetch URI then copy). Return string to copy. */
  getText?: () => Promise<string | null | undefined>;
  className?: string;
  onCopied?: () => void;
  /** Show a floating “Copied!” chip above the control */
  showBurst?: boolean;
  /** Idle icon (default Copy) */
  icon?: LucideIcon;
  children?: ReactNode;
};

/**
 * Universal copy control with clear “it worked” feedback:
 * icon swap → check, green flash, scale pop, optional “Copied!” burst.
 */
export function CopyButton({
  text,
  label,
  copiedLabel = "Copied",
  size = "icon",
  getText,
  className,
  onCopied,
  showBurst = true,
  icon: IdleIcon = Copy,
  disabled,
  title,
  ...rest
}: CopyButtonProps) {
  const { copied, copy } = useCopy(1600);
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || busy) return;
    let value = text;
    if (getText) {
      setBusy(true);
      try {
        const next = await getText();
        if (next == null || next === "") {
          setBusy(false);
          return;
        }
        value = next;
      } catch {
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const ok = await copy(value);
    if (ok) onCopied?.();
  };

  const isIcon = size === "icon";
  const showTextLabel = size !== "icon" || Boolean(label);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || busy || (!text && !getText)}
        title={copied ? copiedLabel : title || label || "Copy"}
        aria-label={copied ? copiedLabel : title || label || "Copy"}
        onClick={(e) => void handleClick(e)}
        className={cn(
          "group relative inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "disabled:pointer-events-none disabled:opacity-45",
          isIcon && !label && "h-8 w-8 p-0",
          isIcon && label && "h-8 px-2 text-[11px]",
          size === "sm" && "h-8 px-2.5 text-[11px]",
          size === "md" && "h-9 px-3 text-xs",
          copied
            ? "copy-btn-success border-success/50 bg-success/15 text-success shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
            : "border-border bg-surface-2 text-fg-muted hover:border-border-strong hover:bg-surface-3 hover:text-fg",
          className,
        )}
        {...rest}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center",
            copied && "copy-icon-pop",
          )}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copied ? (
            <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
          ) : (
            <IdleIcon className="h-3.5 w-3.5" />
          )}
        </span>
        {showTextLabel && (
          <span className={cn(copied && "font-semibold")}>
            {copied ? copiedLabel : label || "Copy"}
          </span>
        )}
        {copied && (
          <span
            aria-hidden
            className="copy-ripple pointer-events-none absolute inset-0 rounded-[inherit]"
          />
        )}
      </button>

      {showBurst && copied && (
        <span
          role="status"
          aria-live="polite"
          className="copy-burst pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-success/40 bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success shadow-lg"
        >
          Copied!
        </span>
      )}
    </span>
  );
}

/**
 * Label + mono value + animated copy control (admin / dashboard rows).
 */
export function CopyField({
  label,
  value,
  className,
  monoClassName,
}: {
  label: string;
  value: string;
  className?: string;
  monoClassName?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase text-fg-subtle">{label}</p>
        <p className={cn("break-all font-mono text-xs text-fg", monoClassName)}>
          {value}
        </p>
      </div>
      <CopyButton text={value} size="icon" title={`Copy ${label}`} />
    </div>
  );
}
