/**
 * Server-side Supabase client (service role). Never import from browser code.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.mjs";

loadEnv();

const url = process.env.SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

export function getSupabaseAdmin() {
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function supabaseConfigured() {
  return Boolean(url && serviceKey);
}

export function publicSupabaseConfig() {
  return {
    url,
    // anon key is public by design; still only used client-side later
    anonKey,
    configured: Boolean(url && serviceKey),
  };
}

export async function ensureDemoUser() {
  const sb = getSupabaseAdmin();
  const phone = process.env.RELAY_DEMO_PHONE || "+37360123456";
  const name = process.env.RELAY_DEMO_NAME || "Alex M.";

  const { data: existing, error: findErr } = await sb
    .from("users")
    .select(
      "id, phone, display_name, email, stripe_connect_account_id, payout_ready, country_code, status, created_at",
    )
    .eq("phone", phone)
    .maybeSingle();

  if (findErr) throw new Error(`users lookup: ${findErr.message}`);

  let user = existing;
  if (!user) {
    const { data: plan } = await sb
      .from("rate_plans")
      .select("id")
      .eq("code", "default")
      .maybeSingle();

    const { data: created, error: createErr } = await sb
      .from("users")
      .insert({
        phone,
        phone_verified_at: new Date().toISOString(),
        display_name: name,
        country_code: "MD",
        status: "active",
        rate_plan_id: plan?.id ?? null,
        email: null,
        password_hash: null,
      })
      .select(
        "id, phone, display_name, email, stripe_connect_account_id, payout_ready, country_code, status, created_at",
      )
      .single();

    if (createErr) throw new Error(`users insert: ${createErr.message}`);
    user = created;

    await sb.from("wallets").insert({
      user_id: user.id,
      available_cents: 1420,
      pending_withdraw_cents: 0,
      lifetime_earn_cents: 6830,
      lifetime_withdrawn_cents: 4000,
    });

    await sb.from("devices").insert({
      user_id: user.id,
      name: "Pixel 8",
      platform: "android",
      status: "sharing",
      wifi_only: false,
      last_seen_at: new Date().toISOString(),
      last_network_type: "cellular",
      country_code: "MD",
      trust_score: 72,
    });

    await sb.from("ledger_entries").insert([
      {
        user_id: user.id,
        type: "bonus",
        amount_cents: 50,
        balance_after_cents: 50,
        description: "Welcome bonus",
      },
      {
        user_id: user.id,
        type: "traffic_earn",
        amount_cents: 1370,
        balance_after_cents: 1420,
        description: "Bandwidth shared (seed)",
      },
    ]);
  }

  const { data: wallet } = await sb
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wallet) {
    await sb.from("wallets").insert({
      user_id: user.id,
      available_cents: 0,
      pending_withdraw_cents: 0,
      lifetime_earn_cents: 0,
      lifetime_withdrawn_cents: 0,
    });
  }

  return user;
}

export async function getWalletRow(userId) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(`wallet: ${error.message}`);
  return data;
}

export async function getUserWithWallet(phoneOrId) {
  const sb = getSupabaseAdmin();
  const isUuid =
    typeof phoneOrId === "string" && /^[0-9a-f-]{36}$/i.test(phoneOrId);

  let q = sb
    .from("users")
    .select(
      "id, phone, display_name, email, stripe_connect_account_id, payout_ready, country_code, status, created_at, wallets(*)",
    );
  q = isUuid ? q.eq("id", phoneOrId) : q.eq("phone", phoneOrId);

  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`user+wallet: ${error.message}`);
  return data;
}

export async function updateUserStripe(userId, { accountId, payoutReady }) {
  const sb = getSupabaseAdmin();
  const patch = {};
  if (accountId !== undefined) patch.stripe_connect_account_id = accountId;
  if (payoutReady !== undefined) patch.payout_ready = payoutReady;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await sb
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select(
      "id, phone, display_name, email, stripe_connect_account_id, payout_ready, country_code, status, created_at",
    )
    .single();
  if (error) throw new Error(`user stripe update: ${error.message}`);
  return data;
}

export async function updateUserEmail(userId, email) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .update({ email, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, email")
    .single();
  if (error) throw new Error(`user email update: ${error.message}`);
  return data;
}

export async function patchWallet(userId, patch) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wallets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(`wallet update: ${error.message}`);
  return data;
}

export async function creditWallet(userId, cents, description = "Demo credit") {
  const sb = getSupabaseAdmin();
  const wallet = await getWalletRow(userId);
  const available = wallet.available_cents + cents;
  const lifetime = wallet.lifetime_earn_cents + cents;
  const updated = await patchWallet(userId, {
    available_cents: available,
    lifetime_earn_cents: lifetime,
  });
  await sb.from("ledger_entries").insert({
    user_id: userId,
    type: cents >= 0 ? "bonus" : "adjustment_debit",
    amount_cents: cents,
    balance_after_cents: available,
    description,
  });
  return updated;
}

export async function listWithdrawals(userId, limit = 20) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("withdrawals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`withdrawals: ${error.message}`);
  return data || [];
}

export async function listLedger(userId, limit = 30) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("ledger_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`ledger: ${error.message}`);
  return data || [];
}

export async function listDevices(userId) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("devices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`devices: ${error.message}`);
  return data || [];
}

export async function createWithdrawal({
  userId,
  amountCents,
  status = "pending",
  stripeTransferId = null,
  reviewNote = null,
  method = null,
}) {
  const sb = getSupabaseAdmin();
  const noteParts = [];
  if (method) noteParts.push(`method:${method}`);
  if (reviewNote) noteParts.push(reviewNote);
  const { data, error } = await sb
    .from("withdrawals")
    .insert({
      user_id: userId,
      amount_cents: amountCents,
      status,
      stripe_transfer_id: stripeTransferId,
      review_note: noteParts.join(" · ") || null,
      processed_at:
        status === "paid" || status === "failed"
          ? new Date().toISOString()
          : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`withdrawal insert: ${error.message}`);
  return data;
}

export async function updateWithdrawal(id, patch) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("withdrawals")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`withdrawal update: ${error.message}`);
  return data;
}

export async function insertLedger({
  userId,
  type,
  amountCents,
  balanceAfter,
  description,
  referenceType,
  referenceId,
}) {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("ledger_entries").insert({
    user_id: userId,
    type,
    amount_cents: amountCents,
    balance_after_cents: balanceAfter,
    description,
    reference_type: referenceType ?? null,
    reference_id: referenceId ?? null,
  });
  if (error) throw new Error(`ledger insert: ${error.message}`);
}

export async function healthCheck() {
  if (!supabaseConfigured()) {
    return { ok: false, error: "not configured" };
  }
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("rate_plans")
      .select("code, cents_per_gb, min_withdraw_cents")
      .limit(1);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      url,
      plan: data?.[0] ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
