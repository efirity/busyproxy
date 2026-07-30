/**
 * Local persistence for Stripe Connect demo users until Supabase is wired.
 * File-backed so restarts keep connected account IDs.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "stripe-users.json");

/** @typedef {{
 *  userId: string,
 *  phone: string,
 *  displayName: string,
 *  availableCents: number,
 *  pendingWithdrawCents: number,
 *  lifetimeEarnCents: number,
 *  lifetimeWithdrawnCents: number,
 *  stripeAccountId: string | null,
 *  payoutsEnabled: boolean,
 *  detailsSubmitted: boolean,
 *  withdrawals: Array<{
 *    id: string,
 *    amountCents: number,
 *    status: string,
 *    stripeTransferId?: string,
 *    stripePayoutId?: string,
 *    error?: string,
 *    createdAt: string,
 *  }>
 * }} UserRecord
 */

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    /** @type {{ users: Record<string, UserRecord> }} */
    const initial = {
      users: {
        u_demo: {
          userId: "u_demo",
          phone: "+373 60 123 456",
          displayName: "Alex M.",
          availableCents: 1420,
          pendingWithdrawCents: 0,
          lifetimeEarnCents: 6830,
          lifetimeWithdrawnCents: 4000,
          stripeAccountId: null,
          payoutsEnabled: false,
          detailsSubmitted: false,
          withdrawals: [
            {
              id: "w_seed_1",
              amountCents: 2000,
              status: "paid",
              createdAt: "2026-07-20T09:00:00.000Z",
            },
          ],
        },
      },
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2));
  }
}

function read() {
  ensure();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function write(data) {
  ensure();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function getUser(userId = "u_demo") {
  const data = read();
  if (!data.users[userId]) {
    data.users[userId] = {
      userId,
      phone: "+000",
      displayName: "User",
      availableCents: 0,
      pendingWithdrawCents: 0,
      lifetimeEarnCents: 0,
      lifetimeWithdrawnCents: 0,
      stripeAccountId: null,
      payoutsEnabled: false,
      detailsSubmitted: false,
      withdrawals: [],
    };
    write(data);
  }
  return data.users[userId];
}

export function updateUser(userId, patch) {
  const data = read();
  const current = getUser(userId);
  data.users[userId] = { ...current, ...patch };
  write(data);
  return data.users[userId];
}

export function addWithdrawal(userId, withdrawal) {
  const data = read();
  const user = getUser(userId);
  user.withdrawals = [withdrawal, ...(user.withdrawals || [])];
  data.users[userId] = user;
  write(data);
  return user;
}

export function creditDemoEarnings(userId, cents) {
  const user = getUser(userId);
  return updateUser(userId, {
    availableCents: user.availableCents + cents,
    lifetimeEarnCents: user.lifetimeEarnCents + cents,
  });
}

/** Remove local wallet record when the user deletes their account. */
export function deleteUser(userId) {
  if (!userId || userId === "u_demo") return { ok: false };
  const data = read();
  if (!data.users[userId]) return { ok: true, missing: true };
  delete data.users[userId];
  write(data);
  return { ok: true, userId };
}
