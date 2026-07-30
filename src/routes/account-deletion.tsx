import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LegalH2,
  LegalLayout,
  LegalP,
  LegalUl,
} from "@/components/legal/legal-page";
import { DeleteAccountForm } from "@/components/auth/delete-account-form";
import {
  fetchSession,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-client";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Delete your account — BusyProxy" },
      {
        name: "description",
        content:
          "How to delete your BusyProxy account and associated data (Google Play account deletion requirement).",
      },
    ],
  }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void fetchSession().then((s) => {
      setUser(s?.user || getStoredUser());
      setReady(true);
    });
  }, []);

  return (
    <LegalLayout
      label="Account"
      title="Delete your account"
      updated="30 July 2026"
    >
      <LegalP>
        Google Play and privacy laws require a clear way to delete your account
        and associated personal data. BusyProxy supports deletion{" "}
        <strong className="text-fg">in the app</strong>,{" "}
        <strong className="text-fg">on this website</strong>, and by email.
      </LegalP>

      <LegalH2>What happens when you delete</LegalH2>
      <LegalUl>
        <li>Account status is set to <strong className="text-fg">deleted</strong></li>
        <li>Display name and optional email are cleared</li>
        <li>Sign-in sessions end everywhere</li>
        <li>Enrolled devices and reverse-tunnel enrollments are removed</li>
        <li>Wallet balance records for the account are removed</li>
        <li>
          Your <strong className="text-fg">phone number is kept on the deleted
          record</strong> so the same number cannot sign in or create a new
          account until support reactivates it
        </li>
        <li>
          We save the <strong className="text-fg">reason you selected</strong>{" "}
          (and optional details) for product improvement and support
        </li>
      </LegalUl>

      <LegalH2>Reactivation</LegalH2>
      <LegalP>
        After deletion, login with that phone is blocked. Email{" "}
        <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        with subject “Account reactivation” and your phone number to request
        reactivation.
      </LegalP>

      <LegalH2>How to delete</LegalH2>
      <LegalUl>
        <li>
          <strong className="text-fg">Android app:</strong> account icon →{" "}
          <em>Delete account</em> → confirm.
        </li>
        <li>
          <strong className="text-fg">Website:</strong> Dashboard → Account →
          Delete account, or the form below.
        </li>
        <li>
          <strong className="text-fg">Email request:</strong>{" "}
          <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </li>
      </LegalUl>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-fg">Delete now (web)</p>
        {!ready ? (
          <p className="mt-2 text-sm">Checking sign-in…</p>
        ) : done ? (
          <p className="mt-2 text-sm text-fg">
            Your account has been deleted. You can close this page.
          </p>
        ) : !user ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm">
              Sign in first, then return here to delete, or email support.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Go to sign in →
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="font-mono text-xs text-fg-muted">
              Signed in as {user.displayName || "Earner"} · {user.phone}
            </p>
            <DeleteAccountForm
              onDeleted={() => {
                setDone(true);
                setUser(null);
              }}
            />
          </div>
        )}
      </div>

      <LegalP>
        Privacy details:{" "}
        <a href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </a>
        . Support:{" "}
        <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </LegalP>
    </LegalLayout>
  );
}
