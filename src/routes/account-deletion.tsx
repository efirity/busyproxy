import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LegalH2,
  LegalLayout,
  LegalP,
  LegalUl,
} from "@/components/legal/legal-page";
import { Button } from "@/components/ui/primitives";
import {
  deleteAccount,
  fetchSession,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-client";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";
import { useEffect } from "react";

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
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    void fetchSession().then((s) => {
      setUser(s?.user || getStoredUser());
      setReady(true);
    });
  }, []);

  const onDelete = async () => {
    if (confirm.trim().toUpperCase() !== "DELETE") {
      setError('Type DELETE to confirm.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      setDone(true);
      setUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

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

      <LegalH2>What is deleted</LegalH2>
      <LegalUl>
        <li>Your phone number and display name (anonymized / removed)</li>
        <li>Sign-in sessions (you are signed out everywhere)</li>
        <li>Enrolled devices and reverse-tunnel enrollments</li>
        <li>Wallet balance records tied to the account</li>
        <li>Local app session data after you open the app again</li>
      </LegalUl>

      <LegalH2>What may be retained briefly</LegalH2>
      <LegalUl>
        <li>
          Aggregated traffic metrics without personal identifiers
        </li>
        <li>
          Completed payout / accounting records where law requires retention
        </li>
        <li>Security logs for fraud investigation (limited period)</li>
      </LegalUl>

      <LegalH2>How to delete</LegalH2>
      <LegalUl>
        <li>
          <strong className="text-fg">Android app:</strong> open BusyProxy while
          signed in → scroll to <em>Delete account</em> → confirm.
        </li>
        <li>
          <strong className="text-fg">Website (signed in):</strong> use the form
          below, or Dashboard → Delete account.
        </li>
        <li>
          <strong className="text-fg">Email request:</strong> write to{" "}
          <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          with subject “Account deletion” and the phone number on the account.
          We process email requests within 7 days (usually faster).
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
            <p className="text-sm">
              This cannot be undone. Type <strong className="text-fg">DELETE</strong>{" "}
              to confirm.
            </p>
            <input
              className="h-10 w-full max-w-xs rounded-xl border border-border bg-bg px-3 font-mono text-sm outline-none focus:border-primary"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void onDelete()}
              className="border-danger/40 text-danger hover:bg-danger-soft/30"
            >
              {busy ? "Deleting…" : "Permanently delete my account"}
            </Button>
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
