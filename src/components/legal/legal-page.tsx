import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/layout/shell";
import { SectionLabel } from "@/components/ui/primitives";
import {
  ACCOUNT_DELETION_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  TERMS_URL,
} from "@/lib/support";

export function LegalLayout({
  title,
  label,
  updated,
  children,
}: {
  title: string;
  label: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <SectionLabel>{label}</SectionLabel>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-fg-muted">Last updated: {updated}</p>
        <div className="prose-legal mt-8 space-y-5 text-sm leading-relaxed text-fg-muted">
          {children}
        </div>
        <nav className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm">
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy
          </Link>
          <Link to="/account-deletion" className="text-primary hover:underline">
            Delete account
          </Link>
          <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          <Link to="/" className="text-fg-muted hover:text-fg">
            Home
          </Link>
        </nav>
      </article>
    </MarketingShell>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-2 text-base font-semibold text-fg">{children}</h2>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

/** Shared short legal links for footers / login. */
export function LegalMiniLinks({ className }: { className?: string }) {
  return (
    <p className={className}>
      <a href={TERMS_URL} className="hover:text-fg hover:underline">
        Terms
      </a>
      {" · "}
      <a href={PRIVACY_URL} className="hover:text-fg hover:underline">
        Privacy
      </a>
      {" · "}
      <a href={ACCOUNT_DELETION_URL} className="hover:text-fg hover:underline">
        Delete account
      </a>
    </p>
  );
}
