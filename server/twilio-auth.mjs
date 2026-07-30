/**
 * Phone OTP auth via Twilio Messages API + Supabase sessions.
 * Real SMS only to TWILIO_TEST_NUMBER_TO_SEND (and same number normalized).
 */
import crypto from "node:crypto";
import { loadEnv } from "./env.mjs";
import { getSupabaseAdmin, supabaseConfigured } from "./supabase.mjs";

loadEnv();

const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_ID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const messagingSid = process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_SERVICE_ID || "";
const fromNumber = process.env.TWILIO_FROM_NUMBER || "";
const testNumber = normalizePhone(process.env.TWILIO_TEST_NUMBER_TO_SEND || "");
const otpTtlMs = 10 * 60 * 1000;
const maxAttempts = 5;

/**
 * Operator admin phones (E.164). Defaults to the Twilio test number so the
 * primary earner/test account is also the only admin console user.
 * Override with comma-separated ADMIN_PHONES.
 */
function adminPhoneSet() {
  const raw =
    process.env.ADMIN_PHONES ||
    process.env.ADMIN_PHONE ||
    process.env.TWILIO_TEST_NUMBER_TO_SEND ||
    "";
  return new Set(
    String(raw)
      .split(/[\s,;]+/)
      .map((p) => normalizePhone(p))
      .filter(Boolean),
  );
}

export function isAdminPhone(phoneRaw) {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return false;
  return adminPhoneSet().has(phone);
}

export function listAdminPhones() {
  return [...adminPhoneSet()];
}

function publicUser(user) {
  if (!user) return null;
  const isAdmin = isAdminPhone(user.phone) || user.is_admin === true;
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.display_name,
    email: user.email,
    country: user.country_code,
    status: user.status,
    payoutReady: user.payout_ready,
    createdAt: user.created_at,
    stripeAccountId: user.stripe_connect_account_id,
    isAdmin: Boolean(isAdmin),
    role: isAdmin ? "admin" : "earner",
  };
}

/** Resolve session; null if missing/expired. */
export async function requireSession(token) {
  return sessionFromToken(token);
}

/** Resolve session and require admin role (phone allowlist). */
export async function requireAdminSession(token) {
  const session = await sessionFromToken(token);
  if (!session) {
    const err = new Error("Not signed in");
    err.status = 401;
    err.code = "unauthorized";
    throw err;
  }
  if (!session.user?.isAdmin) {
    const err = new Error(
      "Admin only — this phone is not an operator account",
    );
    err.status = 403;
    err.code = "forbidden_not_admin";
    throw err;
  }
  return session;
}

/** Shared secret for server/automation (optional). */
export function isEdgeAdminApiToken(token) {
  const secret =
    process.env.EDGE_ADMIN_TOKEN ||
    process.env.ADMIN_API_TOKEN ||
    "";
  return Boolean(secret && token && token === secret);
}

