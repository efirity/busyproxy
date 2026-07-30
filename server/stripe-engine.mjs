/**
 * Stripe-only earner payouts via Connect Express + Instant Payouts to debit card.
 *
 * Flow:
 *  1. Earner taps "Link debit card" → Account Link (Express onboarding)
 *  2. Stripe stores card / bank on the connected account (we never touch PAN)
 *  3. Earner cashes out → platform Transfer → Instant Payout on connected account
 *
 * Platform requirement: Stripe Connect must be enabled once:
 *   https://dashboard.stripe.com/test/connect  (test) or /connect (live)
 *
 * Note: "Instant Payouts" on the platform bank account ≠ paying third parties.
 * Paying earners always needs Connect.
 */
import Stripe from "stripe";
import { loadEnv } from "./env.mjs";
import * as sb from "./supabase.mjs";
import * as local from "./stripe-store.mjs";
import { sessionFromToken } from "./twilio-auth.mjs";

loadEnv();

const secret = process.env.STRIPE_SECRET_KEY || "";
const publishable =
  process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUB_KEY || "";
const minWithdraw = Number(process.env.MIN_WITHDRAW_CENTS || 2000);
let platformCurrency = (process.env.STRIPE_CURRENCY || "").toLowerCase();
/** Default Connect country for Express accounts (platform is SG) */
const DEFAULT_CONNECT_COUNTRY = (
  process.env.STRIPE_CONNECT_COUNTRY || "SG"
).toUpperCase();

const DEMO_PHONE = process.env.RELAY_DEMO_PHONE || "+37360123456";
const SEED_EARNINGS_CENTS = Number(process.env.SEED_EARNINGS_CENTS || 2850);

