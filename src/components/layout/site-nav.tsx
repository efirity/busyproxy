import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LogOut, Radio, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { useAuthSession } from "@/hooks/use-auth-session";
import { formatPhoneShort } from "@/lib/auth-client";

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
  const { user, isLoggedIn, ready, busy, logout } = useAuthSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const label =
    user?.displayName?.trim() || formatPhoneShort(user?.phone) || "Account";

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
          {!ready ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-surface" aria-hidden />
          ) : isLoggedIn ? (
            <>
              <Link to="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm transition hover:border-border-strong",
                    menuOpen && "border-primary/40",
                  )}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserRound className="h-3.5 w-3.5" />
                  </span>
                  <span className="hidden max-w-[9rem] truncate font-medium sm:inline">
                    {label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-fg-muted transition",
                      menuOpen && "rotate-180",
                    )}
                  />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-lg"
                  >
                    <div className="border-b border-border px-3 py-2.5">
                      <p className="text-xs text-fg-subtle">Signed in</p>
                      <p className="truncate text-sm font-medium">{label}</p>
                      {user?.phone && (
                        <p className="truncate font-mono text-[11px] text-fg-muted">
                          {user.phone}
                        </p>
                      )}
                    </div>
                    <div className="p-1">
                      <Link
                        to="/dashboard"
                        role="menuitem"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface"
                        onClick={() => setMenuOpen(false)}
                      >
                        <UserRound className="h-4 w-4 text-fg-muted" />
                        Account & dashboard
                      </Link>
                      <Link
                        to="/app"
                        role="menuitem"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface"
                        onClick={() => setMenuOpen(false)}
                      >
                        Open app
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft/40"
                        onClick={() => {
                          setMenuOpen(false);
                          void logout();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link to="/app">
                <Button size="sm">Start earning</Button>
              </Link>
            </>
          )}
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
        {isLoggedIn && (
          <Link
            to="/dashboard"
            className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs text-fg"
          >
            Account
          </Link>
        )}
      </div>
    </header>
  );
}
