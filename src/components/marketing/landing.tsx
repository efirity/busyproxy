import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CircleDollarSign,
  Lock,
  Radio,
  Shield,
  Smartphone,
  Wifi,
  Zap,
  Calculator,
  BadgeCheck,
  Users,
} from "lucide-react";
import { Button, Card, Money, SectionLabel } from "@/components/ui/primitives";
import {
  PRICING,
  PRICING_FAQ,
  WHY_USERS_HAPPY,
  estimateMonthlyCents,
  moneyFromCents,
} from "@/data/pricing";
import { useAuthSession } from "@/hooks/use-auth-session";
import { formatPhoneShort } from "@/lib/auth-client";
import { BrandLogo } from "@/components/brand/logo";

export function LandingPage() {
  return (
    <div>
      <Hero />
      <SocialProofBar />
      <HowItWorks />
      <PricingSection />
      <EarningsCalculator />
      <SafetySection />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_55%)] opacity-[0.12]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted">
            <Wifi className="h-3.5 w-3.5 text-primary" />
            Residential bandwidth · paid per GB
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Share your connection.
            <span className="block text-primary">Get paid for it.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-fg-muted sm:text-lg">
            BusyProxy turns spare Wi‑Fi or mobile data into earnings.{" "}
            <strong className="font-medium text-fg">
              {moneyFromCents(PRICING.wifiCentsPerGb)}/GB on Wi‑Fi
            </strong>
            ,{" "}
            <strong className="font-medium text-fg">
              {moneyFromCents(PRICING.mobileCentsPerGb)}/GB on mobile
            </strong>
            . Verify your phone, leave sharing on, withdraw from{" "}
            {moneyFromCents(PRICING.minWithdrawCents)}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app">
              <Button size="lg">
                Start earning
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button size="lg" variant="secondary">
                See pay rates
              </Button>
            </a>
          </div>
          <ul className="mt-8 grid gap-2 text-sm text-fg-muted sm:grid-cols-2">
            {[
              "Phone OTP login — no password needed",
              "Wi‑Fi + mobile data both supported",
              "You control when sharing is on",
              "Stripe withdrawals from $20",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center lg:justify-end">
          <PhonePreview />
        </div>
      </div>
    </section>
  );
}

