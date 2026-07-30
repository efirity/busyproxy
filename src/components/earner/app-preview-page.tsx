import { Link } from "@tanstack/react-router";
import {
  Bell,
  Lock,
  Radio,
  Shield,
  Smartphone,
  Wallet,
  Wifi,
  Signal,
} from "lucide-react";
import { Badge, Button, SectionLabel } from "@/components/ui/primitives";
import { PRICING, moneyFromCents } from "@/data/pricing";
import { cn } from "@/lib/utils";

/** Real Android screenshots captured on Pixel 4a / OnePlus (not mock UI). */
// Cache-bust after cropping system chrome / cut-off headers
const V = "v3";
const SHOTS = [
  {
    src: `/app/00-consent.png?${V}`,
    title: "Consent",
    caption: "Clear rules before sharing — you start/stop, pick network, no proxy secrets on-device.",
  },
  {
    src: `/app/01-login.png?${V}`,
    title: "Phone OTP",
    caption: "Sign in with SMS one-time code (Twilio). Same account as the web dashboard.",
  },
  {
    src: `/app/02-home.png?${V}`,
    title: "Home · rates",
    caption: `Live rates: Wi‑Fi ${PRICING.headlineRateLabel}, mobile ${PRICING.mobileRateLabel}. Min withdraw ${moneyFromCents(PRICING.minWithdrawCents)}.`,
  },
  {
    src: `/app/03-sharing.png?${V}`,
    title: "Sharing on",
    caption: "Network modes (Wi‑Fi only / Mobile only / prefer). Agent online with real egress IP.",
  },
  {
    src: `/app/04-agent-traffic.png?${V}`,
    title: "Agent + traffic",
    caption: "Session bytes, streams, tunnel_open — real reverse tunnel, not a demo spinner.",
  },
  {
    src: `/app/05-oneplus-sharing.png?${V}`,
    title: "OnePlus build",
    caption: "Same debug APK on Pixel 4a and OnePlus — production-shaped Compose client.",
  },
] as const;

const FEATURES = [
  {
    icon: Smartphone,
    title: "Android agent (real)",
    body: "Kotlin + Jetpack Compose client: OTP login, foreground service, reverse WSS tunnel to BusyProxy edge.",
  },
  {
    icon: Wifi,
    title: "Wi‑Fi & mobile modes",
    body: "Wi‑Fi only, mobile only, prefer Wi‑Fi, prefer mobile — no silent fallback in “only” modes.",
  },
  {
    icon: Radio,
    title: "You never see proxy URLs",
    body: "Operators connect via gate.busyproxy.net. Your phone only shows agent state, IP, and session bytes.",
  },
  {
    icon: Signal,
    title: "Live agent status",
    body: "online / offline, egress IP, streams, session MB, tunnel_open — what the edge fleet sees.",
  },
  {
    icon: Wallet,
    title: "Stripe cash-out",
    body: `Withdraw available balance from ${moneyFromCents(PRICING.minWithdrawCents)}. Same phone account on /dashboard.`,
  },
  {
    icon: Bell,
    title: "Persistent notification",
    body: "While sharing is on, Android keeps a clear notification so you always know bandwidth is shared.",
  },
  {
    icon: Lock,
    title: "You control start / stop",
    body: "Sharing is explicit. Stop anytime. Consent screen explains what traffic routing means.",
  },
  {
    icon: Shield,
    title: "Beta today",
    body: "Install via APK / ADB for invited testers. Public Play Store release comes after fleet hardening.",
  },
] as const;

function PhoneFrame({
  src,
  title,
  caption,
  featured,
}: {
  src: string;
  title: string;
  caption: string;
  featured?: boolean;
}) {
  return (
    <figure className={cn("flex flex-col", featured && "md:col-span-1")}>
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-[1.75rem] border border-border bg-black shadow-2xl shadow-black/40",
          featured ? "max-w-[280px]" : "max-w-[220px]",
        )}
      >
        <div className="absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-black/50 to-transparent" />
        <img
          src={src}
          alt={`BusyProxy Android — ${title}`}
          className="block h-auto w-full"
          loading="lazy"
        />
      </div>
      <figcaption className="mx-auto mt-3 max-w-[240px] text-center">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">{caption}</p>
      </figcaption>
    </figure>
  );
}

