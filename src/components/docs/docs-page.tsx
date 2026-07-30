import { Link } from "@tanstack/react-router";
import { Card, SectionLabel } from "@/components/ui/primitives";

const guides = [
  {
    title: "How earnings work",
    points: [
      "Share Wi‑Fi or mobile data when you choose",
      "Earn per GB shared ($0.20 Wi‑Fi · $0.12 mobile)",
      "Cash out from $20 via PayPal, bank, or card",
      "You control start / stop anytime",
    ],
  },
  {
    title: "Getting paid",
    points: [
      "PayPal — email only, works worldwide",
      "Bank / Wise — local account details",
      "Card or bank — one-time secure setup",
      "Minimum withdraw $20",
    ],
  },
  {
    title: "Safety & control",
    points: [
      "Visible notification while sharing",
      "Pick network mode (Wi‑Fi only, mobile only…)",
      "Daily data caps and stop anytime",
      "Operators manage access — you never see proxy passwords",
    ],
  },
];

export function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionLabel>Help</SectionLabel>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        How BusyProxy works
      </h1>
      <p className="mt-2 max-w-2xl text-fg-muted">
        Simple guides for earners. Share bandwidth when you want, get paid for
        the traffic you share.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {guides.map((d) => (
          <Card key={d.title} className="flex flex-col p-5">
            <h2 className="text-lg font-semibold">{d.title}</h2>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm text-fg-muted">
              {d.points.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold">Get started</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Sign in with your phone, start sharing from the app, and cash out when
          you hit $20.
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          <Link to="/app" className="text-primary hover:underline">
            Open earner app
          </Link>
          {" · "}
          <Link to="/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
        </p>
      </Card>
    </div>
  );
}
