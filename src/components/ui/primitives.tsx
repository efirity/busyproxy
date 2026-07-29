import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-[15px]",
        variant === "primary" && "bg-primary text-primary-fg hover:bg-primary/90",
        variant === "secondary" &&
          "border border-border bg-surface-2 text-fg hover:bg-surface-3",
        variant === "ghost" && "text-fg-muted hover:bg-surface hover:text-fg",
        variant === "danger" && "bg-danger text-white hover:bg-danger/90",
        variant === "success" && "bg-success text-white hover:bg-success/90",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4", className)}>
      {children}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        tone === "neutral" && "bg-surface-3 text-fg-muted",
        tone === "success" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "primary" && "bg-primary-soft text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
      {children}
    </p>
  );
}

export function Money({
  cents,
  className,
  size = "md",
}: {
  cents: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const value = `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;
  return (
    <span
      className={cn(
        "font-mono font-semibold tabular tracking-tight",
        size === "sm" && "text-sm",
        size === "md" && "text-lg",
        size === "lg" && "text-3xl",
        size === "xl" && "text-4xl",
        cents < 0 ? "text-danger" : "text-fg",
        className,
      )}
    >
      {value}
    </span>
  );
}

export function StatusDot({
  status,
}: {
  status: "offline" | "online" | "sharing" | "pending" | "banned";
}) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "sharing" && "bg-success status-pulse",
        status === "online" && "bg-primary",
        status === "offline" && "bg-fg-subtle",
        status === "pending" && "bg-warning",
        status === "banned" && "bg-danger",
      )}
    />
  );
}