export function AppPreviewPage() {
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
          <div>
            <SectionLabel>Earner mobile app</SectionLabel>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              The real Android client — not a demo mock
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted">
              BusyProxy earners run a native Android app: phone OTP, share Wi‑Fi or
              mobile data, see live agent status, and cash out with Stripe. Screens
              below are{" "}
              <strong className="font-medium text-fg">
                actual device captures
              </strong>{" "}
              from Pixel 4a and OnePlus running the build we ship today.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="success">Android · Compose</Badge>
              <Badge tone="primary">Reverse tunnel</Badge>
              <Badge tone="neutral">OTP · Twilio</Badge>
              <Badge tone="neutral">Stripe withdraw</Badge>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-fg-muted">
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Rates:{" "}
                <span className="text-fg">
                  {PRICING.headlineRateLabel} Wi‑Fi · {PRICING.mobileRateLabel}{" "}
                  mobile
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Min withdraw{" "}
                <span className="text-fg">
                  {moneyFromCents(PRICING.minWithdrawCents)}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Edge exits via your phone IP — operators use the gate, not your device UI
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard">
                <Button>Open web dashboard</Button>
              </Link>
              <a href="#screens">
                <Button variant="secondary">See app screens</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-fg-subtle">
              Public Play Store listing is not live yet. Testers install the beta APK
              (same UI as these screenshots).
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -inset-8 rounded-full bg-primary/10 blur-3xl" />
            <PhoneFrame
              src={`/app/04-agent-traffic.png?${V}`}
              title="Live sharing"
              caption="Pixel 4a · sharing on · tunnel open · session traffic"
              featured
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionLabel>How earning works</SectionLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Three steps on your phone
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Sign in",
              d: "Enter your phone number, get an SMS code, you’re in. No passwords to remember.",
            },
            {
              n: "02",
              t: "Start sharing",
              d: "Pick Wi‑Fi / mobile policy and tap Start. A notification stays while you’re earning.",
            },
            {
              n: "03",
              t: "Get paid",
              d: "Balance updates from shared GB. Withdraw to bank via Stripe from the min amount.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <p className="font-mono text-xs text-primary">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshots gallery */}
      <section
        id="screens"
        className="border-y border-border/60 bg-bg-elevated/40 py-14"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionLabel>App design · real devices</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Screens from the shipping Android build
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            Captured on Pixel 4a (sunfish) and OnePlus during end-to-end tests —
            consent, OTP, home rates, sharing controls, and live agent status with
            real egress IP and session bytes.
          </p>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {SHOTS.map((s) => (
              <PhoneFrame key={s.src} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionLabel>What’s in the app</SectionLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Built for earners, not for operators
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent status callout */}
      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-10">
              <SectionLabel>Agent status panel</SectionLabel>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                Transparency without complexity
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                When sharing is on you see the same truth the edge fleet uses:
                connection state, public egress IP, active streams, and session
                volume. No proxy hostnames or passwords on the earner phone.
              </p>
              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["State", "online / offline / reconnecting"],
                  ["Egress IP", "Your carrier or ISP public IP"],
                  ["Streams", "Active tunnel streams"],
                  ["Session bytes", "Bytes this share session"],
                  ["Tunnel", "tunnel_open when reverse path is live"],
                  ["Network mode", "Wi‑Fi / mobile policy you chose"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border/70 bg-bg px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-fg-subtle">
                      {k}
                    </dt>
                    <dd className="mt-0.5 text-fg-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex items-center justify-center bg-bg/60 p-8">
              <PhoneFrame
                src={`/app/04-agent-traffic.png?${V}`}
                title="Agent status"
                caption="online · egress IP · 72+ MB session · tunnel_open"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="rounded-3xl border border-primary/25 bg-primary/5 px-6 py-10 text-center sm:px-10">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Ready to earn on the web today
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">
            Use the same phone OTP on the web dashboard while we roll the Android
            beta to more devices. Admin operators manage fleet and payouts
            separately.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard">
              <Button>Sign in · dashboard</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Back to home</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
