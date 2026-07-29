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

/**
 * Start OTP for phone. Only the configured test number receives real SMS.
 */
export async function startOtp(phoneRaw, { userAgent, ip } = {}) {
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

  const code = randomCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + otpTtlMs).toISOString();
  const sb = getSupabaseAdmin();

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

  const body = `Relay code: ${code}. Valid 10 minutes. Do not share.`;
  const msg = await sendSms(phone, body);

  await sb
    .from("otp_challenges")
    .update({ twilio_sid: msg.sid || null })
    .eq("id", challenge.id);

  return {
    ok: true,
    challengeId: challenge.id,
    phone,
    expiresInSec: Math.floor(otpTtlMs / 1000),
    message: `Code sent to ${phone}`,
    // never return the code in production responses
  };
}

export async function verifyOtp(phoneRaw, code, { userAgent, ip } = {}) {
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

  // upsert user
  let { data: user } = await sb
    .from("users")
    .select(
      "id, phone, display_name, email, country_code, status, stripe_connect_account_id, payout_ready, created_at",
    )
    .eq("phone", phone)
    .maybeSingle();

  if (!user) {
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
        display_name: "Earner",
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
      name: "My phone",
      platform: "android",
      status: "offline",
      wifi_only: false,
      last_seen_at: new Date().toISOString(),
      country_code: user.country_code,
    });
  } else {
    await sb
      .from("users")
      .update({
        phone_verified_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

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

  return {
    ok: true,
    token,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      phone: user.phone,
      displayName: user.display_name,
      email: user.email,
      country: user.country_code,
      status: user.status,
      payoutReady: user.payout_ready,
      createdAt: user.created_at,
    },
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
    user: {
      id: user.id,
      phone: user.phone,
      displayName: user.display_name,
      email: user.email,
      country: user.country_code,
      status: user.status,
      payoutReady: user.payout_ready,
      createdAt: user.created_at,
      stripeAccountId: user.stripe_connect_account_id,
    },
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
  return {
    id: data.id,
    phone: data.phone,
    displayName: data.display_name,
    email: data.email,
    country: data.country_code,
    status: data.status,
    payoutReady: data.payout_ready,
    createdAt: data.created_at,
  };
}

export function authPublicConfig() {
  return {
    twilioConfigured: twilioConfigured(),
    testNumber,
    otpLength: 6,
    expiresInSec: Math.floor(otpTtlMs / 1000),
  };
}
