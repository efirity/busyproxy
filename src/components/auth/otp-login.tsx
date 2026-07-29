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
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [code, setCode] = useState("");
  const [testNumber, setTestNumber] = useState("+37368182830");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [twilioOk, setTwilioOk] = useState<boolean | null>(null);

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
      const res = await startOtp(phone);
      setPhone(res.phone);
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
      const res = await verifyOtp(phone, code);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (variant === "mobile") {
    return (
      <div className={cn("flex flex-1 flex-col px-5 pb-8 pt-6", className)}>
        <p className="text-sm font-semibold">Relay</p>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          {step === "phone" ? "Enter your phone" : "Enter the code"}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {step === "phone"
            ? "We’ll text a one-time code via Twilio."
            : `6-digit SMS to ${phone}`}
        </p>

        {step === "phone" ? (
          <input
            className="mt-8 h-12 w-full rounded-xl border border-border bg-surface px-4 font-mono text-sm outline-none focus:border-primary"
            placeholder={testNumber}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
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
          Test SMS only to{" "}
          <span className="font-mono text-fg-muted">{testNumber}</span>
          {twilioOk === false && " · Twilio not configured"}
        </p>

        <div className="mt-auto space-y-2">
          {step === "code" && (
            <Button
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
            >
              Change number
            </Button>
          )}
          <Button
            className="w-full"
            size="lg"
            disabled={busy || (step === "code" && code.length !== 6)}
            onClick={() => void (step === "phone" ? sendCode() : verify())}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === "phone" ? (
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
      <SectionLabel>Sign in</SectionLabel>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {step === "phone" ? "Phone number" : "SMS code"}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Same OTP login as the mobile app. Email/password can be added later on
        your profile.
      </p>

      {step === "phone" ? (
        <div className="mt-6 space-y-3">
          <label className="block text-xs text-fg-muted">Phone</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={testNumber}
            className="font-mono"
            inputMode="tel"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <label className="block text-xs text-fg-muted">
            Code sent to {phone}
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
        during testing.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {step === "code" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setStep("phone");
              setCode("");
            }}
          >
            Back
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={busy || (step === "code" && code.length !== 6)}
          onClick={() => void (step === "phone" ? sendCode() : verify())}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : step === "phone" ? (
            "Send code"
          ) : (
            "Verify"
          )}
        </Button>
      </div>
    </Card>
  );
}