export function createStripeEngine() {
  if (!secret || !secret.startsWith("sk_")) {
    console.warn("[stripe] STRIPE_SECRET_KEY missing or invalid");
  }

  const stripe = secret ? new Stripe(secret) : null;
  let useSupabase = sb.supabaseConfigured();
  const isTestMode = Boolean(secret.includes("test"));

  async function ensureCurrency() {
    if (platformCurrency || !stripe) return platformCurrency || "sgd";
    try {
      const balance = await stripe.balance.retrieve();
      const cur =
        balance.available?.[0]?.currency ||
        balance.pending?.[0]?.currency ||
        "sgd";
      platformCurrency = cur;
    } catch {
      platformCurrency = "sgd";
    }
    return platformCurrency;
  }

  async function resolveUser(opts = {}) {
    const { userId, token } = opts;
    if (!useSupabase) return null;
    try {
      if (token) {
        const session = await sessionFromToken(token);
        if (session?.user?.id) {
          return await sb.getUserWithWallet(session.user.id);
        }
      }
      if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
        return await sb.getUserWithWallet(userId);
      }
      await sb.ensureDemoUser();
      return await sb.getUserWithWallet(DEMO_PHONE);
    } catch (err) {
      console.warn("[supabase] resolveUser failed:", err);
      useSupabase = false;
      return null;
    }
  }

  function publicConfig() {
    return {
      publishableKey: publishable,
      minWithdrawCents: minWithdraw,
      mode: isTestMode ? "test" : "live",
      configured: Boolean(stripe),
      currency: platformCurrency || "sgd",
      payoutMode: "stripe_instant",
      connectCountry: DEFAULT_CONNECT_COUNTRY,
      /** User-facing only — no vendor DB names */
      message:
        "Link a debit card once with Stripe, then cash out instantly when you hit the minimum.",
    };
  }

  async function listPayoutMethods(accountId) {
    if (!stripe || !accountId) return [];
    const methods = [];
    try {
      const cards = await stripe.accounts.listExternalAccounts(accountId, {
        object: "card",
        limit: 10,
      });
      for (const c of cards.data) {
        methods.push({
          id: c.id,
          type: "card",
          brand: c.brand,
          last4: c.last4,
          expMonth: c.exp_month,
          expYear: c.exp_year,
          funding: c.funding, // debit | credit | prepaid | unknown
          default: Boolean(c.default_for_currency),
        });
      }
    } catch (err) {
      console.warn("[stripe] list cards", err.message);
    }
    try {
      const banks = await stripe.accounts.listExternalAccounts(accountId, {
        object: "bank_account",
        limit: 5,
      });
      for (const b of banks.data) {
        methods.push({
          id: b.id,
          type: "bank_account",
          bankName: b.bank_name,
          last4: b.last4,
          currency: b.currency,
          default: Boolean(b.default_for_currency),
        });
      }
    } catch (err) {
      console.warn("[stripe] list banks", err.message);
    }
    return methods;
  }

  function mapWallet(full, extra = {}) {
    const w = Array.isArray(full.wallets) ? full.wallets[0] : full.wallets;
    const available = w?.available_cents ?? 0;
    const connected = Boolean(full.stripe_connect_account_id);
    const ready = Boolean(full.payout_ready);
    return {
      userId: full.id,
      phone: full.phone,
      displayName: full.display_name || "Earner",
      email: full.email ?? null,
      availableCents: available,
      pendingWithdrawCents: w?.pending_withdraw_cents ?? 0,
      lifetimeEarnCents: w?.lifetime_earn_cents ?? 0,
      lifetimeWithdrawnCents: w?.lifetime_withdrawn_cents ?? 0,
      stripeAccountId: full.stripe_connect_account_id,
      payoutsEnabled: ready,
      detailsSubmitted: ready,
      cardLinked: Boolean(extra.cardLinked ?? (extra.methods || []).some((m) => m.type === "card")),
      payoutMethods: extra.methods || [],
      minWithdrawCents: minWithdraw,
      currency: platformCurrency || "sgd",
      storage: "supabase",
      country: full.country_code,
      createdAt: full.created_at,
      canWithdraw: available >= minWithdraw && ready && connected,
      payoutMode: "stripe_instant",
    };
  }

  async function walletSnapshot(opts = {}) {
    await ensureCurrency();
    const full = await resolveUser(opts);

    if (!full) {
      const u = local.getUser("u_demo");
      let methods = [];
      if (u.stripeAccountId && stripe) {
        methods = await listPayoutMethods(u.stripeAccountId);
      }
      return {
        userId: u.userId,
        phone: u.phone,
        displayName: u.displayName,
        email: null,
        availableCents: u.availableCents,
        pendingWithdrawCents: u.pendingWithdrawCents,
        lifetimeEarnCents: u.lifetimeEarnCents,
        lifetimeWithdrawnCents: u.lifetimeWithdrawnCents,
        stripeAccountId: u.stripeAccountId,
        payoutsEnabled: u.payoutsEnabled,
        detailsSubmitted: u.detailsSubmitted,
        cardLinked: methods.some((m) => m.type === "card"),
        payoutMethods: methods,
        minWithdrawCents: minWithdraw,
        currency: platformCurrency || "sgd",
        storage: "local",
        canWithdraw:
          u.availableCents >= minWithdraw &&
          u.payoutsEnabled &&
          Boolean(u.stripeAccountId),
        payoutMode: "stripe_instant",
        withdrawals: u.withdrawals || [],
      };
    }

    const w = Array.isArray(full.wallets) ? full.wallets[0] : full.wallets;
    if (
      w &&
      (w.available_cents ?? 0) === 0 &&
      (w.lifetime_earn_cents ?? 0) === 0 &&
      SEED_EARNINGS_CENTS > 0
    ) {
      try {
        await sb.creditWallet(
          full.id,
          SEED_EARNINGS_CENTS,
          "Welcome + demo traffic credit",
        );
        return walletSnapshot(opts);
      } catch (err) {
        console.warn("[stripe] seed wallet failed", err);
      }
    }

    const fresh = await sb.getUserWithWallet(full.id);
    let methods = [];
    if (fresh.stripe_connect_account_id) {
      methods = await listPayoutMethods(fresh.stripe_connect_account_id);
    }
    const withdrawals = await sb.listWithdrawals(fresh.id);
    return {
      ...mapWallet(fresh, {
        methods,
        cardLinked: methods.some((m) => m.type === "card"),
      }),
      withdrawals: withdrawals.map((row) => {
        const note = row.review_note || "";
        const m = note.match(/method:([a-z_]+)/i);
        return {
          id: row.id,
          amountCents: row.amount_cents,
          status: row.status,
          method: m?.[1] || "stripe_instant",
          stripeTransferId: row.stripe_transfer_id || undefined,
          error: note || undefined,
          createdAt: row.created_at,
        };
      }),
    };
  }

  async function refreshAccountStatus(opts = {}) {
    if (!stripe) throw new Error("Stripe not configured");
    await ensureCurrency();
    const snap = await walletSnapshot(opts);
    if (!snap.stripeAccountId) return snap;

    const account = await stripe.accounts.retrieve(snap.stripeAccountId);
    const methods = await listPayoutMethods(snap.stripeAccountId);
    const hasCard = methods.some((m) => m.type === "card");
    const hasBank = methods.some((m) => m.type === "bank_account");
    const ready = Boolean(
      account.payouts_enabled &&
        account.details_submitted &&
        (hasCard || hasBank),
    );

    if (snap.storage === "supabase") {
      await sb.updateUserStripe(snap.userId, { payoutReady: ready });
    } else {
      local.updateUser("u_demo", {
        payoutsEnabled: ready,
        detailsSubmitted: Boolean(account.details_submitted),
      });
    }
    return walletSnapshot(opts);
  }

  async function createOnboardingLink(opts = {}, returnOrigin) {
    if (!stripe) throw new Error("Stripe not configured");
    const currency = await ensureCurrency();
    const snap = await walletSnapshot(opts);
    let accountId = snap.stripeAccountId;
    const country =
      (snap.country && String(snap.country).length === 2
        ? String(snap.country).toUpperCase()
        : null) || DEFAULT_CONNECT_COUNTRY;

    if (!accountId) {
      try {
        const account = await stripe.accounts.create({
          type: "express",
          country,
          email:
            snap.email ||
            `earner+${String(snap.userId).replace(/[^a-z0-9]/gi, "").slice(0, 18)}@busyproxy.net`,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: "individual",
          business_profile: {
            product_description:
              "BusyProxy bandwidth sharing earner — receives payouts for shared traffic",
            mcc: "5734",
            url: "https://busyproxy.net",
          },
          settings: {
            payouts: {
              schedule: { interval: "manual" }, // we trigger Instant Payouts
            },
          },
          metadata: {
            busyproxy_user_id: String(snap.userId),
            phone: String(snap.phone || ""),
          },
          individual: {
            first_name: (snap.displayName || "BusyProxy").split(" ")[0],
            last_name:
              (snap.displayName || "Earner").split(" ").slice(1).join(" ") ||
              "Earner",
            email:
              snap.email ||
              `earner+${String(snap.userId).replace(/[^a-z0-9]/gi, "").slice(0, 12)}@busyproxy.net`,
          },
        });
        accountId = account.id;
        if (snap.storage === "supabase") {
          await sb.updateUserStripe(snap.userId, {
            accountId,
            payoutReady: false,
          });
        } else {
          local.updateUser("u_demo", { stripeAccountId: accountId });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (
          message.toLowerCase().includes("connect") ||
          message.toLowerCase().includes("signed up")
        ) {
          throw new Error(
            "Stripe Connect is not enabled on the platform yet. Open https://dashboard.stripe.com/test/connect (test mode) or https://dashboard.stripe.com/connect (live), complete Connect signup once, then retry “Link debit card”.",
          );
        }
        throw err;
      }
    }

    const origin = (returnOrigin || "http://127.0.0.1:8080").replace(/\/$/, "");
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?stripe=refresh`,
      return_url: `${origin}/dashboard?stripe=return`,
      type: "account_onboarding",
      collect: "eventually_due",
    });

    return {
      url: link.url,
      accountId,
      currency,
      wallet: await walletSnapshot(opts),
    };
  }

  async function createDashboardLink(opts = {}) {
    if (!stripe) throw new Error("Stripe not configured");
    const snap = await walletSnapshot(opts);
    if (!snap.stripeAccountId) throw new Error("Link a debit card first");
    const link = await stripe.accounts.createLoginLink(snap.stripeAccountId);
    return { url: link.url };
  }

  /**
   * Cash out: Transfer to Connect account → Instant Payout to debit card.
   * Falls back to standard payout if Instant is not available for that account.
   */
  async function requestWithdraw(opts = {}, amountCents, _body = {}) {
    if (!stripe) throw new Error("Stripe not configured");
    const currency = await ensureCurrency();
    let snap = await walletSnapshot(opts);
    const amount = Number(amountCents);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }
    if (amount < minWithdraw) {
      throw new Error(`Minimum withdraw is $${(minWithdraw / 100).toFixed(2)}`);
    }
    if (amount > snap.availableCents) {
      throw new Error("Insufficient balance");
    }
    if (!snap.stripeAccountId) {
      throw new Error("Link your debit card first to cash out");
    }

    snap = await refreshAccountStatus(opts);
    if (!snap.payoutsEnabled) {
      throw new Error(
        "Finish linking your debit card (Stripe setup incomplete). Tap “Link debit card” again.",
      );
    }

    const methods = snap.payoutMethods || [];
    const debit =
      methods.find((m) => m.type === "card" && m.funding === "debit") ||
      methods.find((m) => m.type === "card") ||
      methods.find((m) => m.type === "bank_account");
    if (!debit) {
      throw new Error(
        "No card or bank on file yet. Open “Link debit card” and add a debit card in Stripe.",
      );
    }

    // Debit wallet first
    if (snap.storage === "supabase") {
      await sb.patchWallet(snap.userId, {
        available_cents: snap.availableCents - amount,
        pending_withdraw_cents: snap.pendingWithdrawCents + amount,
      });
    } else {
      local.updateUser("u_demo", {
        availableCents: snap.availableCents - amount,
        pendingWithdrawCents: snap.pendingWithdrawCents + amount,
      });
    }

    let withdrawalRow = null;
    if (snap.storage === "supabase") {
      withdrawalRow = await sb.createWithdrawal({
        userId: snap.userId,
        amountCents: amount,
        status: "processing",
        method: "stripe_instant",
        reviewNote: `destination:${debit.type}:${debit.last4 || ""}`,
      });
    }
    const id = withdrawalRow?.id || `w_${Date.now().toString(36)}`;

    try {
      // 1) Move funds platform → connected account
      const transfer = await stripe.transfers.create(
        {
          amount,
          currency,
          destination: snap.stripeAccountId,
          transfer_group: `bp_${snap.userId}`,
          metadata: {
            busyproxy_user_id: String(snap.userId),
            withdrawal_id: id,
            phone: String(snap.phone || ""),
          },
          description: `BusyProxy earner cash-out ${id}`,
        },
        { idempotencyKey: `bp_transfer_${id}` },
      );

      // 2) Instant payout to debit card (or standard if Instant unavailable)
      let payout = null;
      let payoutMethod = "instant";
      try {
        payout = await stripe.payouts.create(
          {
            amount,
            currency,
            method: "instant",
            metadata: {
              busyproxy_user_id: String(snap.userId),
              withdrawal_id: id,
              transfer_id: transfer.id,
            },
            statement_descriptor: "BUSYPROXY",
          },
          {
            stripeAccount: snap.stripeAccountId,
            idempotencyKey: `bp_payout_instant_${id}`,
          },
        );
      } catch (instantErr) {
        const msg =
          instantErr instanceof Error ? instantErr.message : String(instantErr);
        console.warn("[stripe] instant payout failed, trying standard:", msg);
        payoutMethod = "standard";
        payout = await stripe.payouts.create(
          {
            amount,
            currency,
            method: "standard",
            metadata: {
              busyproxy_user_id: String(snap.userId),
              withdrawal_id: id,
              transfer_id: transfer.id,
              instant_error: msg.slice(0, 200),
            },
            statement_descriptor: "BUSYPROXY",
          },
          {
            stripeAccount: snap.stripeAccountId,
            idempotencyKey: `bp_payout_std_${id}`,
          },
        );
      }

      const after = await walletSnapshot(opts);
      if (after.storage === "supabase") {
        await sb.patchWallet(after.userId, {
          pending_withdraw_cents: Math.max(
            0,
            after.pendingWithdrawCents - amount,
          ),
          lifetime_withdrawn_cents: after.lifetimeWithdrawnCents + amount,
        });
        await sb.updateWithdrawal(id, {
          status: "paid",
          stripe_transfer_id: `${transfer.id}|${payout.id}`,
          processed_at: new Date().toISOString(),
          review_note: `method:stripe_${payoutMethod} · ${debit.type} ••••${debit.last4 || ""}`,
        });
        await sb.insertLedger({
          userId: after.userId,
          type: "withdrawal",
          amountCents: -amount,
          balanceAfter: after.availableCents,
          description: `Cash out · ${payoutMethod} · ••••${debit.last4 || ""}`,
          referenceType: "withdrawal",
          referenceId: id,
        });
      } else {
        local.updateUser("u_demo", {
          pendingWithdrawCents: Math.max(
            0,
            after.pendingWithdrawCents - amount,
          ),
          lifetimeWithdrawnCents: after.lifetimeWithdrawnCents + amount,
        });
        local.addWithdrawal("u_demo", {
          id,
          amountCents: amount,
          status: "paid",
          method: `stripe_${payoutMethod}`,
          stripeTransferId: transfer.id,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ok: true,
        method: `stripe_${payoutMethod}`,
        withdrawal: {
          id,
          amountCents: amount,
          status: "paid",
          transferId: transfer.id,
          payoutId: payout.id,
          method: `stripe_${payoutMethod}`,
          destination: {
            type: debit.type,
            brand: debit.brand,
            last4: debit.last4,
          },
        },
        message:
          payoutMethod === "instant"
            ? `$${(amount / 100).toFixed(2)} sent instantly to your debit card ••••${debit.last4 || ""}.`
            : `$${(amount / 100).toFixed(2)} sent to your linked account ••••${debit.last4 || ""} (standard timing).`,
        wallet: await walletSnapshot(opts),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const after = await walletSnapshot(opts);
      const isBalance =
        message.toLowerCase().includes("insufficient") ||
        message.toLowerCase().includes("balance");

      if (isBalance) {
        if (after.storage === "supabase") {
          await sb.updateWithdrawal(id, {
            status: "pending",
            review_note: message,
          });
        }
        return {
          ok: false,
          code: "platform_balance",
          method: "stripe_instant",
          error:
            "Platform payout balance is still settling. In test mode use “Fund payout balance”, wait until available, then retry cash-out.",
          wallet: await walletSnapshot(opts),
          withdrawal: {
            id,
            amountCents: amount,
            status: "pending_platform_funds",
          },
        };
      }

      // refund wallet
      if (after.storage === "supabase") {
        await sb.patchWallet(after.userId, {
          available_cents: after.availableCents + amount,
          pending_withdraw_cents: Math.max(
            0,
            after.pendingWithdrawCents - amount,
          ),
        });
        await sb.updateWithdrawal(id, {
          status: "failed",
          review_note: message,
          processed_at: new Date().toISOString(),
        });
      } else {
        local.updateUser("u_demo", {
          availableCents: after.availableCents + amount,
          pendingWithdrawCents: Math.max(
            0,
            after.pendingWithdrawCents - amount,
          ),
        });
      }

      if (
        message.toLowerCase().includes("connect") ||
        message.toLowerCase().includes("signed up")
      ) {
        throw new Error(
          "Stripe Connect is not enabled on the platform. Complete Connect signup, then retry.",
        );
      }
      throw new Error(message);
    }
  }

  async function fundPlatformTest(amountCents = 10000) {
    if (!stripe) throw new Error("Stripe not configured");
    if (!isTestMode) {
      throw new Error("Fund helper only in test mode");
    }
    const currency = await ensureCurrency();
    // Create charge into platform — often lands in pending first
    const charge = await stripe.charges.create({
      amount: amountCents,
      currency,
      source: "tok_visa",
      description: "BusyProxy platform float for earner payouts",
      metadata: { purpose: "busyproxy_payout_float" },
    });
    const balance = await stripe.balance.retrieve();
    return {
      chargeId: charge.id,
      status: charge.status,
      paid: charge.paid,
      currency,
      available: balance.available,
      pending: balance.pending,
      note:
        "Test charges often sit in pending before available. Instant earner payouts need available platform balance.",
    };
  }

  async function creditDemo(opts = {}, cents = 1000) {
    const snap = await walletSnapshot(opts);
    if (snap.storage === "supabase") {
      await sb.creditWallet(snap.userId, cents, "Demo earnings credit");
    } else {
      local.creditDemoEarnings("u_demo", cents);
    }
    return walletSnapshot(opts);
  }

  async function savePayoutPreference() {
    // Stripe-only — no alternate rails
    return { ok: true, wallet: await walletSnapshot({}) };
  }

  async function verifyConnection() {
    if (!stripe) return { ok: false, error: "not configured" };
    const balance = await stripe.balance.retrieve();
    platformCurrency =
      balance.available?.[0]?.currency ||
      balance.pending?.[0]?.currency ||
      platformCurrency ||
      "sgd";

    let connectEnabled = true;
    let connectError = null;
    try {
      await stripe.accounts.create({
        type: "express",
        country: DEFAULT_CONNECT_COUNTRY,
        capabilities: { transfers: { requested: true } },
        metadata: { probe: "connect_check", ts: String(Date.now()) },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // If create fails for Connect signup, flag it. Other errors may still mean Connect works.
      if (
        message.toLowerCase().includes("connect") ||
        message.toLowerCase().includes("signed up")
      ) {
        connectEnabled = false;
        connectError = message;
      } else {
        // Capability/country errors still mean Connect is on
        connectEnabled = true;
        connectError = null;
      }
    }

    // Prefer list as softer check
    try {
      await stripe.accounts.list({ limit: 1 });
    } catch (err) {
      connectEnabled = false;
      connectError = err instanceof Error ? err.message : String(err);
    }

    return {
      ok: true,
      mode: isTestMode ? "test" : "live",
      currency: platformCurrency,
      available: balance.available,
      pending: balance.pending,
      connectEnabled,
      connectError,
      connectSetupUrl: isTestMode
        ? "https://dashboard.stripe.com/test/connect"
        : "https://dashboard.stripe.com/connect",
      payoutMode: "stripe_instant",
      note: "Earners link a debit card via Connect Express; cash-out uses Transfer + Instant Payout.",
    };
  }

  async function accountBundle(opts = {}) {
    const wallet = await walletSnapshot(opts);
    let ledger = [];
    let devices = [];
    if (wallet.storage === "supabase") {
      try {
        ledger = await sb.listLedger(wallet.userId);
        devices = await sb.listDevices(wallet.userId);
      } catch (err) {
        console.warn("[supabase] accountBundle partial fail", err);
      }
    }
    return {
      wallet,
      ledger: ledger.map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        amountCents: e.amount_cents,
        balanceAfter: e.balance_after_cents,
        at: e.created_at,
      })),
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        platform: d.platform,
        status: d.status,
        wifiOnly: d.wifi_only,
        lastSeen: d.last_seen_at,
        network: d.last_network_type,
        trustScore: d.trust_score,
      })),
    };
  }

  return {
    publicConfig,
    walletSnapshot,
    refreshAccountStatus,
    createOnboardingLink,
    createDashboardLink,
    requestWithdraw,
    fundPlatformTest,
    creditDemo,
    savePayoutPreference,
    verifyConnection,
    accountBundle,
  };
}
