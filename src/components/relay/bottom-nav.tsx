import { Activity, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRelayStore, type TabId } from "@/store/relay-store";

const items: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const tab = useRelayStore((s) => s.tab);
  const setTab = useRelayStore((s) => s.setTab);

  return (
    <nav className="shrink-0 border-t border-border bg-bg-elevated/95 backdrop-blur-md px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <div className="grid grid-cols-3 gap-1">
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-[11px] font-medium transition-colors duration-150",
                active ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
              )}
            >
              <Icon
                className={cn("h-5 w-5", active ? "text-primary" : "text-current")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
