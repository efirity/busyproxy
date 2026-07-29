import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CircleDollarSign,
  Lock,
  Radio,
  Shield,
  Smartphone,
  Wifi,
} from "lucide-react";
import { Button, Card, Money, SectionLabel } from "@/components/ui/primitives";
import { DEMO_USER } from "@/data/demo";

export function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted">
              <Radio className="h-3.5 w-3.5 text-primary" />
              Bandwidth sharing · paid per GB
            </div>
            <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Share bandwidth.{" "}
              <span className="text-fg-muted">Get paid.</span>
            </h1>
            <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-fg-muted sm:text-lg">
              Relay turns spare connection capacity into earnings — on Wi‑Fi or
              mobile data. Install the app, verify your phone, leave sharing on.
              Withdraw via Stripe from $20.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app">
                <Button size="lg">
                  Preview mobile app
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="secondary">
                  User dashboard
                </Button>
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
              {[
                { k: "Min withdraw", v: "$20" },
                { k: "Pay rate*", v: "$0.20/GB" },
                { k: "Login", v: "Phone OTP" },
              ].map((i) => (
                <div key={i.k}>
                  <dt className="text-xs text-fg-subtle">{i.k}</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold tabular">
                    {i.v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-fg-subtle">
              *Example rate — configurable per country. Earnings depend on demand.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <PhonePreview />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Three steps. No tech setup.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Smartphone,
                t: "1. Verify phone",
                d: "Sign in with SMS OTP via Twilio. No passwords to forget.",
              },
              {
                icon: Wifi,
                t: "2. Share any network",
                d: "Toggle sharing on Wi‑Fi or mobile data. Optional Wi‑Fi-only mode in settings.",
              },
              {
                icon: CircleDollarSign,
                t: "3. Withdraw",
                d: "Track GB and $ in-app. Cash out with Stripe from $20.",
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

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>Built for trust</SectionLabel>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Simple for earners. Serious for operators.
              </h2>
              <ul className="mt-6 space-y-4">
                {[
                  {
                    icon: Lock,
                    t: "No proxy jargon",
                    d: "Users never see URLs, ports, or IPs — only traffic and money.",
                  },
                  {
                    icon: Shield,
                    t: "You stay in control",
                    d: "Share on any network, or lock to Wi‑Fi. Daily caps and one-tap stop.",
                  },
                  {
                    icon: CircleDollarSign,
                    t: "Ledger-based wallet",
                    d: "Every cent audited. Stripe Connect for withdrawals.",
                  },
                ].map((item) => (
                  <li key={item.t} className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{item.t}</p>
                      <p className="mt-0.5 text-sm text-fg-muted">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="p-6">
              <SectionLabel>Operator stack</SectionLabel>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Supabase", "Postgres + realtime"],
                  ["Twilio", "Phone OTP"],
                  ["Stripe", "Payouts"],
                  ["DigitalOcean", "API, edge, DNS"],
                  ["Mobile app", "Earner client"],
                  ["Admin", "Fleet & finance"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-border bg-bg px-3 py-3"
                  >
                    <p className="font-medium">{k}</p>
                    <p className="text-xs text-fg-muted">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/admin">
                  <Button variant="secondary" size="sm">
                    Admin design
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button variant="ghost" size="sm">
                    Read full spec
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-elevated">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Explore the full product design
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-fg-muted">
            Interactive mockups for the earner app, user web dashboard, admin
            console, and shared design system — backed by the system spec.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/app">
              <Button size="lg">Mobile earner app</Button>
            </Link>
            <Link to="/design">
              <Button size="lg" variant="secondary">
                Design system
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Relay Earn · system design preview</p>
          <p>Specs in docs/ · Supabase schema ready to apply</p>
        </div>
      </footer>
    </div>
  );
}

function PhonePreview() {
  const progress = Math.min(
    1,
    DEMO_USER.availableCents / DEMO_USER.minWithdrawCents,
  );
  return (
    <div className="phone-shadow w-full max-w-[320px] overflow-hidden rounded-phone border border-border-strong bg-bg">
      <div className="flex items-center justify-between px-5 pt-3 text-[11px] text-fg-muted tabular">
        <span>9:41</span>
        <span className="h-2 w-3.5 rounded-sm border border-fg-muted/60" />
      </div>
      <div className="px-5 pb-6 pt-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Relay</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success status-pulse" />
              Sharing
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-semibold">
              AM
            </span>
          </div>
        </div>
        <p className="mt-6 text-xs text-fg-muted">Available balance</p>
        <Money
          cents={DEMO_USER.availableCents}
          size="xl"
          className="mt-1 block"
        />
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          {moneyLeft()} to $20 withdraw
        </p>
        <button
          type="button"
          disabled
          className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-surface-2 text-sm font-semibold text-fg-subtle"
        >
          Withdraw
        </button>
        <div className="mt-4 rounded-2xl border border-success/25 bg-success-soft/40 p-3">
          <p className="text-sm font-semibold text-fg">Sharing · any network</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Wi‑Fi and mobile data · you’re earning
          </p>
          <div className="mt-3 h-10 rounded-xl bg-danger/90 text-center text-sm font-semibold leading-10 text-white">
            Stop sharing
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniStat
            label="Today"
            cents={DEMO_USER.todayEarnCents}
            sub="2.1 GB"
          />
          <MiniStat
            label="This week"
            cents={DEMO_USER.weekEarnCents}
            sub="11.4 GB"
          />
        </div>
      </div>
    </div>
  );
}

function moneyLeft() {
  const left = Math.max(
    0,
    DEMO_USER.minWithdrawCents - DEMO_USER.availableCents,
  );
  return `$${(left / 100).toFixed(2)}`;
}

function MiniStat({
  label,
  cents,
  sub,
}: {
  label: string;
  cents: number;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <Money cents={cents} size="sm" className="mt-1 block" />
      <p className="mt-0.5 font-mono text-[11px] text-fg-muted">{sub}</p>
    </div>
  );
}