function SocialProofBar() {
  return (
    <div className="border-b border-border bg-bg-elevated">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 text-sm text-fg-muted sm:px-6">
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Built for earners who want simple cash for spare bandwidth
        </span>
        <span className="font-mono text-xs text-fg-subtle">
          Min payout {moneyFromCents(PRICING.minWithdrawCents)} · Stripe
        </span>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Smartphone,
      t: "1. Verify your phone",
      d: "OTP via SMS. One account per number — no complex signup.",
    },
    {
      icon: Wifi,
      t: "2. Turn sharing on",
      d: "Use Wi‑Fi at home or mobile data when you’re out. You choose.",
    },
    {
      icon: CircleDollarSign,
      t: "3. Get paid per GB",
      d: `Earn ${moneyFromCents(PRICING.wifiCentsPerGb)}/GB Wi‑Fi or ${moneyFromCents(PRICING.mobileCentsPerGb)}/GB mobile. Withdraw via Stripe.`,
    },
  ];
  return (
    <section id="how-it-works" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Three steps. No proxy jargon.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.t} className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="border-b border-border bg-bg-elevated">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionLabel>Pay rates</SectionLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Transparent rates. Paid for every GB shared.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <Wifi className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Wi‑Fi
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular">
              {moneyFromCents(PRICING.wifiCentsPerGb)}
              <span className="text-base font-normal text-fg-muted">/GB</span>
            </p>
          </Card>
          <Card className="p-5">
            <Smartphone className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Mobile data
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular">
              {moneyFromCents(PRICING.mobileCentsPerGb)}
              <span className="text-base font-normal text-fg-muted">/GB</span>
            </p>
          </Card>
          <Card className="p-5">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Min withdraw
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular">
              {moneyFromCents(PRICING.minWithdrawCents)}
            </p>
          </Card>
          <Card className="p-5">
            <Zap className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Welcome bonus
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular">
              {moneyFromCents(PRICING.welcomeBonusCents)}
            </p>
          </Card>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {WHY_USERS_HAPPY.map((w) => (
            <li
              key={w.t}
              className="flex items-start gap-2 rounded-xl border border-border bg-bg px-4 py-3 text-sm"
            >
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-medium text-fg">{w.t}. </span>
                <span className="text-fg-muted">{w.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function EarningsCalculator() {
  const [wifiGb, setWifiGb] = useState<number>(PRICING.typicalWifiGbPerDay);
  const [mobileGb, setMobileGb] = useState<number>(PRICING.typicalMobileGbPerDay);
  const totalCents = useMemo(
    () =>
      estimateMonthlyCents({
        wifiGbPerDay: wifiGb,
        mobileGbPerDay: mobileGb,
      }),
    [wifiGb, mobileGb],
  );

  return (
    <section id="earnings" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <SectionLabel>Estimator</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Rough monthly earnings
            </h2>
          </div>
          <Calculator className="hidden h-8 w-8 text-fg-subtle sm:block" />
        </div>
        <Card className="mt-8 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-fg-muted">Wi‑Fi GB / day</span>
              <input
                type="range"
                min={0}
                max={30}
                value={wifiGb}
                onChange={(e) => setWifiGb(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--color-primary)]"
              />
              <span className="mt-1 block font-mono text-lg tabular">{wifiGb} GB/day</span>
            </label>
            <label className="block text-sm">
              <span className="text-fg-muted">Mobile GB / day</span>
              <input
                type="range"
                min={0}
                max={15}
                value={mobileGb}
                onChange={(e) => setMobileGb(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--color-primary)]"
              />
              <span className="mt-1 block font-mono text-lg tabular">
                {mobileGb} GB/day
              </span>
            </label>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6">
            <div>
              <p className="text-xs text-fg-subtle">Estimated ~30 days</p>
              <Money cents={totalCents} size="lg" className="mt-1" />
            </div>
            <p className="max-w-sm text-xs text-fg-muted">
              Illustration only — real earnings depend on demand, quality, and
              how long you share.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

function SafetySection() {
  return (
    <section className="border-b border-border bg-bg-elevated">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionLabel>Safety</SectionLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          You’re in control
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Lock,
              t: "You choose when to share",
              d: "One toggle. Off means no traffic is shared.",
            },
            {
              icon: Shield,
              t: "No proxy links for earners",
              d: "You only see balance and traffic — not technical proxy URLs.",
            },
            {
              icon: Zap,
              t: "Caps & preferences",
              d: "Prefer Wi‑Fi only, or allow mobile when you want higher uptime.",
            },
          ].map((x) => (
            <Card key={x.t} className="p-5">
              <x.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm text-fg-muted">{x.d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Common questions
        </h2>
        <div className="mt-8 space-y-3">
          {PRICING_FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border bg-bg-elevated px-4 py-3"
            >
              <summary className="cursor-pointer list-none font-medium marker:content-none">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { isLoggedIn, ready, user } = useAuthSession();
  return (
    <section className="border-t border-border bg-bg-elevated">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {isLoggedIn
            ? `Welcome back${user?.displayName ? `, ${user.displayName}` : ""}`
            : `Ready to earn ${moneyFromCents(PRICING.wifiCentsPerGb)}/GB on Wi‑Fi?`}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-fg-muted">
          {isLoggedIn
            ? "Open the app to manage sharing, or your dashboard for balance and withdrawals."
            : `Open the app, verify your number, turn sharing on. Withdraw from ${moneyFromCents(PRICING.minWithdrawCents)}.`}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!ready ? null : isLoggedIn ? (
            <>
              <Link to="/app">
                <Button size="lg">
                  Open app
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="secondary">
                  My account
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/app">
                <Button size="lg">
                  Start earning
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="secondary">
                  Log in to dashboard
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const { isLoggedIn, user } = useAuthSession();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <BrandLogo size="sm" />
          <p className="mt-2 max-w-sm text-sm text-fg-muted">
            Share residential bandwidth. Get paid{" "}
            {moneyFromCents(PRICING.wifiCentsPerGb)}/GB on Wi‑Fi ·{" "}
            {moneyFromCents(PRICING.mobileCentsPerGb)}/GB mobile.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Product
            </p>
            <a href="#pricing" className="block text-fg-muted hover:text-fg">
              Pay rates
            </a>
            <a href="#how-it-works" className="block text-fg-muted hover:text-fg">
              How it works
            </a>
            <Link to="/app" className="block text-fg-muted hover:text-fg">
              App
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              Account
            </p>
            {isLoggedIn ? (
              <>
                <Link to="/dashboard" className="block text-fg-muted hover:text-fg">
                  {formatPhoneShort(user?.phone)} · Dashboard
                </Link>
                <Link to="/app" className="block text-fg-muted hover:text-fg">
                  Open app
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="block text-fg-muted hover:text-fg">
                  Log in
                </Link>
                <Link to="/app" className="block text-fg-muted hover:text-fg">
                  Start earning
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-fg-subtle sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} BusyProxy. All rights reserved.</p>
          <p>busyproxy.net</p>
        </div>
      </div>
    </footer>
  );
}

/** Real Pixel 4a screenshot — matches /app gallery (not a mock balance UI). */
function PhonePreview() {
  return (
    <div className="w-full max-w-[280px]">
      <div className="overflow-hidden rounded-[1.75rem] border border-border-strong bg-black phone-shadow shadow-2xl shadow-black/40">
        <img
          src="/app/04-agent-traffic.png?v3"
          alt="BusyProxy Android app — sharing on with live agent status"
          className="block h-auto w-full"
          width={1080}
          height={1920}
        />
      </div>
      <p className="mt-3 text-center text-xs text-fg-muted">
        Real Android client ·{" "}
        <Link to="/app" className="text-primary hover:underline">
          full app preview
        </Link>
      </p>
    </div>
  );
}
