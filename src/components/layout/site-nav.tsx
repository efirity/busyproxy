import { Link, useRouterState } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

const links = [
  { to: "/", label: "Product" },
  { to: "/app", label: "Mobile app" },
  { to: "/dashboard", label: "User dashboard" },
  { to: "/admin", label: "Admin" },
  { to: "/design", label: "Design system" },
  { to: "/docs", label: "Specs" },
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
          Relay
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition",
                pathname === l.to
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link to="/app">
            <Button size="sm">Open app</Button>
          </Link>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-t border-border/60 px-3 py-2 md:hidden">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs",
              pathname === l.to
                ? "bg-surface text-fg"
                : "text-fg-muted",
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
