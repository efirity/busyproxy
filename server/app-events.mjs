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

/**
 * Allowlisted event types for the earner journey funnel.
 * Order roughly matches install → fully functional for analytics.
 *
 * Journey stages (props.journey_step):
 *  1 installed · 2 opened · 3 consent · 4 login · 5 otp · 6 signed_in
 *  7 home · 8 share · 9 online (fully_functional) · 10 leave/delete
 */
export const EVENT_TYPES = Object.freeze([
  // 1–2 install / open
  "app_installed",
  "app_first_open",
  "app_open",
  "app_background",
  "app_foreground",
  "notif_permission_asked",
  "notif_permission_granted",
  "notif_permission_denied",
  // 3 consent
  "consent_shown",
  "consent_accepted",
  "consent_skipped", // not used yet; reserved
  // 4–6 auth
  "login_screen",
  "login_screen_returning",
  "otp_start",
  "otp_start_ok",
  "otp_start_fail",
  "otp_code_autofill",
  "otp_verify",
  "otp_verify_ok",
  "otp_verify_fail",
  "logged_in",
  "not_logged_in",
  "session_restored",
  "session_expired",
  "logout",
  // 7–9 home / share / online
  "home_ready",
  "network_mode_changed",
  "share_start",
  "share_start_blocked",
  "share_stop",
  "relay_state",
  "tunnel_connecting",
  "tunnel_online",
  "tunnel_offline",
  "fully_functional",
  "egress_ip",
  // 10 account
  "account_open",
  "account_delete_attempt",
  "account_delete_ok",
  "account_delete_fail",
  "support_open",
  // generic
  "error",
  "info",
]);

const TYPE_SET = new Set(EVENT_TYPES);

/** Ordered funnel milestones for journey reconstruction */
export const JOURNEY_MILESTONES = Object.freeze([
  { step: 1, key: "installed", events: ["app_installed", "app_first_open"] },
  { step: 2, key: "opened", events: ["app_open", "app_foreground"] },
  { step: 3, key: "consent", events: ["consent_accepted"] },
  { step: 4, key: "login_screen", events: ["login_screen", "login_screen_returning"] },
  {
    step: 5,
    key: "otp",
    events: ["otp_start", "otp_start_ok", "otp_verify", "otp_verify_ok"],
  },
  { step: 6, key: "signed_in", events: ["otp_verify_ok", "logged_in", "session_restored"] },
  { step: 7, key: "home", events: ["home_ready"] },
  { step: 8, key: "share_started", events: ["share_start"] },
  { step: 9, key: "fully_functional", events: ["tunnel_online", "fully_functional"] },
]);

/** Event types that carry a drop-off / failure reason in props.reason */
const REASON_EVENT_TYPES = new Set([
  "not_logged_in",
  "otp_start_fail",
  "otp_verify_fail",
  "share_start_blocked",
  "account_delete_fail",
  "session_expired",
  "error",
]);

export function categoryForType(type) {
  if (
    type.startsWith("app_") ||
    type.startsWith("notif_")
  ) {
    return "install";
  }
  if (type.startsWith("consent_")) return "consent";
  if (
    type.startsWith("otp_") ||
    type.startsWith("login_") ||
    type.startsWith("session_") ||
    type === "logged_in" ||
    type === "not_logged_in" ||
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
    type === "egress_ip" ||
    type === "fully_functional"
  ) {
    return "relay";
  }
  if (type.startsWith("account_") || type === "support_open") return "account";
  if (type === "error") return "error";
  return "lifecycle";
}

/**
 * From event type strings OR full event objects, compute which journey steps
 * were reached, where the user dropped off, and the last failure reason.
 *
 * @param {string[] | Array<{eventType?: string, type?: string, props?: object, message?: string}>} input
 */
