import { createFileRoute } from "@tanstack/react-router";
import {
  LegalH2,
  LegalLayout,
  LegalP,
  LegalUl,
} from "@/components/legal/legal-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BusyProxy" },
      {
        name: "description",
        content:
          "Privacy Policy for BusyProxy: what data we collect, why, retention, and how to delete your account.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout
      label="Legal"
      title="Privacy Policy"
      updated="30 July 2026"
    >
      <LegalP>
        This Privacy Policy describes how BusyProxy (“we”, “us”) collects, uses,
        and shares information when you use busyproxy.net and the BusyProxy
        Android app (the “Service”).
      </LegalP>

      <LegalH2>1. Data we collect</LegalH2>
      <LegalUl>
        <li>
          <strong className="text-fg">Account data:</strong> phone number
          (E.164), display name, optional email, account status, creation and
          last login times.
        </li>
        <li>
          <strong className="text-fg">Authentication:</strong> one-time codes
          (hashed), session tokens (hashed), IP address and user-agent at login.
        </li>
        <li>
          <strong className="text-fg">Device & sharing:</strong> device id,
          platform, network mode (Wi‑Fi / mobile / automatic), online status,
          approximate public egress IP and coarse geo (country/city), session
          traffic counters (bytes up/down), agent connection state.
        </li>
        <li>
          <strong className="text-fg">Earnings & payouts:</strong> wallet
          balances, withdrawal requests, Stripe Connect account identifiers and
          payout status (processed by Stripe).
        </li>
        <li>
          <strong className="text-fg">Support:</strong> messages you send to{" "}
          {SUPPORT_EMAIL}.
        </li>
        <li>
          <strong className="text-fg">Diagnostics:</strong> limited app and
          server logs needed to operate and secure the Service (no payload
          content of proxied traffic).
        </li>
      </LegalUl>

      <LegalH2>2. Data we do not collect</LegalH2>
      <LegalUl>
        <li>We do not log the content of traffic that flows through your phone as an exit.</li>
        <li>We do not sell personal data to data brokers.</li>
        <li>We do not require access to your contacts, photos, or microphone.</li>
      </LegalUl>

      <LegalH2>3. Why we use data</LegalH2>
      <LegalUl>
        <li>Create and secure your account (OTP login)</li>
        <li>Operate reverse tunnels and measure shared bandwidth for rewards</li>
        <li>Show balances, history, and process withdrawals</li>
        <li>Prevent fraud, abuse, and open-proxy misuse</li>
        <li>Provide support and improve reliability</li>
        <li>Comply with law and enforce our Terms</li>
      </LegalUl>

      <LegalH2>4. Legal bases (where applicable)</LegalH2>
      <LegalP>
        Depending on your region, we process data under: contract (providing the
        Service), consent (optional disclosures / marketing if ever offered),
        legitimate interests (security, fraud prevention, product improvement),
        and legal obligation.
      </LegalP>

      <LegalH2>5. Sharing</LegalH2>
      <LegalUl>
        <li>
          <strong className="text-fg">Processors:</strong> hosting (e.g. cloud
          VMs), database (Supabase/Postgres), SMS (Twilio), payments (Stripe),
          analytics only if we later enable a disclosed tool.
        </li>
        <li>
          <strong className="text-fg">Operators / buyers:</strong> proxy clients
          receive network egress through your device when sharing is on; they do
          not receive your phone number or wallet details from the earner app.
        </li>
        <li>
          <strong className="text-fg">Law enforcement:</strong> when required by
          valid legal process.
        </li>
      </LegalUl>

      <LegalH2>6. Retention</LegalH2>
      <LegalP>
        Account data is kept while your account is active. After account
        deletion we anonymize or delete personal identifiers promptly (typically
        within 30 days), except limited records we must keep for fraud
        prevention, accounting, or legal obligations (e.g. completed payout
        records).
      </LegalP>

      <LegalH2>7. Security</LegalH2>
      <LegalP>
        We use TLS in transit, hashed session tokens, access-controlled admin
        surfaces, and least-privilege service keys. No method of transmission or
        storage is 100% secure.
      </LegalP>

      <LegalH2>8. Your rights & account deletion</LegalH2>
      <LegalP>
        You may access or update profile fields where available, log out, and{" "}
        <strong className="text-fg">delete your account</strong>:
      </LegalP>
      <LegalUl>
        <li>In the Android app: Home → Delete account</li>
        <li>On the web dashboard after sign-in</li>
        <li>
          Web instructions:{" "}
          <a href="/account-deletion" className="text-primary hover:underline">
            busyproxy.net/account-deletion
          </a>
        </li>
        <li>
          Email{" "}
          <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          from a contact we can match to your account
        </li>
      </LegalUl>
      <LegalP>
        Depending on your region you may also have rights to access, rectify,
        export, restrict, or object to certain processing. Contact us to
        exercise those rights.
      </LegalP>

      <LegalH2>9. Children</LegalH2>
      <LegalP>
        The Service is not directed to children under 18. We do not knowingly
        collect data from children.
      </LegalP>

      <LegalH2>10. International transfers</LegalH2>
      <LegalP>
        Servers and processors may be located outside your country. Where
        required, we use appropriate safeguards for cross-border transfers.
      </LegalP>

      <LegalH2>11. Changes</LegalH2>
      <LegalP>
        We may update this Policy and will post the new date on this page.
      </LegalP>

      <LegalH2>12. Contact</LegalH2>
      <LegalP>
        Privacy questions:{" "}
        <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </LegalP>
      <LegalP>
        This Policy is a launch-ready template; have counsel review it for your
        entity and jurisdictions before large-scale production.
      </LegalP>
    </LegalLayout>
  );
}
