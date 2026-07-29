import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { EarnerMobileApp } from "@/components/earner/mobile-app";
import { SectionLabel } from "@/components/ui/primitives";

export const Route = createFileRoute("/app")({
  component: AppPage,
});

function AppPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 max-w-xl">
          <SectionLabel>Mobile earner app</SectionLabel>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Simple client — money & traffic only
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Users never see proxy URLs or IPs. Phone OTP login, share toggle, balance,
            withdraw at $20.{" "}
            <Link to="/dashboard" className="text-primary hover:underline">
              Same data on web dashboard →
            </Link>
          </p>
        </div>
        <div className="flex justify-center pb-12">
          <EarnerMobileApp />
        </div>
      </div>
    </MarketingShell>
  );
}
