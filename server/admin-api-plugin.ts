/**
 * Operator admin APIs — platform-wide users, wallets, withdrawals, devices.
 * Requires admin phone session (or EDGE_ADMIN_TOKEN).
 */
import type { Plugin } from "vite";
import {
  isEdgeAdminApiToken,
  requireAdminSession,
} from "./twilio-auth.mjs";
import {
  getSupabaseAdmin,
  supabaseConfigured,
} from "./supabase.mjs";
import { getEdgeGateway } from "./edge-gateway.mjs";
import { listAppEvents } from "./app-events.mjs";

function bearer(req: { headers: { authorization?: string | string[] } }) {
  const h = req.headers.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  if (!v) return null;
  const m = /^Bearer\s+(.+)$/i.exec(v);
  return m?.[1] || null;
}

async function assertAdmin(req: {
  headers: { authorization?: string | string[] };
}) {
  const token = bearer(req);
  if (!token) {
    const err = new Error("Admin login required");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (isEdgeAdminApiToken(token)) {
    return { user: { id: "edge-admin-token", phone: "system", isAdmin: true } };
  }
  return requireAdminSession(token);
}

function cents(n: unknown) {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export function adminApiPlugin(): Plugin {
  return {
    name: "relay-admin-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathOnly = rawUrl.split("?", 1)[0] ?? "";
        if (!pathOnly.startsWith("/api/admin")) {
          next();
          return;
        }

        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(JSON.stringify(body));
        };

        try {
          const method = (req.method ?? "GET").toUpperCase();
          const sub = pathOnly.slice("/api/admin".length) || "/";

          try {
            await assertAdmin(req);
          } catch (err) {
            const status =
              err && typeof err === "object" && "status" in err
                ? Number((err as { status?: number }).status) || 403
                : 403;
            send(status, {
              error: err instanceof Error ? err.message : "Forbidden",
            });
            return;
          }

          if (!supabaseConfigured()) {
            send(503, { error: "Supabase not configured" });
            return;
          }

          const sb = getSupabaseAdmin();
          const edge = getEdgeGateway();
          const liveDevices = edge.listDevices() || [];

          // GET /api/admin/overview
          if ((sub === "/" || sub === "/overview") && method === "GET") {
            const snapshot = await buildAdminSnapshot(sb, liveDevices);
            send(200, snapshot);
            return;
          }

          // GET /api/admin/users — all earners + wallets + devices
          if (sub === "/users" && method === "GET") {
            const snapshot = await buildAdminSnapshot(sb, liveDevices);
            send(200, {
              users: snapshot.users,
              totals: snapshot.totals,
            });
            return;
          }

          // GET /api/admin/withdrawals — all users' payouts
          if (sub === "/withdrawals" && method === "GET") {
            const snapshot = await buildAdminSnapshot(sb, liveDevices);
            send(200, {
              withdrawals: snapshot.withdrawals,
              totals: {
                paidCents: snapshot.totals.paidWithdrawCents,
                pendingCents: snapshot.totals.pendingWithdrawCents,
                count: snapshot.withdrawals.length,
              },
            });
            return;
          }

          // GET /api/admin/users/:id/events — mobile/app lifecycle logs
          if (
            /^\/users\/[^/]+\/events$/.test(sub) &&
            method === "GET"
          ) {
            const userId = decodeURIComponent(
              sub.replace(/^\/users\//, "").replace(/\/events$/, ""),
            );
            const url = new URL(rawUrl, "http://local");
            const result = await listAppEvents({
              userId,
              installId: url.searchParams.get("installId"),
              eventType: url.searchParams.get("eventType"),
              limit: url.searchParams.get("limit"),
            });
            // Also pull events linked only by phone if user known
            const snapshot = await buildAdminSnapshot(sb, liveDevices);
            const user = snapshot.users.find((u) => u.id === userId);
            if (user?.phone && result.events.length < 50) {
              const byPhone = await listAppEvents({
                phone: user.phone,
                limit: 100,
              });
              const seen = new Set(
                result.events.map((e) => e.id || `${e.createdAt}:${e.eventType}`),
              );
              for (const e of byPhone.events) {
                const k = e.id || `${e.createdAt}:${e.eventType}`;
                if (!seen.has(k)) {
                  result.events.push(e);
                  seen.add(k);
                }
              }
              result.events.sort((a, b) =>
                String(b.createdAt).localeCompare(String(a.createdAt)),
              );
              result.events = result.events.slice(0, 200);
            }
            send(200, {
              ...result,
              userId,
              phone: user?.phone || null,
              displayName: user?.displayName || null,
            });
            return;
          }

          // GET /api/admin/events — search by installId / phone / type
          if (sub === "/events" && method === "GET") {
            const url = new URL(rawUrl, "http://local");
            const result = await listAppEvents({
              userId: url.searchParams.get("userId"),
              installId: url.searchParams.get("installId"),
              phone: url.searchParams.get("phone"),
              eventType: url.searchParams.get("eventType"),
              limit: url.searchParams.get("limit"),
            });
            send(200, result);
            return;
          }

          // GET /api/admin/users/:id
          if (sub.startsWith("/users/") && method === "GET") {
            const userId = decodeURIComponent(sub.slice("/users/".length));
            const snapshot = await buildAdminSnapshot(sb, liveDevices);
            const user = snapshot.users.find((u) => u.id === userId);
            if (!user) {
              send(404, { error: "User not found" });
              return;
            }
            const withdrawals = snapshot.withdrawals.filter(
              (w) => w.userId === userId,
            );
            send(200, { user, withdrawals });
            return;
          }

          send(404, { error: "not found" });
        } catch (err) {
          send(500, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    },
  };
}

async function buildAdminSnapshot(
  sb: ReturnType<typeof getSupabaseAdmin>,
  liveDevices: Array<Record<string, unknown>>,
) {
  const [
    { data: users, error: uErr },
    { data: wallets, error: wErr },
    { data: withdrawals, error: wdErr },
    { data: dbDevices, error: dErr },
  ] = await Promise.all([
    sb
      .from("users")
      .select(
        "id, phone, display_name, email, country_code, status, payout_ready, stripe_connect_account_id, created_at, last_login_at",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    sb.from("wallets").select("*").limit(500),
    sb
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    sb
      .from("devices")
      .select(
        "id, user_id, name, platform, status, last_seen_at, country_code, last_network_type",
      )
      .limit(500),
  ]);

  if (uErr) throw new Error(`users: ${uErr.message}`);
  if (wErr) throw new Error(`wallets: ${wErr.message}`);
  if (wdErr) throw new Error(`withdrawals: ${wdErr.message}`);
  if (dErr) throw new Error(`devices: ${dErr.message}`);

  const walletByUser = new Map(
    (wallets || []).map((w: { user_id: string }) => [w.user_id, w]),
  );
  const dbDevByUser = new Map<string, Array<Record<string, unknown>>>();
  for (const d of dbDevices || []) {
    const uid = String((d as { user_id: string }).user_id);
    if (!dbDevByUser.has(uid)) dbDevByUser.set(uid, []);
    dbDevByUser.get(uid)!.push(d as Record<string, unknown>);
  }
  const liveByUser = new Map<string, Array<Record<string, unknown>>>();
  for (const d of liveDevices) {
    const uid = String(d.userId || "unknown");
    if (!liveByUser.has(uid)) liveByUser.set(uid, []);
    liveByUser.get(uid)!.push(d);
  }

  const userRows = (users || []).map((u: Record<string, unknown>) => {
    const id = String(u.id);
    const wallet = walletByUser.get(id) as
      | {
          available_cents?: number;
          pending_withdraw_cents?: number;
          lifetime_earn_cents?: number;
          lifetime_withdrawn_cents?: number;
        }
      | undefined;
    const live = liveByUser.get(id) || [];
    const enrolled = dbDevByUser.get(id) || [];
    return {
      id,
      phone: u.phone as string,
      displayName: (u.display_name as string) || null,
      email: (u.email as string) || null,
      country: (u.country_code as string) || null,
      status: (u.status as string) || "active",
      payoutReady: Boolean(u.payout_ready),
      stripeConnected: Boolean(u.stripe_connect_account_id),
      createdAt: u.created_at as string,
      lastLoginAt: (u.last_login_at as string) || null,
      wallet: {
        availableCents: cents(wallet?.available_cents),
        pendingWithdrawCents: cents(wallet?.pending_withdraw_cents),
        lifetimeEarnCents: cents(wallet?.lifetime_earn_cents),
        lifetimeWithdrawnCents: cents(wallet?.lifetime_withdrawn_cents),
      },
      devices: {
        enrolled: enrolled.length,
        live: live.length,
        online: live.filter((d) => d.online).length,
        liveNames: live.map((d) => String(d.name || d.deviceId)),
        networks: [
          ...new Set(
            live
              .map((d) => String(d.network || d.ipType || ""))
              .filter(Boolean),
          ),
        ],
      },
    };
  });

  const phoneById = new Map(
    userRows.map((u) => [u.id, u.phone] as const),
  );
  const nameById = new Map(
    userRows.map((u) => [u.id, u.displayName] as const),
  );

  const withdrawalRows = (withdrawals || []).map((w: Record<string, unknown>) => {
    const userId = String(w.user_id);
    return {
      id: String(w.id),
      userId,
      phone: phoneById.get(userId) || null,
      displayName: nameById.get(userId) || null,
      amountCents: cents(w.amount_cents),
      status: String(w.status || "unknown"),
      stripeTransferId: (w.stripe_transfer_id as string) || null,
      reviewNote: (w.review_note as string) || null,
      createdAt: w.created_at as string,
      processedAt: (w.processed_at as string) || null,
    };
  });

  const totals = {
    users: userRows.length,
    walletsAvailableCents: userRows.reduce(
      (s, u) => s + u.wallet.availableCents,
      0,
    ),
    walletsPendingCents: userRows.reduce(
      (s, u) => s + u.wallet.pendingWithdrawCents,
      0,
    ),
    lifetimeEarnCents: userRows.reduce(
      (s, u) => s + u.wallet.lifetimeEarnCents,
      0,
    ),
    lifetimeWithdrawnCents: userRows.reduce(
      (s, u) => s + u.wallet.lifetimeWithdrawnCents,
      0,
    ),
    paidWithdrawCents: withdrawalRows
      .filter((w) => w.status === "paid")
      .reduce((s, w) => s + w.amountCents, 0),
    pendingWithdrawCents: withdrawalRows
      .filter((w) => w.status === "pending" || w.status === "review")
      .reduce((s, w) => s + w.amountCents, 0),
    liveDevices: liveDevices.length,
    onlineDevices: liveDevices.filter((d) => d.online).length,
  };

  return {
    generatedAt: new Date().toISOString(),
    totals,
    users: userRows,
    withdrawals: withdrawalRows,
  };
}
