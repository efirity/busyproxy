import { useCallback, useEffect, useState } from "react";
import {
  AUTH_EVENT,
  clearSession,
  fetchSession,
  getStoredToken,
  getStoredUser,
  logout as apiLogout,
  type AuthUser,
} from "@/lib/auth-client";

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const stored = getStoredUser();
    const token = getStoredToken();
    if (!token || !stored) {
      setUser(null);
      setReady(true);
      return;
    }
    setUser(stored);
    setReady(true);
    // Validate with server in background
    const session = await fetchSession();
    setUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      setUser(getStoredUser());
    };
    window.addEventListener(AUTH_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AUTH_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await apiLogout();
      setUser(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const signOutLocal = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return {
    user,
    isLoggedIn: Boolean(user),
    ready,
    busy,
    refresh,
    logout,
    signOutLocal,
  };
}
