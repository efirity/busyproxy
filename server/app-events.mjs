/**
 * Client lifecycle / funnel events → Supabase app_events (+ local fallback log).
 * Retention: 14 days (purge on write + optional pg_cron).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin, supabaseConfigured } from "./supabase.mjs";

const DATA_DIR = path.join(process.cwd(), ".data");
const FALLBACK_PATH = path.join(DATA_DIR, "app-events-fallback.jsonl");
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_BATCH = 50;
const MAX_PROPS_BYTES = 4000;

/** @type {number} */
let lastPurgeAt = 0;

/** Allowlisted event types for the earner funnel */
export const EVENT_TYPES = Object.freeze([
  // install / open
  "app_first_open",
  "app_open",
  "app_background",
  "app_foreground",
  // consent
  "consent_shown",
  "consent_accepted",
  // auth
  "login_screen",
  "otp_start",
  "otp_start_ok",
  "otp_start_fail",
  "otp_verify",
  "otp_verify_ok",
  "otp_verify_fail",
  "session_restored",
  "logout",
  // home / share
  "home_ready",
  "network_mode_changed",
  "share_start",
  "share_stop",
  "relay_state",
  "tunnel_online",
  "tunnel_offline",
  "egress_ip",
  // account
  "account_open",
  "account_delete_attempt",
  "account_delete_ok",
  "account_delete_fail",
  // generic
  "error",
  "info",
]);

const TYPE_SET = new Set(EVENT_TYPES);

export function categoryForType(type) {
  if (type.startsWith("app_")) return "install";
  if (type.startsWith("consent_")) return "consent";
  if (
    type.startsWith("otp_") ||
    type === "login_screen" ||
    type === "session_restored" ||
    type === "logout"
  ) {
    return "auth";
  }
  if (
    type.startsWith("share_") ||
    type.startsWith("relay_") ||
    type.startsWith("tunnel_") ||
    type === "home_ready" ||
    type === "network_mode_changed" ||
    type === "egress_ip"
  ) {
    return "relay";
  }
  if (type.startsWith("account_")) return "account";
  if (type === "error") return "error";
  return "lifecycle";
}

function hashToken(token) {
  if (!token) return null;
  return crypto.createHash("sha256").update(String(token)).digest("hex").slice(0, 32);
}

function sanitizeProps(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  let json;
  try {
    json = JSON.stringify(raw);
  } catch {
    return {};
  }
  if (json.length > MAX_PROPS_BYTES) {
    return { _truncated: true, preview: json.slice(0, 500) };
  }
  // strip obvious secrets
  const out = { ...raw };
  for (const k of Object.keys(out)) {
    if (/secret|password|token|authorization/i.test(k)) {
      out[k] = "[redacted]";
    }
  }
  return out;
}

/**
 * @param {object} opts
 * @param {Array<object>} opts.events
 * @param {string} opts.installId
 * @param {string|null} [opts.userId]
 * @param {string|null} [opts.phone]
 * @param {string|null} [opts.sessionToken]
 * @param {string|null} [opts.clientIp]
 * @param {string|null} [opts.appVersion]
 * @param {string|null} [opts.platform]
 * @param {string|null} [opts.deviceModel]
 * @param {string|null} [opts.osVersion]
 */
export async function ingestAppEvents(opts) {
  const installId = String(opts.installId || "").trim().slice(0, 80);
  if (!installId || installId.length < 8) {
    throw Object.assign(new Error("installId required (min 8 chars)"), {
      status: 400,
    });
  }
  const rawEvents = Array.isArray(opts.events) ? opts.events : [];
  if (!rawEvents.length) {
    throw Object.assign(new Error("events array required"), { status: 400 });
  }
  if (rawEvents.length > MAX_BATCH) {
    throw Object.assign(new Error(`max ${MAX_BATCH} events per batch`), {
      status: 400,
    });
  }

  const sessionHash = hashToken(opts.sessionToken);
  const rows = [];
  const now = Date.now();

  for (const e of rawEvents) {
    const type = String(e?.type || e?.event_type || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 64);
    if (!type || !TYPE_SET.has(type)) {
      // skip unknown rather than fail whole batch
      continue;
    }
    let createdAt = e?.at || e?.createdAt || e?.ts;
    let ts = createdAt ? new Date(createdAt) : new Date(now);
    if (Number.isNaN(ts.getTime())) ts = new Date(now);
    // reject far-future / ancient
    if (ts.getTime() > now + 60_000) ts = new Date(now);
    if (ts.getTime() < now - RETENTION_MS) continue;

    rows.push({
      created_at: ts.toISOString(),
      user_id: opts.userId || null,
      install_id: installId,
      session_token_hash: sessionHash,
      phone: opts.phone || e?.phone || null,
      event_type: type,
      event_category: categoryForType(type),
      message: e?.message != null ? String(e.message).slice(0, 500) : null,
      props: sanitizeProps(e?.props || e?.meta || {}),
      app_version: opts.appVersion || e?.appVersion || null,
      platform: opts.platform || e?.platform || "android",
      device_model: opts.deviceModel || e?.deviceModel || null,
      os_version: opts.osVersion || e?.osVersion || null,
      client_ip: opts.clientIp || null,
    });
  }

  if (!rows.length) {
    return { ok: true, inserted: 0, skipped: rawEvents.length };
  }

  let inserted = 0;
  let storage = "none";

  if (supabaseConfigured()) {
    try {
      const sb = getSupabaseAdmin();
      const { error, count } = await sb.from("app_events").insert(rows, {
        count: "exact",
      });
      if (error) throw error;
      inserted = count ?? rows.length;
      storage = "supabase";
      await maybePurgeOldEvents(sb);
    } catch (err) {
      console.warn("[app-events] supabase insert failed:", err?.message || err);
      appendFallback(rows);
      inserted = rows.length;
      storage = "fallback_file";
    }
  } else {
    appendFallback(rows);
    inserted = rows.length;
    storage = "fallback_file";
  }

  return { ok: true, inserted, storage };
}

