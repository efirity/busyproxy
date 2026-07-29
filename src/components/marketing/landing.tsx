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
import { DEMO_USER } from "@/data/demo";
import {
  PRICING,
  PRICING_FAQ,
  WHY_USERS_HAPPY,
  estimateMonthlyCents,
  moneyFromCents,
} from "@/data/pricing";

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
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="fade-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted">
            <Radio className="h-3.5 w-3.5 text-primary" />
            Paid per GB · Wi‑Fi & mobile
          </div>
          <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            Share bandwidth.{" "}
            <span className="text-fg-muted">Get paid.</span>
          </h1>
          <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-fg-muted sm:text-lg">
            BusyProxy pays{" "}
            <strong className="font-semibold text-fg">
              {moneyFromCents(PRICING.wifiCentsPerGb)} per GB on Wi‑Fi
            </strong>{" "}
            and{" "}
            <strong className="font-semibold text-fg">
              {moneyFromCents(PRICING.mobileCentsPerGb)} on mobile
            </strong>
            . Verify your phone, leave sharing on, withdraw from{" "}
            {moneyFromCents(PRICING.minWithdrawCents)} via Stripe.
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
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
            {[
              {
                k: "Wi‑Fi rate",
                v: moneyFromCents(PRICING.wifiCentsPerGb) + "/GB",
              },
              {
                k: "Mobile rate",
                v: moneyFromCents(PRICING.mobileCentsPerGb) + "/GB",
              },
              {
                k: "Min withdraw",
                v: moneyFromCents(PRICING.minWithdrawCents),
              },
            ].map((i) => (
              <div key={i.k}>
                <dt className="text-xs text-fg-subtle">{i.k}</dt>
                <dd className="mt-1 font-mono text-sm font-semibold tabular">
                  {i.v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] text-fg-subtle">{PRICING.tagline}</p>
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
    <section className="border-y border-border bg-bg-elevated">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6">
        {[
          {
            icon: BadgeCheck,
            t: "Clear $/GB rates",
            d: "No points. No mystery multipliers at payout.",
          },
          {
            icon: Wifi,
            t: "Wi‑Fi-first by design",
            d: "Highest rate on home internet — free spare capacity.",
          },
          {
            icon: Users,
            t: `${PRICING.referralPercent}% referral bonus`,
            d: `Earn on friends’ first ${PRICING.referralWindowDays} days.`,
          },
        ].map((x) => (
          <div key={x.t} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-primary">
              <x.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{x.t}</p>
              <p className="text-xs text-fg-muted">{x.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Three steps. No tech setup.
        </h2>
        <p className="mt-3 max-w-xl text-sm text-fg-muted sm:text-base">
          Built for people who want passive earnings — not networking tools.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Smartphone,
              t: "1. Verify your phone",
              d: "SMS one-time code. Account ready in under a minute.",
            },
            {
              icon: Wifi,
              t: "2. Share on Wi‑Fi (or mobile)",
              d: `Toggle sharing. Earn ${moneyFromCents(PRICING.wifiCentsPerGb)}/GB on Wi‑Fi, ${moneyFromCents(PRICING.mobileCentsPerGb)}/GB on mobile.`,
            },
            {
              icon: CircleDollarSign,
              t: "3. Withdraw from $20",
              d: "Connect Stripe once. Cash out when you hit the minimum.",
            },
          ].map((s) => (
            <Card key={s.t} className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
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
    <section
      id="pricing"
      className="scroll-mt-20 border-t border-border bg-bg-elevated"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionLabel>Pay rates</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Simple pricing. Published rates.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-fg-muted sm:text-base">
          We chose rates that beat typical “$0.10/GB” bandwidth apps on Wi‑Fi,
          while keeping mobile lower so you don’t burn a paid data plan.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Card className="relative overflow-hidden border-primary/40 p-6">
            <div className="absolute right-4 top-4 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Best rate
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wifi className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Wi‑Fi / home internet</h3>
            <p className="mt-2 font-mono text-3xl font-semibold tabular text-fg">
              {moneyFromCents(PRICING.wifiCentsPerGb)}
              <span className="text-base font-medium text-fg-muted"> / GB</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fg-muted">
              <li>· Highest pay — use overnight spare capacity</li>
              <li>· Best for “set and forget” home devices</li>
              <li>
                · ~{PRICING.typicalWifiGbPerDay} GB/day example → about{" "}
                <span className="font-mono text-fg">
                  {moneyFromCents(
                    PRICING.typicalWifiGbPerDay * PRICING.wifiCentsPerGb,
                  )}
                </span>
                /day
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Mobile data</h3>
            <p className="mt-2 font-mono text-3xl font-semibold tabular text-fg">
              {moneyFromCents(PRICING.mobileCentsPerGb)}
              <span className="text-base font-medium text-fg-muted"> / GB</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fg-muted">
              <li>· Fair pay for cellular IPs</li>
              <li>· Lower than Wi‑Fi so plans stay protected</li>
              <li>· Optional Wi‑Fi-only mode in the app</li>
            </ul>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-fg-subtle">Welcome bonus</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {moneyFromCents(PRICING.welcomeBonusCents)}
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              After first verified share day
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-subtle">Minimum withdraw</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {moneyFromCents(PRICING.minWithdrawCents)}
            </p>
            <p className="mt-1 text-xs text-fg-muted">Stripe Connect payouts</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-fg-subtle">Invite friends</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {PRICING.referralPercent}%
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              Of their earnings · first {PRICING.referralWindowDays} days
            </p>
          </Card>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {WHY_USERS_HAPPY.map((item) => (
            <div
              key={item.t}
              className="rounded-2xl border border-border bg-bg px-4 py-4"
            >
              <div className="flex items-center gap-2 text-primary">
                <Zap className="h-4 w-4" />
                <p className="text-sm font-semibold text-fg">{item.t}</p>
              </div>
              <p className="mt-2 text-sm text-fg-muted">{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EarningsCalculator() {
  const [wifiGb, setWifiGb] = useState<number>(PRICING.typicalWifiGbPerDay);
  const [mobileGb, setMobileGb] = useState<number>(0);

  const monthly = useMemo(
    () =>
      estimateMonthlyCents({
        wifiGbPerDay: wifiGb,
        mobileGbPerDay: mobileGb,
      }),
    [wifiGb, mobileGb],
  );
  const daily = useMemo(
    () =>
      estimateMonthlyCents({
        wifiGbPerDay: wifiGb,
        mobileGbPerDay: mobileGb,
        days: 1,
      }),
    [wifiGb, mobileGb],
  );
  const daysToWithdraw = Math.max(
    1,
    Math.ceil(PRICING.minWithdrawCents / Math.max(1, daily)),
  );

  return (
    <section id="earnings" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionLabel>Estimator</SectionLabel>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              What could you earn?
            </h2>
            <p className="mt-3 text-sm text-fg-muted sm:text-base">
              Drag the sliders for a realistic estimate. Actual earnings depend
              on demand and how long you leave sharing on — not a guarantee.
            </p>
            <div className="mt-8 space-y-6">
              <SliderRow
                label="Wi‑Fi GB per day"
                value={wifiGb}
                min={0}
                max={30}
                step={1}
                onChange={setWifiGb}
                hint={`${moneyFromCents(PRICING.wifiCentsPerGb)}/GB`}
              />
              <SliderRow
                label="Mobile GB per day"
                value={mobileGb}
                min={0}
                max={10}
                step={0.5}
                onChange={setMobileGb}
                hint={`${moneyFromCents(PRICING.mobileCentsPerGb)}/GB`}
              />
            </div>
          </div>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-primary">
              <Calculator className="h-4 w-4" />
              <SectionLabel>Your estimate</SectionLabel>
            </div>
            <p className="mt-4 text-xs text-fg-muted">Per day</p>
            <Money cents={daily} size="lg" className="mt-1 block" />
            <p className="mt-4 text-xs text-fg-muted">Per 30 days</p>
            <Money cents={monthly} size="xl" className="mt-1 block" />
            <div className="mt-6 rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg-muted">
              At this pace, about{" "}
              <span className="font-semibold text-fg">
                {daysToWithdraw} day{daysToWithdraw === 1 ? "" : "s"}
              </span>{" "}
              to reach the {moneyFromCents(PRICING.minWithdrawCents)} withdraw
              minimum (estimate).
            </div>
            <Link to="/app" className="mt-6 block">
              <Button className="w-full" size="lg">
                Start earning for real
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        <span className="font-mono text-sm tabular text-fg-muted">
          {value} GB · {hint}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--primary,#3b82f6)]"
      />
    </div>
  );
}

function SafetySection() {
  return (
    <section
      id="safety"
      className="scroll-mt-20 border-t border-border bg-bg-elevated"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionLabel>Safety & control</SectionLabel>
        <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
          You’re always in control of your connection.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Lock,
              t: "No proxy jargon",
              d: "You never manage URLs, ports, or IPs — only traffic and money.",
            },
            {
              icon: Shield,
              t: "Share when you want",
              d: "One tap start/stop. Cap usage. Prefer Wi‑Fi only anytime.",
            },
            {
              icon: CircleDollarSign,
              t: "Secure payouts",
              d: "Phone-verified accounts. Stripe Connect withdrawals.",
            },
          ].map((item) => (
            <Card key={item.t} className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                {item.d}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Questions about pay
        </h2>
        <dl className="mt-8 space-y-4">
          {PRICING_FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-border bg-surface px-5 py-4"
            >
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border bg-bg-elevated">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Ready to earn {moneyFromCents(PRICING.wifiCentsPerGb)}/GB on Wi‑Fi?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-fg-muted">
          Open the app, verify your number, turn sharing on. Withdraw from{" "}
          {moneyFromCents(PRICING.minWithdrawCents)}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
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
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Radio className="h-4 w-4 text-primary" />
            BusyProxy
          </p>
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
            <Link to="/dashboard" className="block text-fg-muted hover:text-fg">
              Log in
            </Link>
            <Link to="/app" className="block text-fg-muted hover:text-fg">
              Start earning
            </Link>
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

function PhonePreview() {
  return (
    <div className="w-full max-w-[280px] overflow-hidden rounded-[2rem] border border-border-strong bg-bg phone-shadow">
      <div className="flex items-center justify-between px-5 pt-3 text-[10px] text-fg-muted">
        <span>9:41</span>
        <span className="h-1.5 w-3 rounded-sm border border-fg-muted/50" />
      </div>
      <div className="px-5 pb-6 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Home</p>
            <p className="text-[10px] text-fg-muted">Your balance</p>
          </div>
          <span className="rounded-full border border-success/30 bg-success-soft/40 px-2 py-0.5 text-[10px] text-success">
            Sharing
          </span>
        </div>
        <p className="mt-5 text-[10px] text-fg-muted">Available</p>
        <Money cents={DEMO_USER.availableCents} size="lg" className="mt-0.5 block" />
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full w-[71%] rounded-full bg-primary" />
        </div>
        <p className="mt-1 text-[10px] text-fg-subtle">
          Toward {moneyFromCents(PRICING.minWithdrawCents)} withdraw
        </p>
        <div className="mt-4 rounded-xl border border-success/25 bg-success-soft/30 p-3">
          <p className="text-xs font-semibold">
            {moneyFromCents(PRICING.wifiCentsPerGb)}/GB Wi‑Fi
          </p>
          <p className="mt-0.5 text-[10px] text-fg-muted">
            {moneyFromCents(PRICING.mobileCentsPerGb)}/GB mobile · sharing on
          </p>
        </div>
      </div>
    </div>
  );
}
