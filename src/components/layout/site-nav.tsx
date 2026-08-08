import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  LogOut,
  Menu,
  UserRound,
  X,
  Home,
  Sparkles,
  Download,
  CircleDollarSign,
  Calculator,
  Smartphone,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { useAuthSession } from "@/hooks/use-auth-session";
import { formatPhoneShort } from "@/lib/auth-client";

/** Public marketing nav only — no admin / design / internal specs. */
const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/#how-it-works", label: "How it works", icon: Sparkles },
  { href: "/#download", label: "Download", icon: Download },
  { href: "/#pricing", label: "Pay rates", icon: CircleDollarSign },
  { href: "/#earnings", label: "Estimator", icon: Calculator },
  { href: "/app", label: "App", icon: Smartphone },
  { href: "/status", label: "Status", icon: Activity },
] as const;

function navLinkActive(href: string, pathname: string, hash: string): boolean {
  const [pathOnly, linkHash] = href.split("#");
  const path = pathOnly || "/";
  if (path === "/app") return pathname.startsWith("/app");
  if (path === "/status") return pathname.startsWith("/status");
  if (path === "/" && linkHash) {
    return pathname === "/" && (hash === `#${linkHash}` || hash === linkHash);
  }
  if (path === "/" && !linkHash) {
    return pathname === "/" && !hash;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function SiteNav() {
  const { pathname, hash } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      hash: s.location.hash || "",
    }),
  });
  const { user, isLoggedIn, ready, busy, logout } = useAuthSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientHash, setClientHash] = useState(hash);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClientHash(hash || window.location.hash || "");
    const onHash = () => setClientHash(window.location.hash || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [hash]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [accountOpen]);

  // Lock body scroll while mobile menu is open; close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  // Close drawer on route change (pathname only — hash handled by link click).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const label =
    user?.displayName?.trim() || formatPhoneShort(user?.phone) || "Account";
  const activeHash = clientHash.startsWith("#")
    ? clientHash
    : clientHash
      ? `#${clientHash}`
      : "";

  const goTo = (href: string) => {
    const h = href.includes("#") ? `#${href.split("#")[1]}` : "";
    if (h) setClientHash(h);
    else if (href === "/") setClientHash("");
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center" onClick={() => setMobileOpen(false)}>
          <BrandLogo size="md" />
        </Link>

        {/* Desktop primary nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => {
            const active = navLinkActive(l.href, pathname, activeHash);
            return (
              <a
                key={l.label}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "text-fg-muted hover:bg-surface hover:text-fg",
                )}
              >
                {l.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {!ready ? (
            <div
              className="h-8 w-20 animate-pulse rounded-full bg-surface sm:w-24"
              aria-hidden
            />
          ) : isLoggedIn ? (
            <>
              <Link to="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1.5 text-sm transition hover:border-border-strong sm:px-2.5",
                    accountOpen && "border-primary/40",
                  )}
                  aria-expanded={accountOpen}
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
                      "hidden h-3.5 w-3.5 text-fg-muted transition sm:block",
                      accountOpen && "rotate-180",
                    )}
                  />
                </button>
                {accountOpen && (
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
                        onClick={() => setAccountOpen(false)}
                      >
                        <UserRound className="h-4 w-4 text-fg-muted" />
                        Account & dashboard
                      </Link>
                      <Link
                        to="/app"
                        role="menuitem"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface"
                        onClick={() => setAccountOpen(false)}
                      >
                        Open app
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft/40"
                        onClick={() => {
                          setAccountOpen(false);
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
              {/* Compact CTA always visible; full section list lives in the hamburger */}
              <Link to="/app">
                <Button size="sm" className="px-3 text-xs sm:px-4 sm:text-sm">
                  Start earning
                </Button>
              </Link>
            </>
          )}

          {/* Mobile hamburger — ClickUp-style drawer */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-fg transition hover:bg-surface-2 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-site-menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile full-screen drawer */}
      {mobileOpen && (
        <div
          id="mobile-site-menu"
          className="fixed inset-0 top-14 z-50 flex flex-col md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(100dvh-3.5rem,100%)] flex-col overflow-y-auto border-b border-border bg-bg-elevated shadow-2xl">
            <nav className="flex flex-col px-2 py-2" aria-label="Primary mobile">
              {links.map((l) => {
                const active = navLinkActive(l.href, pathname, activeHash);
                const Icon = l.icon;
                return (
                  <a
                    key={l.label}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => goTo(l.href)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] font-medium transition",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-fg hover:bg-surface",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-primary" : "text-fg-muted",
                      )}
                    />
                    <span className="flex-1">{l.label}</span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    )}
                  </a>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2 border-t border-border px-3 py-4">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl bg-surface px-3 py-3.5 text-[15px] font-medium text-fg"
                  >
                    <LayoutDashboard className="h-5 w-5 text-fg-muted" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-medium text-danger hover:bg-danger-soft/30"
                    onClick={() => {
                      setMobileOpen(false);
                      void logout();
                    }}
                  >
                    <LogOut className="h-5 w-5" />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="secondary" className="w-full" size="lg">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/app" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full" size="lg">
                      Start earning
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
