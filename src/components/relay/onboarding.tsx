import { useState } from "react";
import { ArrowRight, Lock, Radio, ShieldCheck, Smartphone } from "lucide-react";
import { useRelayStore } from "@/store/relay-store";
import { cn } from "@/lib/utils";

const pages = [
  {
    icon: Smartphone,
    title: "Turn this phone into your personal proxy",
    body: "Relay starts a secure HTTP and SOCKS5 proxy on the device. Traffic you allow exits through this phone’s network and IP.",
  },
  {
    icon: ShieldCheck,
    title: "Safe by default",
    body: "Password authentication is always on. You control start and stop. Only share credentials with people you trust.",
  },
  {
    icon: Radio,
    title: "Local, Wi‑Fi, or remote",
    body: "Same Wi‑Fi works out of the box. Mobile data needs a tunnel for internet reachability — Relay is honest about that.",
  },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const completeOnboarding = useRelayStore((s) => s.completeOnboarding);
  const page = pages[step];
  const Icon = page.icon;
  const last = step === pages.length - 1;

  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Lock className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Relay</span>
        </div>
        {!last && (
          <button
            type="button"
            onClick={completeOnboarding}
            className="text-sm text-fg-muted hover:text-fg"
          >
            Skip
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          key={step}
          className="slide-up flex w-full flex-col items-center"
        >
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-surface shadow-inner">
            <Icon className="h-10 w-10 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="max-w-[18ch] text-[1.65rem] font-semibold leading-tight tracking-tight text-fg">
            {page.title}
          </h1>
          <p className="mt-4 max-w-[32ch] text-[15px] leading-relaxed text-fg-muted">
            {page.body}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-center gap-1.5">
          {pages.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border-strong",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? completeOnboarding() : setStep((s) => s + 1))}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-fg transition active:scale-[0.98]"
        >
          {last ? "Generate secure password & start" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-center text-xs leading-relaxed text-fg-subtle">
          You are responsible for how the proxy is used. Mobile data may incur carrier charges.
        </p>
      </div>
    </div>
  );
}