export function summarizeJourney(input = []) {
  const events = Array.isArray(input) ? input : [];
  const types = events.map((e) => {
    if (typeof e === "string") return e;
    return e?.eventType || e?.event_type || e?.type || "";
  }).filter(Boolean);
  const seen = new Set(types);
  const reached = [];
  let lastStep = 0;
  for (const m of JOURNEY_MILESTONES) {
    const hit = m.events.some((e) => seen.has(e));
    if (hit) {
      reached.push(m.key);
      lastStep = m.step;
    }
  }
  const next = JOURNEY_MILESTONES.find((m) => m.step === lastStep + 1);

  // Newest-first list preferred; also accept chronological
  const objects = events.filter((e) => e && typeof e === "object");
  let lastNotLoggedInReason = null;
  let lastFailReason = null;
  let lastFailType = null;
  let lastFailMessage = null;
  for (const e of objects) {
    const t = e.eventType || e.event_type || e.type || "";
    const props = e.props || {};
    const reason =
      props.reason != null
        ? String(props.reason)
        : props.reasonCode != null
          ? String(props.reasonCode)
          : null;
    if (t === "not_logged_in" && reason && !lastNotLoggedInReason) {
      lastNotLoggedInReason = reason;
    }
    if (REASON_EVENT_TYPES.has(t) && !lastFailType) {
      lastFailType = t;
      lastFailReason = reason;
      lastFailMessage = e.message || props.error || null;
    }
  }

  return {
    reachedSteps: reached,
    lastStep,
    lastStepKey: JOURNEY_MILESTONES.find((m) => m.step === lastStep)?.key || null,
    droppedAt: next?.key || (lastStep >= 9 ? null : "unknown"),
    fullyFunctional: lastStep >= 9,
    /** Why they are not logged in / last auth friction */
    notLoggedInReason: lastNotLoggedInReason,
    /** Last failure-ish event for drop-off debugging */
    lastBlock: lastFailType
      ? {
          type: lastFailType,
          reason: lastFailReason,
          message: lastFailMessage,
        }
      : null,
    milestones: JOURNEY_MILESTONES.map((m) => ({
      step: m.step,
      key: m.key,
      done: m.events.some((e) => seen.has(e)),
    })),
  };
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
 * @param {string|null} [opts.deviceId] edge/agent device id
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
  const deviceIdRaw = opts.deviceId || opts.device_id || null;
  const deviceId = deviceIdRaw
    ? String(deviceIdRaw).trim().slice(0, 80)
    : null;
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

    const eventDeviceId = e?.deviceId || e?.device_id || deviceId || null;
    const baseProps = sanitizeProps(e?.props || e?.meta || {});
    // Keep device id in props too so older schema / fallback still filters
    if (eventDeviceId && baseProps.deviceId == null && baseProps.device_id == null) {
      baseProps.deviceId = String(eventDeviceId).slice(0, 80);
    }

    rows.push({
      created_at: ts.toISOString(),
      user_id: opts.userId || null,
      install_id: installId,
      device_id: eventDeviceId ? String(eventDeviceId).slice(0, 80) : null,
      session_token_hash: sessionHash,
      phone: opts.phone || e?.phone || null,
      event_type: type,
      event_category: categoryForType(type),
      message: e?.message != null ? String(e.message).slice(0, 500) : null,
      props: baseProps,
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
      let insertError = null;
      {
        const { error, count } = await sb.from("app_events").insert(rows, {
          count: "exact",
        });
        insertError = error;
        if (!error) {
          inserted = count ?? rows.length;
          storage = "supabase";
        }
      }
      // Column missing before migration 006 — retry without device_id
      if (
        insertError &&
        /device_id|column/i.test(String(insertError.message || insertError))
      ) {
        const withoutCol = rows.map(({ device_id: _d, ...rest }) => rest);
        const { error, count } = await sb
          .from("app_events")
          .insert(withoutCol, { count: "exact" });
        if (error) throw error;
        inserted = count ?? withoutCol.length;
        storage = "supabase";
      } else if (insertError) {
        throw insertError;
      }
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

  return { ok: true, inserted, storage, deviceId: deviceId || null };
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
 * Admin: list events for a user id and/or install id / device id / phone.
 * deviceId = edge agent device id (preferred for multi-device users).
 * installId = stable per app install (always present on events).
 */
export async function listAppEvents(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
  const userId = query.userId || query.user_id || null;
  const installId = query.installId || query.install_id || null;
  const deviceId = query.deviceId || query.device_id || null;
  const phone = query.phone || null;
  const eventType = query.eventType || query.event_type || null;
  /** Optional second install id (from edge device) when filtering by device */
  const altInstallId = query.altInstallId || query.alt_install_id || null;

  if (supabaseConfigured()) {
    try {
      const sb = getSupabaseAdmin();
      const selectCols =
        "id, created_at, user_id, install_id, device_id, phone, event_type, event_category, message, props, app_version, platform, device_model, os_version, client_ip";
      let q = sb
        .from("app_events")
        .select(selectCols)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit * 3, 500)); // over-fetch then filter device in props
      if (userId) q = q.eq("user_id", userId);
      if (installId) q = q.eq("install_id", installId);
      if (phone) q = q.eq("phone", phone);
      if (eventType) q = q.eq("event_type", eventType);
      // Prefer column filter when deviceId set; props fallback applied below
      if (deviceId && !installId && !altInstallId) {
        q = q.eq("device_id", deviceId);
      }
      let { data, error } = await q;
      // Older schema without device_id column
      if (error && /device_id|column/i.test(String(error.message || error))) {
        q = sb
          .from("app_events")
          .select(
            "id, created_at, user_id, install_id, phone, event_type, event_category, message, props, app_version, platform, device_model, os_version, client_ip",
          )
          .order("created_at", { ascending: false })
          .limit(Math.min(limit * 3, 500));
        if (userId) q = q.eq("user_id", userId);
        if (installId) q = q.eq("install_id", installId);
        if (phone) q = q.eq("phone", phone);
        if (eventType) q = q.eq("event_type", eventType);
        ({ data, error } = await q);
      }
      if (error) throw error;
      let events = (data || []).map(mapRow);
      events = filterEventsForDevice(events, {
        deviceId,
        installId,
        altInstallId,
      }).slice(0, limit);
      return {
        ok: true,
        source: "supabase",
        events,
        journey: summarizeJourney(events),
        devices: summarizeEventDevices(events),
        retentionDays: 14,
      };
    } catch (err) {
      console.warn("[app-events] list supabase:", err?.message || err);
    }
  }

  // Fallback file
  let events = readFallback()
    .filter((r) => {
      if (userId && r.user_id !== userId) return false;
      if (installId && r.install_id !== installId) return false;
      if (phone && r.phone !== phone) return false;
      if (eventType && r.event_type !== eventType) return false;
      return true;
    })
    .map(mapRow);
  events = filterEventsForDevice(events, {
    deviceId,
    installId,
    altInstallId,
  }).slice(0, limit);

  return {
    ok: true,
    source: "fallback_file",
    events,
    journey: summarizeJourney(events),
    devices: summarizeEventDevices(events),
    retentionDays: 14,
  };
}

function eventDeviceId(e) {
  if (e.deviceId) return String(e.deviceId);
  const p = e.props || {};
  if (p.deviceId) return String(p.deviceId);
  if (p.device_id) return String(p.device_id);
  return null;
}

/**
 * When filtering by device: match device_id column, props.deviceId, or install ids.
 */
function filterEventsForDevice(events, { deviceId, installId, altInstallId }) {
  if (!deviceId && !installId && !altInstallId) return events;
  // Pure install filter already applied in SQL/file for installId alone
  if (!deviceId && !altInstallId) return events;
  const installSet = new Set(
    [installId, altInstallId].filter(Boolean).map(String),
  );
  return events.filter((e) => {
    const did = eventDeviceId(e);
    if (deviceId && did && did === deviceId) return true;
    if (deviceId && e.installId && installSet.has(String(e.installId))) return true;
    if (!deviceId && e.installId && installSet.has(String(e.installId))) return true;
    // device filter without install mapping: only exact device id
    if (deviceId && !installSet.size) return did === deviceId;
    return false;
  });
}

/** Distinct devices / installs in a result set (for UI filter chips). */
export function summarizeEventDevices(events = []) {
  const byInstall = new Map();
  for (const e of events) {
    const iid = e.installId || "unknown";
    const cur = byInstall.get(iid) || {
      installId: iid,
      deviceId: eventDeviceId(e),
      deviceModel: e.deviceModel || null,
      platform: e.platform || null,
      count: 0,
      lastAt: null,
    };
    cur.count += 1;
    if (!cur.deviceId) cur.deviceId = eventDeviceId(e);
    if (!cur.deviceModel && e.deviceModel) cur.deviceModel = e.deviceModel;
    if (!cur.lastAt || String(e.createdAt) > String(cur.lastAt)) {
      cur.lastAt = e.createdAt;
    }
    byInstall.set(iid, cur);
  }
  return [...byInstall.values()].sort((a, b) =>
    String(b.lastAt || "").localeCompare(String(a.lastAt || "")),
  );
}

function mapRow(r) {
  const props = r.props || {};
  const deviceId =
    r.device_id ||
    props.deviceId ||
    props.device_id ||
    null;
  return {
    id: r.id || null,
    createdAt: r.created_at,
    userId: r.user_id,
    installId: r.install_id,
    deviceId: deviceId ? String(deviceId) : null,
    phone: r.phone,
    eventType: r.event_type,
    eventCategory: r.event_category,
    message: r.message,
    props,
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
