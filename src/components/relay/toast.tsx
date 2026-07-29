import { useEffect } from "react";
import { useRelayStore } from "@/store/relay-store";

export function ToastHost() {
  const toast = useRelayStore((s) => s.toast);
  const setToast = useRelayStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="fade-in rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-fg shadow-lg">
        {toast}
      </div>
    </div>
  );
}
