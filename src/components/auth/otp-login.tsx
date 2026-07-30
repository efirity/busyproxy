import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchAuthConfig,
  startOtp,
  verifyOtp,
  type AuthUser,
} from "@/lib/auth-client";
import { Button, Card, Input, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function OtpLogin({
  onSuccess,
  variant = "web",
  defaultPhone,
  className,
}: {
  onSuccess: (user: AuthUser) => void;
  variant?: "web" | "mobile";
  defaultPhone?: string;
  className?: string;
}) {
  const [step, setStep] = useState<"register" | "code">("register");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [code, setCode] = useState("");
  const [testNumber, setTestNumber] = useState("+37368182830");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [twilioOk, setTwilioOk] = useState<boolean | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);

  useEffect(() => {
    void fetchAuthConfig()
      .then((c) => {
        setTestNumber(c.testNumber);
        setTwilioOk(c.twilioConfigured);
        if (!phone) setPhone(c.testNumber);
      })
      .catch(() => setTwilioOk(false));
  }, []);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const name = displayName.trim();
      if (name.length < 2) {
        throw new Error("Enter a display name (at least 2 characters)");
      }
      const res = await startOtp(phone, name);
      setPhone(res.phone);
      setIsNewUser(res.isNewUser !== false);
      setStep("code");
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await verifyOtp(phone, code, displayName.trim());
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const nameOk = displayName.trim().length >= 2;
  const phoneOk = phone.trim().length >= 8;

  if (variant === "mobile") {
    return (
      <div className={cn("flex flex-1 flex-col px-5 pb-8 pt-6", className)}>
        <p className="text-sm font-semibold">BusyProxy</p>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          {step === "register" ? "Create your account" : "Enter the code"}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {step === "register"
            ? "Choose a display name and phone. We’ll text a one-time code."
            : `6-digit SMS to ${phone}`}
        </p>

        {step === "register" ? (
          <div className="mt-8 space-y-3">
            <input
              className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              maxLength={40}
            />
            <input
              className="h-12 w-full rounded-xl border border-border bg-surface px-4 font-mono text-sm outline-none focus:border-primary"
              placeholder={testNumber}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        ) : (
          <input
            className="mt-8 h-12 w-full rounded-xl border border-border bg-surface px-4 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-primary"
            placeholder="••••••"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
        )}

        {(error || info) && (
          <p
            className={cn(
              "mt-3 text-xs leading-relaxed",
              error ? "text-danger" : "text-fg-muted",
            )}
          >
            {error || info}
          </p>
        )}

        <p className="mt-4 text-[11px] text-fg-subtle">
          Returning users: enter the same phone (name optional to update). Test
          SMS: <span className="font-mono text-fg-muted">{testNumber}</span>
          {twilioOk === false && " · Twilio not configured"}
        </p>

        <div className="mt-auto space-y-2">
          {step === "code" && (
            <Button
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setStep("register");
                setCode("");
                setError(null);
              }}
            >
              Change details
            </Button>
          )}
          <Button
            className="w-full"
            size="lg"
            disabled={
              busy ||
              (step === "register" ? !nameOk || !phoneOk : code.length !== 6)
            }
            onClick={() => void (step === "register" ? sendCode() : verify())}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === "register" ? (
              "Send code"
            ) : (
              "Verify & continue"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("mx-auto w-full max-w-md p-6", className)}>
      <SectionLabel>
        {step === "register"
          ? isNewUser
            ? "Register / sign in"
            : "Sign in"
          : "Verify"}
      </SectionLabel>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {step === "register" ? "Name & phone" : "SMS code"}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        {step === "register"
          ? "Create an account with a display name and phone number. Login is always phone + SMS code."
          : `We sent a 6-digit code to ${phone}.`}
      </p>

      {step === "register" ? (
        <div className="mt-6 space-y-3">
          <label className="block text-xs text-fg-muted">
            Display name
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              className="mt-1"
              autoComplete="nickname"
              maxLength={40}
            />
          </label>
          <label className="block text-xs text-fg-muted">
            Phone
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={testNumber}
              className="mt-1 font-mono"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <label className="block text-xs text-fg-muted">
            Code sent to {phone}
            {displayName.trim() ? ` · ${displayName.trim()}` : ""}
          </label>
          <Input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit code"
            className="text-center font-mono text-lg tracking-widest"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>
      )}

      {(error || info) && (
        <p
          className={cn(
            "mt-3 text-xs leading-relaxed",
            error ? "text-danger" : "text-fg-muted",
          )}
        >
          {error || info}
        </p>
      )}

      <p className="mt-4 text-[11px] text-fg-subtle">
        Live Twilio SMS to <span className="font-mono">{testNumber}</span> only
        during testing. Already registered? Use the same phone number.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {step === "code" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setStep("register");
              setCode("");
            }}
          >
            Back
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={
            busy ||
            (step === "register" ? !nameOk || !phoneOk : code.length !== 6)
          }
          onClick={() => void (step === "register" ? sendCode() : verify())}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : step === "register" ? (
            "Send code"
          ) : (
            "Verify"
          )}
        </Button>
      </div>
    </Card>
  );
}