function appendFallback(rows) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const lines = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    fs.appendFileSync(FALLBACK_PATH, lines);
  } catch (err) {
    console.warn("[app-events] fallback write failed:", err?.message || err);
  }
}

async function maybePurgeOldEvents(sb) {
  const now = Date.now();
  // at most once per hour
  if (now - lastPurgeAt < 60 * 60 * 1000) return;
  lastPurgeAt = now;
  const cutoff = new Date(now - RETENTION_MS).toISOString();
  try {
    await sb.from("app_events").delete().lt("created_at", cutoff);
  } catch (err) {
    console.warn("[app-events] purge failed:", err?.message || err);
  }
}

/**
 * Admin: list events for a user id and/or install id / phone.
 */
export async function listAppEvents(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
  const userId = query.userId || query.user_id || null;
  const installId = query.installId || query.install_id || null;
  const phone = query.phone || null;
  const eventType = query.eventType || query.event_type || null;

  if (supabaseConfigured()) {
    try {
      const sb = getSupabaseAdmin();
      let q = sb
        .from("app_events")
        .select(
          "id, created_at, user_id, install_id, phone, event_type, event_category, message, props, app_version, platform, device_model, os_version, client_ip",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (userId) q = q.eq("user_id", userId);
      if (installId) q = q.eq("install_id", installId);
      if (phone) q = q.eq("phone", phone);
      if (eventType) q = q.eq("event_type", eventType);
      const { data, error } = await q;
      if (error) throw error;
      return {
        ok: true,
        source: "supabase",
        events: (data || []).map(mapRow),
        retentionDays: 14,
      };
    } catch (err) {
      console.warn("[app-events] list supabase:", err?.message || err);
    }
  }

  // Fallback file
  const events = readFallback()
    .filter((r) => {
      if (userId && r.user_id !== userId) return false;
      if (installId && r.install_id !== installId) return false;
      if (phone && r.phone !== phone) return false;
      if (eventType && r.event_type !== eventType) return false;
      return true;
    })
    .slice(0, limit)
    .map(mapRow);

  return { ok: true, source: "fallback_file", events, retentionDays: 14 };
}

function mapRow(r) {
  return {
    id: r.id || null,
    createdAt: r.created_at,
    userId: r.user_id,
    installId: r.install_id,
    phone: r.phone,
    eventType: r.event_type,
    eventCategory: r.event_category,
    message: r.message,
    props: r.props || {},
    appVersion: r.app_version,
    platform: r.platform,
    deviceModel: r.device_model,
    osVersion: r.os_version,
    clientIp: r.client_ip,
  };
}

function readFallback() {
  try {
    if (!fs.existsSync(FALLBACK_PATH)) return [];
    const lines = fs.readFileSync(FALLBACK_PATH, "utf8").split("\n").filter(Boolean);
    const cutoff = Date.now() - RETENTION_MS;
    const rows = [];
    for (const line of lines.slice(-2000)) {
      try {
        const r = JSON.parse(line);
        const t = new Date(r.created_at).getTime();
        if (t >= cutoff) rows.push(r);
      } catch {
        /* skip */
      }
    }
    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return rows;
  } catch {
    return [];
  }
}

/** One-shot SQL apply helper message for operators */
export function appEventsSchemaHint() {
  return "Apply docs/supabase/005_app_events.sql in Supabase SQL editor (or scripts/apply-app-events-sql.mjs).";
}
