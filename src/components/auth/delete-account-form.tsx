import { useEffect, useState } from "react";
import {
  deleteAccount,
  fetchDeletionReasons,
  type DeletionReason,
} from "@/lib/auth-client";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const FALLBACK_REASONS: DeletionReason[] = [
  { code: "not_earning", label: "Not earning enough" },
  { code: "battery_data", label: "Battery or data usage concerns" },
  { code: "privacy", label: "Privacy or trust concerns" },
  { code: "technical", label: "App technical issues / bugs" },
  { code: "switching", label: "Switching to another service" },
  { code: "temporary", label: "Taking a break / temporary" },
  { code: "other", label: "Other (please describe)" },
];

export function DeleteAccountForm({
  onDeleted,
  className,
  compact,
}: {
  onDeleted: () => void;
  className?: string;
  compact?: boolean;
}) {
  const [reasons, setReasons] = useState<DeletionReason[]>(FALLBACK_REASONS);
  const [code, setCode] = useState("");
  const [detail, setDetail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchDeletionReasons()
      .then((r) => {
        if (r.reasons?.length) setReasons(r.reasons);
      })
      .catch(() => {
        /* use fallback */
      });
  }, []);

  const other = code === "other";
  const canSubmit =
    Boolean(code) &&
    (!other || detail.trim().length >= 3) &&
    confirm.trim().toUpperCase() === "DELETE";

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount({
        reasonCode: code,
        reasonText: other ? detail.trim() : undefined,
      });
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className={cn("text-sm text-fg-muted", compact && "text-xs")}>
        Why are you leaving? Pick one reason (required). After deletion this
        phone cannot sign in again until support reactivates it.
      </p>
      <fieldset className="space-y-2">
        <legend className="sr-only">Deletion reason</legend>
        {reasons.map((r) => (
          <label
            key={r.code}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition",
              code === r.code
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-bg hover:border-border-strong",
            )}
          >
            <input
              type="radio"
              name="deletion-reason"
              className="mt-1"
              checked={code === r.code}
              onChange={() => setCode(r.code)}
            />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>
      {other && (
        <textarea
          className="min-h-[72px] w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Please tell us more…"
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 500))}
          maxLength={500}
        />
      )}
      <label className="block text-xs text-fg-muted">
        Type <strong className="text-fg">DELETE</strong> to confirm
        <input
          className="mt-1 h-10 w-full rounded-xl border border-border bg-bg px-3 font-mono text-sm outline-none focus:border-primary"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
        />
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button
        variant="secondary"
        disabled={busy || !canSubmit}
        className="w-full border-danger/40 text-danger hover:bg-danger-soft/30"
        onClick={() => void submit()}
      >
        {busy ? "Deleting…" : "Permanently delete my account"}
      </Button>
    </div>
  );
}
