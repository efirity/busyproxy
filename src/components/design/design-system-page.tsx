import { Button, Badge, Card, Input, Money, SectionLabel, StatusDot } from "@/components/ui/primitives";

export function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <div>
        <SectionLabel>Design system</SectionLabel>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Relay UI kit</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Shared tokens and components for marketing, earner mobile, user dashboard,
          and admin — one brand, four densities.
        </p>
      </div>

      <section>
        <SectionLabel>Color</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ["bg", "bg-bg", "border"],
            ["elevated", "bg-bg-elevated", "border"],
            ["surface", "bg-surface", "border"],
            ["primary", "bg-primary", ""],
            ["success", "bg-success", ""],
            ["danger", "bg-danger", ""],
          ].map(([name, cls, border]) => (
            <div key={name} className="rounded-xl border border-border p-2">
              <div className={`h-14 rounded-lg ${cls} ${border ? "border border-border" : ""}`} />
              <p className="mt-2 text-xs font-medium capitalize">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Typography</SectionLabel>
        <Card className="mt-3 space-y-2 p-5">
          <p className="text-4xl font-semibold tracking-tight">Display / DM Sans</p>
          <p className="text-lg text-fg-muted">Body muted — calm product copy</p>
          <p className="font-mono text-sm tabular">$14.20 · 3.28 GB · +373</p>
        </Card>
      </section>

      <section>
        <SectionLabel>Buttons</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section>
        <SectionLabel>Badges & status</SectionLabel>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>neutral</Badge>
          <Badge tone="success">paid</Badge>
          <Badge tone="warning">pending</Badge>
          <Badge tone="danger">banned</Badge>
          <Badge tone="primary">bonus</Badge>
          <span className="ml-2 flex items-center gap-1.5 text-sm text-fg-muted">
            <StatusDot status="sharing" /> Sharing
          </span>
          <span className="flex items-center gap-1.5 text-sm text-fg-muted">
            <StatusDot status="offline" /> Offline
          </span>
        </div>
      </section>

      <section>
        <SectionLabel>Money & inputs</SectionLabel>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="text-xs text-fg-muted">Available balance</p>
            <Money cents={1420} size="xl" className="mt-1 block" />
            <Money cents={-2000} size="sm" className="mt-2 block" />
          </Card>
          <Card className="space-y-3 p-5">
            <Input placeholder="Phone number" defaultValue="+373 60 123 456" />
            <Input placeholder="OTP" defaultValue="123456" className="font-mono tracking-widest" />
          </Card>
        </div>
      </section>

      <section>
        <SectionLabel>Domain patterns</SectionLabel>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm font-semibold">BalanceHero</p>
            <p className="mt-1 text-xs text-fg-muted">
              Large money + withdraw progress to $20
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold">ShareToggleCard</p>
            <p className="mt-1 text-xs text-fg-muted">
              One primary start/stop control — no proxy jargon
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold">LedgerRow / DataTable</p>
            <p className="mt-1 text-xs text-fg-muted">
              Shared list patterns for mobile + admin
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
