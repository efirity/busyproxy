import { Link, useRouterState } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

/** Public marketing nav only — no admin / design / internal specs. */
const links = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pay rates" },
  { href: "/#earnings", label: "Estimator" },
  { href: "/app", label: "App" },
] as const;

export function SiteNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Radio className="h-4 w-4" />
          </span>
          BusyProxy
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => {
            const pathOnly = l.href.split("#")[0] || "/";
            const active =
              pathOnly === "/app"
                ? pathname.startsWith("/app")
                : pathname === "/" && (l.href === "/" || l.href.startsWith("/#"));
            return (
              <a
                key={l.label}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  active && l.href === "/"
                    ? "bg-surface text-fg"
                    : pathname.startsWith("/app") && l.href === "/app"
                      ? "bg-surface text-fg"
                      : "text-fg-muted hover:text-fg",
                )}
              >
                {l.label}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link to="/app">
            <Button size="sm">Start earning</Button>
          </Link>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-t border-border/60 px-3 py-2 md:hidden">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="shrink-0 rounded-full px-3 py-1 text-xs text-fg-muted"
          >
            {l.label}
          </a>
        ))}
      </div>
    </header>
  );
}
