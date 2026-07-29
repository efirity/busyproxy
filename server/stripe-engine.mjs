/**
 * Stripe Connect (Express) + wallet withdraw — backed by Supabase when available,
 * falls back to local file store if Supabase is down.
 */
import Stripe from "stripe";
import { loadEnv } from "./env.mjs";
import * as sb from "./supabase.mjs";
import * as local from "./stripe-store.mjs";

loadEnv();

const secret = process.env.STRIPE_SECRET_KEY || "";
const publishable =
  process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUB_KEY || "";
const minWithdraw = Number(process.env.MIN_WITHDRAW_CENTS || 2000);
let platformCurrency = (process.env.STRIPE_CURRENCY || "").toLowerCase();

const DEMO_PHONE = process.env.RELAY_DEMO_PHONE || "+37360123456";

export function createStripeEngine() {
  if (!secret || !secret.startsWith("sk_")) {
    console.warn("[stripe] STRIPE_SECRET_KEY missing or invalid");
  }

  const stripe = secret ? new Stripe(secret) : null;
  let useSupabase = sb.supabaseConfigured();

  async function ensureCurrency() {
    if (platformCurrency || !stripe) return platformCurrency || "usd";
    try {
      const balance = await stripe.balance.retrieve();
      const cur =
        balance.available?.[0]?.currency ||
        balance.pending?.[0]?.currency ||
        "usd";
      platformCurrency = cur;
    } catch {
      platformCurrency = "usd";
    }
    return platformCurrency;
  }

  async function resolveDemoUser() {
    if (!useSupabase) return null;
    try {
      return await sb.ensureDemoUser();
    } catch (err) {
      console.warn("[supabase] ensureDemoUser failed, using local store:", err);
      useSupabase = false;
      return null;
    }
  }

  function publicConfig() {
    return {
      publishableKey: publishable,
      minWithdrawCents: minWithdraw,
      mode: secret.includes("test") ? "test" : "live",
      configured: Boolean(stripe),
      currency: platformCurrency || "usd",
      supabase: sb.supabaseConfigured(),
    };
  }

  async function walletSnapshot(_legacyId = "u_demo") {
    await ensureCurrency();
    const user = await resolveDemoUser();

    if (!user) {
      const u = local.getUser("u_demo");
      return {
        userId: u.userId,
        phone: u.phone,
        displayName: u.displayName,
        availableCents: u.availableCents,
        pendingWithdrawCents: u.pendingWithdrawCents,
        lifetimeEarnCents: u.lifetimeEarnCents,
        lifetimeWithdrawnCents: u.lifetimeWithdrawnCents,
        stripeAccountId: u.stripeAccountId,
        payoutsEnabled: u.payoutsEnabled,
        detailsSubmitted: u.detailsSubmitted,
        minWithdrawCents: minWithdraw,
        currency: platformCurrency || "usd",
        storage: "local",
        canWithdraw:
          u.availableCents >= minWithdraw &&
          u.payoutsEnabled &&
          Boolean(u.stripeAccountId),
        withdrawals: u.withdrawals || [],
      };
    }

    const full = await sb.getUserWithWallet(user.id);
    const w = Array.isArray(full.wallets) ? full.wallets[0] : full.wallets;
    const withdrawals = await sb.listWithdrawals(user.id);

    return {
      userId: full.id,
      phone: full.phone,
      displayName: full.display_name || "Earner",
      availableCents: w?.available_cents ?? 0,
      pendingWithdrawCents: w?.pending_withdraw_cents ?? 0,
      lifetimeEarnCents: w?.lifetime_earn_cents ?? 0,
      lifetimeWithdrawnCents: w?.lifetime_withdrawn_cents ?? 0,
      stripeAccountId: full.stripe_connect_account_id,
      payoutsEnabled: Boolean(full.payout_ready),
      detailsSubmitted: Boolean(full.payout_ready),
      minWithdrawCents: minWithdraw,
      currency: platformCurrency || "usd",
      storage: "supabase",
      country: full.country_code,
      createdAt: full.created_at,
      canWithdraw:
        (w?.available_cents ?? 0) >= minWithdraw &&
        Boolean(full.payout_ready) &&
        Boolean(full.stripe_connect_account_id),
      withdrawals: withdrawals.map((row) => ({
        id: row.id,
        amountCents: row.amount_cents,
        status: row.status,
        stripeTransferId: row.stripe_transfer_id || undefined,
        error: row.review_note || undefined,
        createdAt: row.created_at,
      })),
    };
  }

  async function refreshAccountStatus() {
    if (!stripe) throw new Error("Stripe not configured");
    await ensureCurrency();
    const snap = await walletSnapshot();
    if (!snap.stripeAccountId) return snap;

    const account = await stripe.accounts.retrieve(snap.stripeAccountId);
    const ready = Boolean(account.payouts_enabled);

    if (snap.storage === "supabase") {
      await sb.updateUserStripe(snap.userId, { payoutReady: ready });
    } else {
      local.updateUser("u_demo", {
        payoutsEnabled: ready,
        detailsSubmitted: Boolean(account.details_submitted),
      });
    }
    return walletSnapshot();
  }

  async function createOnboardingLink(_userId, returnOrigin) {
    if (!stripe) throw new Error("Stripe not configured");
    const currency = await ensureCurrency();
    const snap = await walletSnapshot();
    let accountId = snap.stripeAccountId;
    const country = currency === "sgd" ? "SG" : "US";

    if (!accountId) {
      try {
        const account = await stripe.accounts.create({
          type: "express",
          country,
          email: `relay+${String(snap.userId).replace(/[^a-z0-9]/gi, "").slice(0, 20)}@example.com`,
          capabilities: { transfers: { requested: true } },
          business_type: "individual",
          metadata: {
            relay_user_id: snap.userId,
            phone: snap.phone,
          },
          individual: {
            first_name: (snap.displayName || "Relay").split(" ")[0],
            last_name:
              (snap.displayName || "Earner").split(" ").slice(1).join(" ") ||
              "Earner",
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
        if (message.toLowerCase().includes("connect")) {
          throw new Error(
            "Stripe Connect is not enabled on this account yet. Open https://dashboard.stripe.com/test/connect and get started with Connect (test mode), then retry “Connect Stripe”.",
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
    });

    return {
      url: link.url,
      accountId,
      wallet: await walletSnapshot(),
    };
  }

  async function createDashboardLink() {
    if (!stripe) throw new Error("Stripe not configured");
    const snap = await walletSnapshot();
    if (!snap.stripeAccountId) throw new Error("No Stripe account yet");
    const link = await stripe.accounts.createLoginLink(snap.stripeAccountId);
    return { url: link.url };
  }

  async function requestWithdraw(_userId, amountCents) {
    if (!stripe) throw new Error("Stripe not configured");
    const currency = await ensureCurrency();
    let snap = await walletSnapshot();
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
      throw new Error("Connect Stripe payout method first");
    }

    snap = await refreshAccountStatus();
    if (!snap.payoutsEnabled) {
      throw new Error("Stripe account is not fully onboarded for payouts yet");
    }

    // Hold funds
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
      });
    }

    const id = withdrawalRow?.id || `w_${Date.now().toString(36)}`;

    try {
      const transfer = await stripe.transfers.create(
        {
          amount,
          currency,
          destination: snap.stripeAccountId,
          transfer_group: `relay_${snap.userId}`,
          metadata: {
            relay_user_id: snap.userId,
            withdrawal_id: id,
          },
        },
        { idempotencyKey: `relay_withdraw_${id}` },
      );

      const after = await walletSnapshot();
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
          stripe_transfer_id: transfer.id,
          processed_at: new Date().toISOString(),
        });
        await sb.insertLedger({
          userId: after.userId,
          type: "withdrawal",
          amountCents: -amount,
          balanceAfter: after.availableCents,
          description: "Withdrawal · Stripe",
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
          stripeTransferId: transfer.id,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ok: true,
        withdrawal: {
          id,
          amountCents: amount,
          status: "paid",
          transferId: transfer.id,
        },
        wallet: await walletSnapshot(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const after = await walletSnapshot();
      const isBalance =
        message.toLowerCase().includes("insufficient") ||
        message.toLowerCase().includes("balance");

      if (isBalance) {
        if (after.storage === "supabase") {
          await sb.updateWithdrawal(id, {
            status: "pending",
            review_note: message,
          });
        } else {
          local.addWithdrawal("u_demo", {
            id,
            amountCents: amount,
            status: "pending_platform_funds",
            error: message,
            createdAt: new Date().toISOString(),
          });
        }
        return {
          ok: false,
          code: "platform_balance",
          error:
            "Transfer needs available platform balance (test funds often sit in pending first). Use “Fund platform”, wait until Available > 0 in Stripe, then retry.",
          wallet: await walletSnapshot(),
          withdrawal: {
            id,
            amountCents: amount,
            status: "pending_platform_funds",
          },
        };
      }

      // reverse hold
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
        local.addWithdrawal("u_demo", {
          id,
          amountCents: amount,
          status: "failed",
          error: message,
          createdAt: new Date().toISOString(),
        });
      }
      throw new Error(message);
    }
  }

  async function fundPlatformTest(amountCents = 5000) {
    if (!stripe) throw new Error("Stripe not configured");
    if (!secret.includes("test")) {
      throw new Error("fundPlatformTest only allowed in test mode");
    }
    const currency = await ensureCurrency();
    const charge = await stripe.charges.create({
      amount: amountCents,
      currency,
      source: "tok_visa",
      description: "Relay platform test float",
      metadata: { purpose: "relay_platform_test_float" },
    });
    const balance = await stripe.balance.retrieve();
    return {
      chargeId: charge.id,
      status: charge.status,
      paid: charge.paid,
      currency,
      available: balance.available,
      pending: balance.pending,
      note: "Test card charges often land in pending before available.",
    };
  }

  async function creditDemo(_userId, cents = 1000) {
    const snap = await walletSnapshot();
    if (snap.storage === "supabase") {
      await sb.creditWallet(snap.userId, cents, "Demo earnings credit");
    } else {
      local.creditDemoEarnings("u_demo", cents);
    }
    return walletSnapshot();
  }

  async function verifyConnection() {
    if (!stripe) return { ok: false, error: "not configured" };
    const balance = await stripe.balance.retrieve();
    platformCurrency =
      balance.available?.[0]?.currency ||
      balance.pending?.[0]?.currency ||
      platformCurrency ||
      "usd";

    let connectEnabled = true;
    let connectError = null;
    try {
      await stripe.accounts.list({ limit: 1 });
    } catch (err) {
      connectEnabled = false;
      connectError = err instanceof Error ? err.message : String(err);
    }

    const supabaseHealth = await sb.healthCheck();

    return {
      ok: true,
      mode: "test",
      currency: platformCurrency,
      available: balance.available,
      pending: balance.pending,
      connectEnabled,
      connectError,
      connectSetupUrl: "https://dashboard.stripe.com/test/connect",
      supabase: supabaseHealth,
      demoPhone: DEMO_PHONE,
    };
  }

  async function accountBundle() {
    const wallet = await walletSnapshot();
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
      supabase: await sb.healthCheck(),
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
    verifyConnection,
    accountBundle,
  };
}