export function normalizePhone(input) {
  if (!input) return "";
  const digits = String(input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return "+" + digits.slice(1).replace(/\D/g, "");
  const only = digits.replace(/\D/g, "");
  if (only.startsWith("00")) return "+" + only.slice(2);
  if (only.startsWith("373")) return "+" + only;
  if (only.length === 8 && only.startsWith("6")) return "+373" + only;
  return only ? "+" + only : "";
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomCode() {
  return String(crypto.randomInt(100000, 999999));
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function twilioConfigured() {
  return Boolean(accountSid && authToken && (messagingSid || fromNumber));
}

async function sendSms(to, body) {
  if (!twilioConfigured()) {
    throw new Error("Twilio is not configured");
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("Body", body);
  if (messagingSid) {
    params.set("MessagingServiceSid", messagingSid);
  } else {
    params.set("From", fromNumber);
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error_message || JSON.stringify(data);
    throw new Error(`Twilio SMS failed: ${msg}`);
  }
  return data;
}

/** Pending display names from /otp/start until /otp/verify (single-process). */
const pendingDisplayNames = new Map();

/**
 * Sanitize display name (username-style label, not a unique login id).
 * Login remains phone + OTP.
 */
export function sanitizeDisplayName(raw) {
  if (raw == null) return "";
  let s = String(raw)
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (s.length > 40) s = s.slice(0, 40).trim();
  return s;
}

function requireDisplayName(raw) {
  const name = sanitizeDisplayName(raw);
  if (name.length < 2) {
    throw new Error("Enter a display name (at least 2 characters)");
  }
  if (name.length > 40) {
    throw new Error("Display name must be 40 characters or less");
  }
  // Block pure phone-looking names
  if (/^\+?\d[\d\s-]{6,}$/.test(name)) {
    throw new Error("Use a name, not only a phone number");
  }
  return name;
}

export async function startOtp(phoneRaw, { userAgent, ip, displayName } = {}) {
  if (!supabaseConfigured()) throw new Error("Supabase not configured");
  const phone = normalizePhone(phoneRaw);
  if (!phone || phone.length < 10) {
    throw new Error("Enter a valid phone number with country code");
  }

  const isTestTarget = phone === testNumber;
  if (!isTestTarget) {
    throw new Error(
      `For now, only the test number ${testNumber} can receive OTP. Use that number to log in.`,
    );
  }

  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from("users")
    .select("id, display_name")
    .eq("phone", phone)
    .maybeSingle();

  // New accounts must pick a display name up front (register step)
  let pendingName = null;
  if (!existing) {
    pendingName = requireDisplayName(displayName);
    pendingDisplayNames.set(phone, { name: pendingName, at: Date.now() });
  } else if (displayName != null && String(displayName).trim()) {
    // Returning user may update preferred name on this login
    try {
      pendingName = requireDisplayName(displayName);
      pendingDisplayNames.set(phone, { name: pendingName, at: Date.now() });
    } catch {
      /* ignore weak optional name on returning login */
    }
  }

  const code = randomCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + otpTtlMs).toISOString();

  // invalidate previous open challenges
  await sb
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", phone)
    .is("consumed_at", null);

  const { data: challenge, error } = await sb
    .from("otp_challenges")
    .insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
      channel: "sms",
      attempts: 0,
      twilio_sid: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`otp create: ${error.message}`);

  // Format tuned for Android SMS autofill / User Consent (6-digit code near start)
  const body = `BusyProxy code ${code}. Valid 10 min. Do not share.`;
  const msg = await sendSms(phone, body);

  await sb
    .from("otp_challenges")
    .update({ twilio_sid: msg.sid || null })
    .eq("id", challenge.id);

  return {
    ok: true,
    challengeId: challenge.id,
    phone,
    isNewUser: !existing,
    expiresInSec: Math.floor(otpTtlMs / 1000),
    message: existing
      ? `Code sent to ${phone}`
      : `Code sent to ${phone}. Welcome, ${pendingName}!`,
  };
}

export async function verifyOtp(
  phoneRaw,
  code,
  { userAgent, ip, displayName } = {},
) {
  if (!supabaseConfigured()) throw new Error("Supabase not configured");
  const phone = normalizePhone(phoneRaw);
  const codeStr = String(code || "").replace(/\D/g, "");
  if (codeStr.length !== 6) throw new Error("Enter the 6-digit code");

  const sb = getSupabaseAdmin();
  const { data: challenge, error } = await sb
    .from("otp_challenges")
    .select("*")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!challenge) throw new Error("No active code. Request a new one.");

  if (challenge.expires_at && new Date(challenge.expires_at) < new Date()) {
    await sb
      .from("otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);
    throw new Error("Code expired. Request a new one.");
  }

  const attempts = (challenge.attempts || 0) + 1;
  await sb
    .from("otp_challenges")
    .update({ attempts })
    .eq("id", challenge.id);

  if (attempts > maxAttempts) {
    await sb
      .from("otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);
    throw new Error("Too many attempts. Request a new code.");
  }

  if (hashCode(codeStr) !== challenge.code_hash) {
    throw new Error("Invalid code");
  }

  await sb
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id);

  // Resolve display name: body → pending from start → required for new users
  const pending = pendingDisplayNames.get(phone);
  if (pending && Date.now() - pending.at > otpTtlMs + 60_000) {
    pendingDisplayNames.delete(phone);
  }
  const nameFromClient =
    sanitizeDisplayName(displayName) || pending?.name || "";

  // upsert user
  let { data: user } = await sb
    .from("users")
    .select(
      "id, phone, display_name, email, country_code, status, stripe_connect_account_id, payout_ready, created_at",
    )
    .eq("phone", phone)
    .maybeSingle();

  if (!user) {
    const chosenName = requireDisplayName(
      nameFromClient || displayName || pending?.name,
    );

    const { data: plan } = await sb
      .from("rate_plans")
      .select("id")
      .eq("code", "default")
      .maybeSingle();

    const { data: created, error: cErr } = await sb
      .from("users")
      .insert({
        phone,
        phone_verified_at: new Date().toISOString(),
        display_name: chosenName,
        country_code: phone.startsWith("+373") ? "MD" : null,
        status: "active",
        rate_plan_id: plan?.id ?? null,
        email: null,
        password_hash: null,
        last_login_at: new Date().toISOString(),
      })
      .select(
        "id, phone, display_name, email, country_code, status, stripe_connect_account_id, payout_ready, created_at",
      )
      .single();
    if (cErr) throw new Error(`user create: ${cErr.message}`);
    user = created;

    await sb.from("wallets").insert({
      user_id: user.id,
      available_cents: 0,
      pending_withdraw_cents: 0,
      lifetime_earn_cents: 0,
      lifetime_withdrawn_cents: 0,
    });

    await sb.from("devices").insert({
      user_id: user.id,
      name: chosenName.slice(0, 40) || "My phone",
      platform: "android",
      status: "offline",
      wifi_only: false,
      last_seen_at: new Date().toISOString(),
      country_code: user.country_code,
    });
  } else {
    const patch = {
      phone_verified_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Allow name refresh when client sent one (or pending from start)
    if (nameFromClient.length >= 2) {
      patch.display_name = nameFromClient;
      user.display_name = nameFromClient;
    }
    await sb.from("users").update(patch).eq("id", user.id);
  }

  pendingDisplayNames.delete(phone);

  // session
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: session, error: sErr } = await sb
    .from("sessions")
    .insert({
      user_id: user.id,
      refresh_token_hash: hashToken(token),
      token_hash: hashToken(token),
      user_agent: userAgent || null,
      ip: ip || null,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Admin phones keep operator role; don't overwrite a chosen personal name
  // unless still default placeholder
  if (
    isAdminPhone(user.phone) &&
    (!user.display_name ||
      user.display_name === "Earner" ||
      user.display_name === "Admin")
  ) {
    // Keep "Admin" only if they never set a real name
    if (!nameFromClient || nameFromClient === "Admin") {
      await sb
        .from("users")
        .update({
          display_name: nameFromClient || "Admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      user.display_name = nameFromClient || "Admin";
    }
  }

  return {
    ok: true,
    token,
    expiresAt: session.expires_at,
    user: publicUser(user),
  };
}

export async function sessionFromToken(token) {
  if (!token || !supabaseConfigured()) return null;
  const sb = getSupabaseAdmin();
  const th = hashToken(token);
  const { data: session } = await sb
    .from("sessions")
    .select("id, user_id, expires_at, revoked_at")
    .or(`token_hash.eq.${th},refresh_token_hash.eq.${th}`)
    .maybeSingle();

  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at) < new Date()) return null;

  const { data: user } = await sb
    .from("users")
    .select(
      "id, phone, display_name, email, country_code, status, stripe_connect_account_id, payout_ready, created_at",
    )
    .eq("id", session.user_id)
    .maybeSingle();

  if (!user || user.status === "banned") return null;

  return {
    sessionId: session.id,
    user: publicUser(user),
  };
}

export async function logoutToken(token) {
  if (!token || !supabaseConfigured()) return { ok: true };
  const sb = getSupabaseAdmin();
  const th = hashToken(token);
  await sb
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .or(`token_hash.eq.${th},refresh_token_hash.eq.${th}`);
  return { ok: true };
}

export async function updateProfile(userId, { displayName, email }) {
  const sb = getSupabaseAdmin();
  const patch = { updated_at: new Date().toISOString() };
  if (displayName !== undefined) patch.display_name = displayName;
  if (email !== undefined) {
    patch.email = email ? String(email).trim().toLowerCase() : null;
  }
  const { data, error } = await sb
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select("id, phone, display_name, email, country_code, status, payout_ready, created_at")
    .single();
  if (error) throw new Error(error.message);
  return publicUser(data);
}

export function authPublicConfig() {
  return {
    twilioConfigured: twilioConfigured(),
    testNumber,
    otpLength: 6,
    expiresInSec: Math.floor(otpTtlMs / 1000),
    // Do not list all admin phones publicly — only whether test login applies
    adminLogin: true,
    adminHint: "Operator console requires an admin phone OTP.",
  };
}
