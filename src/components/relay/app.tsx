import { useEffect } from "react";
import { PhoneShell } from "./phone-shell";
import { Onboarding } from "./onboarding";
import { BottomNav } from "./bottom-nav";
import { HomeScreen } from "./home-screen";
import { ActivityScreen } from "./activity-screen";
import { SettingsScreen } from "./settings-screen";
import { ToastHost } from "./toast";
import { useRelayStore } from "@/store/relay-store";

export function RelayApp() {
  const onboarded = useRelayStore((s) => s.onboarded);
  const tab = useRelayStore((s) => s.tab);
  const status = useRelayStore((s) => s.status);
  const engineLive = useRelayStore((s) => s.engineLive);
  const hydrateFromEngine = useRelayStore((s) => s.hydrateFromEngine);
  const setEngineLive = useRelayStore((s) => s.setEngineLive);
  const setNetworkInfo = useRelayStore((s) => s.setNetworkInfo);

  // Probe real engine + poll while running
  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        const res = await fetch("/api/proxy/status");
        if (!res.ok) throw new Error("no engine");
        const data = await res.json();
        if (cancelled) return;
        setEngineLive(true);
        hydrateFromEngine(data);
        if (data.localIp || data.publicIp) {
          setNetworkInfo({
            localIp: data.localIp,
            publicIp: data.publicIp,
            networkType: "wifi",
          });
        }
      } catch {
        if (!cancelled) setEngineLive(false);
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromEngine, setEngineLive, setNetworkInfo]);

  useEffect(() => {
    if (!engineLive || status !== "running") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/proxy/status");
        if (!res.ok) return;
        const data = await res.json();
        hydrateFromEngine(data);
      } catch {
        /* keep UI */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [engineLive, status, hydrateFromEngine]);

  // Fetch public IP for demo when no engine
  useEffect(() => {
    if (engineLive) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ip) setNetworkInfo({ publicIp: data.ip });
      } catch {
        if (!cancelled) setNetworkInfo({ publicIp: "85.132.44.18" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engineLive, setNetworkInfo]);

  return (
    <PhoneShell>
      {!onboarded ? (
        <Onboarding />
      ) : (
        <>
          {tab === "home" && <HomeScreen />}
          {tab === "activity" && <ActivityScreen />}
          {tab === "settings" && <SettingsScreen />}
          <BottomNav />
        </>
      )}
      <ToastHost />
    </PhoneShell>
  );
}
