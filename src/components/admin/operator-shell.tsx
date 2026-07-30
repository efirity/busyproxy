import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Outlet } from "@tanstack/react-router";
import { Loader2, LogOut, Shield } from "lucide-react";
import { OtpLogin } from "@/components/auth/otp-login";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/primitives";
import {
  type AuthUser,
  clearSession,
  fetchSession,
  formatPhoneShort,
  getStoredUser,
  logout,
} from "@/lib/auth-client";
import { getHostname, isAdminHost } from "@/lib/host";

type OperatorCtx = {
  user: AuthUser | null;
  onLogout: () => void;
};

const OperatorContext = createContext<OperatorCtx | null>(null);

export function useOperatorSession() {
  return useContext(OperatorContext);
}

/**
 * Full-screen operator console shell (auth gate + chrome).
 * Section pages render via <Outlet /> at /portal/:section.
 */
export function OperatorShell({ children }: { children?: ReactNode }) {
  const host =
    typeof window !== "undefined" ? getHostname() : "admin.busyproxy.net";
  const label = isAdminHost(host)
    ? "admin.busyproxy.net · operator only"
    : host.startsWith("portal.")
      ? "portal.busyproxy.net · operator only"
      : "busyproxy.net/portal · operator only";

  const [phase, setPhase] = useState<"loading" | "login" | "denied" | "ready">(
    "loading",
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  const resolve = useCallback(async () => {
    setPhase("loading");
    const cached = getStoredUser();
    try {
      const session = await fetchSession();
      const u = session?.user || null;
      if (!u) {
        setUser(null);
        setPhase("login");
        return;
      }
      setUser(u);
      if (!u.isAdmin) {
        setPhase("denied");
        return;
      }
      setPhase("ready");
    } catch {
      if (cached && !cached.isAdmin) {
        setUser(cached);
        setPhase("denied");
        return;
      }
      clearSession();
      setUser(null);
      setPhase("login");
    }
  }, []);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  const onLogin = (u: AuthUser) => {
    setUser(u);
    if (!u.isAdmin) {
      setPhase("denied");
      return;
    }
    setPhase("ready");
  };

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      clearSession();
      setUser(null);
      setPhase("login");
    }
  };

  const ctx = useMemo(
    () => ({
      user,
      onLogout: () => void onLogout(),
    }),
    [user],
  );

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size="sm" />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Admin
            </span>
            <p className="hidden truncate text-xs text-fg-muted md:block">
              {label}
            </p>
          </div>

          {(phase === "ready" || phase === "denied") && user && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-[10px] uppercase tracking-wide text-fg-subtle">
                  Signed in
                </p>
                <p className="font-mono text-xs text-fg">
                  {user.phone || formatPhoneShort(user.phone)}
                </p>
              </div>
              <span className="font-mono text-xs text-fg-muted sm:hidden">
                {formatPhoneShort(user.phone)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border-border"
                onClick={() => void onLogout()}
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </Button>
            </div>
          )}
        </div>
      </header>

      {phase === "loading" && (
        <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-fg-muted">Checking operator session…</p>
        </div>
      )}

      {phase === "login" && (
        <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-10 sm:py-16">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Operator sign-in
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              Same phone OTP as the earner app. Only admin-marked phones can
              open this console.
            </p>
          </div>
          <OtpLogin onSuccess={onLogin} variant="web" />
        </div>
      )}

      {phase === "denied" && (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Not an operator</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Signed in as{" "}
            <span className="font-mono text-fg">
              {user?.phone || "unknown"}
            </span>
            , but this number is not on the admin allowlist.
          </p>
          <div className="mt-6 flex justify-center">
            <Button type="button" onClick={() => void onLogout()}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      )}

      {phase === "ready" && (
        <OperatorContext.Provider value={ctx}>
          {children ?? <Outlet />}
        </OperatorContext.Provider>
      )}
    </div>
  );
}
