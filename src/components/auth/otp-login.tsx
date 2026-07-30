import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchAuthConfig,
  fetchPhoneHint,
  startOtp,
  verifyOtp,
  type AuthUser,
} from "@/lib/auth-client";
import { Button, Card, Input, SectionLabel } from "@/components/ui/primitives";
import {
  PRIVACY_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  TERMS_URL,
} from "@/lib/support";
import { cn } from "@/lib/utils";

const LS_PHONE = "bp_login_phone";
const LS_NAME = "bp_login_display_name";

function readSavedLogin(): { phone: string; name: string } {
  if (typeof window === "undefined") return { phone: "", name: "" };
  try {
    return {
      phone: localStorage.getItem(LS_PHONE)?.trim() || "",
      name: localStorage.getItem(LS_NAME)?.trim() || "",
    };
  } catch {
    return { phone: "", name: "" };
  }
}

function saveLoginHints(phone: string, name?: string) {
  if (typeof window === "undefined") return;
  try {
    const p = phone.trim();
    if (p.length >= 8) localStorage.setItem(LS_PHONE, p);
    const n = name?.trim();
    if (n && n.length >= 2) localStorage.setItem(LS_NAME, n);
  } catch {
    /* private mode */
  }
}

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
  const saved = typeof window !== "undefined" ? readSavedLogin() : { phone: "", name: "" };
  const [step, setStep] = useState<"register" | "code">("register");
  const [displayName, setDisplayName] = useState(saved.name || "");
  const [phone, setPhone] = useState(defaultPhone || saved.phone || "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [twilioOk, setTwilioOk] = useState<boolean | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [hintCountry, setHintCountry] = useState<string | null>(null);
  /** True once the user types in the phone field — do not overwrite. */
  const userEditedPhone = useRef(
    Boolean(defaultPhone || (saved.phone && saved.phone.replace(/\D/g, "").length > 4)),
  );

  useEffect(() => {
    // Hydrate from localStorage after mount (SSR-safe)
    const s = readSavedLogin();
    if (s.name && !displayName) setDisplayName(s.name);
    if (s.phone && phone.replace(/\D/g, "").length <= 4) {
      setPhone(s.phone);
      userEditedPhone.current = true;
    }

    void fetchAuthConfig()
      .then((c) => {
        setTwilioOk(c.twilioConfigured);
      })
      .catch(() => setTwilioOk(false));

    // Prefill country dial code from visitor IP only when no saved full number
    void fetchPhoneHint()
      .then((h) => {
        if (!h.prefix) return;
        setPhoneHint(h.prefix);
        setHintCountry(h.country || h.countryCode || null);
        if (userEditedPhone.current) return;
        setPhone((current) => {
          const digits = current.replace(/\D/g, "");
          // User already typed a real number or we restored one
          if (digits.length > 4) return current;
          if (!current || current === "+" || !current.trim()) {
            return `${h.prefix} `;
          }
          return current;
        });
      })
      .catch(() => {
        /* geo optional */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
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
      saveLoginHints(res.phone, name);
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
      saveLoginHints(res.user.phone || phone, res.user.displayName || displayName);
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
          <form
            className="mt-8 space-y-3"
            autoComplete="on"
            method="post"
            name="busyproxy-login"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <input
              className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
              placeholder="Display name"
              name="name"
              id="bp-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              // Nickname only — not email login
              autoComplete="nickname"
              autoCapitalize="words"
              maxLength={40}
            />
            <input
              className="h-12 w-full rounded-xl border border-border bg-surface px-4 font-mono text-sm outline-none focus:border-primary"
              placeholder={phoneHint ? `${phoneHint} …` : "+ country code and number"}
              name="tel"
              id="bp-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                userEditedPhone.current = true;
                setPhone(e.target.value);
              }}
              inputMode="tel"
              // Browser + OS keyboard autocomplete (saved numbers)
              autoComplete="tel"
              autoCorrect="off"
              spellCheck={false}
            />
          </form>
        ) : (
          <input
            className="mt-8 h-12 w-full rounded-xl border border-border bg-surface px-4 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-primary"
            placeholder="••••••"
            name="one-time-code"
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
          Returning users: use the same phone number.
          {hintCountry && phoneHint
            ? ` · Suggesting ${phoneHint} (${hintCountry})`
            : ""}
          {twilioOk === false && " · SMS not configured"}
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
          <p className="pt-2 text-center text-[11px] text-fg-subtle">
            By continuing you agree to our{" "}
            <a href={TERMS_URL} className="text-primary hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href={PRIVACY_URL} className="text-primary hover:underline">
              Privacy Policy
            </a>
            . Help:{" "}
            <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
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
        <form
          className="mt-6 space-y-3"
          autoComplete="on"
          method="post"
          name="busyproxy-login"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <label className="block text-xs text-fg-muted" htmlFor="bp-web-name">
            Display name
            <Input
              id="bp-web-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="mt-1"
              name="name"
              autoComplete="nickname"
              autoCapitalize="words"
              maxLength={40}
            />
          </label>
          <label className="block text-xs text-fg-muted" htmlFor="bp-web-phone">
            Phone
            <Input
              id="bp-web-phone"
              value={phone}
              onChange={(e) => {
                userEditedPhone.current = true;
                setPhone(e.target.value);
              }}
              placeholder={
                phoneHint ? `${phoneHint} …` : "+ country code and number"
              }
              className="mt-1 font-mono"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
        </form>
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
            name="one-time-code"
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
        Already registered? Enter the same phone number and request a new code.
        {hintCountry && phoneHint
          ? ` Country code ${phoneHint} suggested from your location${hintCountry ? ` (${hintCountry})` : ""}.`
          : ""}
        {twilioOk === false && " SMS is not configured on this server."}
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
      <p className="mt-4 text-center text-[11px] text-fg-subtle">
        By continuing you agree to our{" "}
        <a href={TERMS_URL} className="text-primary hover:underline">
          Terms
        </a>{" "}
        and{" "}
        <a href={PRIVACY_URL} className="text-primary hover:underline">
          Privacy Policy
        </a>
        . Help:{" "}
        <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
    </Card>
  );
}
