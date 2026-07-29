import { Link } from "@tanstack/react-router";
import { Card, SectionLabel } from "@/components/ui/primitives";

const docs = [
  {
    title: "System specification",
    path: "docs/SYSTEM_SPEC.md",
    points: [
      "Earner product (pay per GB)",
      "Twilio OTP + Stripe withdraw ≥ $20",
      "Supabase schema, APIs, device tunnel",
      "DigitalOcean deploy plan",
      "Phased delivery roadmap",
    ],
  },
  {
    title: "Design system",
    path: "docs/DESIGN_SYSTEM.md",
    points: [
      "Tokens for all surfaces",
      "Mobile / dashboard / admin IA",
      "Component inventory",
      "Marketing page structure",
      "Accessibility rules",
    ],
  },
  {
    title: "Supabase SQL",
    path: "docs/supabase/001_init.sql",
    points: [
      "users, wallets, devices",
      "traffic samples + daily rollups",
      "ledger + withdrawals",
      "admin + risk flags",
      "default rate plan $0.20/GB",
    ],
  },
];

export function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionLabel>Documentation</SectionLabel>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Specs & schemas
      </h1>
      <p className="mt-2 max-w-2xl text-fg-muted">
        Full written design for the monetized bandwidth network. When you provide
        Supabase, Twilio, Stripe, and DigitalOcean credentials, implementation can
        follow these docs without re-discovery.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {docs.map((d) => (
          <Card key={d.path} className="flex flex-col p-5">
            <p className="font-mono text-[11px] text-primary">{d.path}</p>
            <h2 className="mt-2 text-lg font-semibold">{d.title}</h2>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm text-fg-muted">
              {d.points.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold">What you will provide later</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Supabase", "URL + service role key → apply schema, wire API"],
            ["Twilio", "Verify service → real SMS OTP"],
            ["Stripe", "Secret + Connect → withdrawals"],
            ["DigitalOcean", "API token + domain → droplet, DNS, TLS"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-bg px-4 py-3">
              <p className="font-medium">{k}</p>
              <p className="text-sm text-fg-muted">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-fg-muted">
          Until then, this preview uses demo data and interactive UI mocks. Explore{" "}
          <Link to="/app" className="text-primary hover:underline">
            mobile
          </Link>
          ,{" "}
          <Link to="/dashboard" className="text-primary hover:underline">
            dashboard
          </Link>
          , and{" "}
          <Link to="/admin" className="text-primary hover:underline">
            admin
          </Link>
          .
        </p>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-lg font-semibold">Architecture snapshot</h2>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-bg p-4 font-mono text-[11px] leading-relaxed text-fg-muted">
{`Earner app ──WSS tunnel──► Device gateway ──► Edge proxy ──► Buyers
     │                            │
     │                            ▼
     └────── REST/JWT ──────► API server ──► Supabase Postgres
                                   │
                    Twilio OTP · Stripe Connect · Workers`}
        </pre>
      </Card>
    </div>
  );
}
