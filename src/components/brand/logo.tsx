import { cn } from "@/lib/utils";

/** Inline SVG mark — works everywhere without waiting on image load. */
export function BrandMark({
  className,
  title = "BusyProxy",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient
          id="bpMark"
          x1="10"
          y1="54"
          x2="54"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563EB" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect
        x="12"
        y="14"
        width="24"
        height="38"
        rx="4"
        stroke="url(#bpMark)"
        strokeWidth="3.2"
      />
      <path
        d="M20 46.5h8"
        stroke="url(#bpMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M40 22c4.5 3 7.5 7.5 7.5 12.5S44.5 44 40 47"
        stroke="url(#bpMark)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M44.5 18c6 4.2 10 10.2 10 16.5S50.5 47 44.5 51.2"
        stroke="url(#bpMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="36" cy="34" r="5.5" stroke="url(#bpMark)" strokeWidth="2.6" />
      <circle cx="36" cy="34" r="2" fill="url(#bpMark)" />
      <path
        d="M41 34h10.5M47.5 29.5 53 34l-5.5 4.5"
        stroke="url(#bpMark)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** App icon image (PNG) for places that need a raster (PWA, splash, etc.). */
export function BrandIcon({
  size = 32,
  className,
  alt = "BusyProxy",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src="/brand/icon-192.png"
      width={size}
      height={size}
      alt={alt}
      className={cn("rounded-lg object-cover", className)}
      decoding="async"
    />
  );
}

/** Logo lockup: mark + wordmark */
export function BrandLogo({
  className,
  markClassName,
  showWordmark = true,
  size = "md",
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const mark =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const text =
    size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary/10 p-1",
          mark,
          markClassName,
        )}
      >
        <BrandMark className="h-full w-full" />
      </span>
      {showWordmark && <span className={text}>BusyProxy</span>}
    </span>
  );
}
