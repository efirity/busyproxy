import { createFileRoute } from "@tanstack/react-router";
import {
  LegalH2,
  LegalLayout,
  LegalP,
  LegalUl,
} from "@/components/legal/legal-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — BusyProxy" },
      {
        name: "description",
        content:
          "Terms of Service for BusyProxy bandwidth-sharing and earner app.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout
      label="Legal"
      title="Terms of Service"
      updated="30 July 2026"
    >
      <LegalP>
        These Terms of Service (“Terms”) govern your access to and use of
        BusyProxy websites, APIs, and the BusyProxy mobile application (the
        “Service”) operated by BusyProxy (“we”, “us”). By creating an account,
        installing the app, or using the Service, you agree to these Terms.
      </LegalP>

      <LegalH2>1. What BusyProxy is</LegalH2>
      <LegalP>
        BusyProxy lets consenting users share spare internet capacity (Wi‑Fi or
        mobile data) through a reverse tunnel. Authorized BusyProxy clients may
        route traffic through your device when you explicitly start sharing. You
        may earn rewards based on measured shared traffic, subject to these Terms
        and our payout rules.
      </LegalP>

      <LegalH2>2. Eligibility</LegalH2>
      <LegalUl>
        <li>You must be at least 18 years old (or the age of majority where you live).</li>
        <li>You must use only networks and devices you are authorized to share.</li>
        <li>You must not use the Service where prohibited by law or carrier rules.</li>
      </LegalUl>

      <LegalH2>3. Account & authentication</LegalH2>
      <LegalP>
        Accounts are created and accessed with a phone number and one-time SMS
        code (OTP). You are responsible for the security of your phone and for
        activity under your account. You may delete your account at any time
        (in-app, dashboard, or{" "}
        <a href="/account-deletion" className="text-primary hover:underline">
          account-deletion
        </a>
        ).
      </LegalP>

      <LegalH2>4. Sharing & consent</LegalH2>
      <LegalUl>
        <li>Sharing starts only when you turn it on in the app.</li>
        <li>A persistent notification is shown while sharing is active.</li>
        <li>You choose network modes (Automatic, Wi‑Fi, or Mobile).</li>
        <li>You can stop sharing at any time from the app or notification.</li>
        <li>
          You must not share on networks that forbid resale, tethering abuse, or
          third-party routing without permission.
        </li>
      </LegalUl>

      <LegalH2>5. Acceptable use</LegalH2>
      <LegalP>You agree not to use the Service to:</LegalP>
      <LegalUl>
        <li>Violate any law, regulation, or third-party rights</li>
        <li>Commit fraud, credential stuffing, spam, malware distribution, or phishing</li>
        <li>Attack, scan, or overload networks without authorization</li>
        <li>Circumvent security, rate limits, or abuse controls</li>
        <li>Create multiple accounts to farm rewards or manipulate metrics</li>
        <li>Expose an open unauthenticated proxy or re-sell access outside BusyProxy</li>
      </LegalUl>
      <LegalP>
        We may suspend accounts, withhold payouts, or terminate access for abuse,
        fraud, or policy violations.
      </LegalP>

      <LegalH2>6. Earnings & withdrawals</LegalH2>
      <LegalUl>
        <li>Rates are shown in the app/website and may change with notice.</li>
        <li>Minimum withdrawal thresholds (e.g. $20) and methods (e.g. Stripe) apply.</li>
        <li>
          Earnings are estimates until reconciled; we may adjust for metering
          errors, chargebacks, or fraud.
        </li>
        <li>
          Taxes are your responsibility. We may require identity verification
          before payouts.
        </li>
      </LegalUl>

      <LegalH2>7. Privacy</LegalH2>
      <LegalP>
        Our{" "}
        <a href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </a>{" "}
        explains what data we collect and how we use it. By using the Service you
        also acknowledge that policy.
      </LegalP>

      <LegalH2>8. Intellectual property</LegalH2>
      <LegalP>
        The Service, branding, and software are owned by BusyProxy or its
        licensors. You receive a limited, non-exclusive, revocable license to use
        the app for personal, lawful participation as an earner.
      </LegalP>

      <LegalH2>9. Disclaimers</LegalH2>
      <LegalP>
        THE SERVICE IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
        IMPLIED. We do not guarantee continuous availability, any particular
        earnings amount, or that your carrier will permit sharing on every plan.
      </LegalP>

      <LegalH2>10. Limitation of liability</LegalH2>
      <LegalP>
        To the fullest extent permitted by law, BusyProxy is not liable for
        indirect, incidental, special, consequential, or punitive damages, or for
        lost profits, data, or goodwill. Our total liability for claims relating
        to the Service is limited to the greater of (a) amounts we paid you in
        the 3 months before the claim or (b) USD $50.
      </LegalP>

      <LegalH2>11. Termination</LegalH2>
      <LegalP>
        You may stop using the Service and delete your account at any time. We
        may suspend or terminate access for violation of these Terms, legal
        risk, or extended inactivity.
      </LegalP>

      <LegalH2>12. Changes</LegalH2>
      <LegalP>
        We may update these Terms. Material changes will be posted on this page
        with an updated date. Continued use after changes means you accept the
        revised Terms.
      </LegalP>

      <LegalH2>13. Contact</LegalH2>
      <LegalP>
        Questions:{" "}
        <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </LegalP>
      <LegalP>
        These Terms are a product template for BusyProxy launch readiness and
        should be reviewed by qualified counsel for your jurisdiction before
        wide commercial launch.
      </LegalP>
    </LegalLayout>
  );
}
