import type { ReactNode } from "react";
import { SiteNav } from "./site-nav";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteNav />
      {children}
    </div>
  );
}
