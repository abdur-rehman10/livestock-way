import { Router, Request, Response, raw } from "express";
import { pool } from "../config/database";
import authRequired from "../middlewares/auth";
import { requireRoles } from "../middlewares/rbac";
import { ensureHaulerProfile } from "../utils/profileHelpers";
import {
  stripe,
  constructWebhookEvent,
  createConnectedAccount,
  createAccountOnboardingLink,
  getConnectedAccountStatus,
  createSubscriptionCheckoutSession,
  getOrCreateCustomer,
} from "../services/stripeService";

const router = Router();

// ── Webhook (raw body required — registered separately in server.ts) ─

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) return res.status(400).json({ error: "Missing signature" });

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, sig);
  } catch (err: any) {
    console.error("Stripe webhook signature failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Idempotency: skip already-processed events
  const existing = await pool.query(
    "SELECT id FROM stripe_webhook_events WHERE stripe_event_id = $1",
    [event.id]
  );
  if (existing.rowCount) {
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      // ── Subscription lifecycle ───────────────────────────
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as any);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as any);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as any);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as any);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as any);
        break;

      // ── Connect onboarding ───────────────────────────────
      case "account.updated":
        await handleAccountUpdated(event.data.object as any);
        break;

      // ── Payment intents (escrow) ─────────────────────────
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as any);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as any);
        break;

      // ── Transfers ────────────────────────────────────────
      case "transfer.created":
        await handleTransferCreated(event.data.object as any);
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    // Log processed event
    await pool.query(
      `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [event.id, event.type, JSON.stringify(event.data.object)]
    );

    return res.json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function getSubPeriodEnd(sub: any): number {
  return sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end ?? 0;
}

// ── Webhook Handlers ────────────────────────────────────────────────

async function handleCheckoutCompleted(session: any) {
  if (session.mode !== "subscription") return;

  const subscriptionId = session.subscription;
  const customerId = session.customer;
  const haulerId = session.metadata?.hauler_id;
  const userId = session.metadata?.user_id;

  if (!haulerId || !subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  await pool.query("BEGIN");
  try {
    // Update hauler stripe_customer_id if not set
    if (customerId) {
      await pool.query(
        `UPDATE haulers SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL`,
        [customerId, haulerId]
      );
      if (userId) {
        await pool.query(
          `UPDATE app_users SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL`,
          [customerId, userId]
        );
      }
    }

    // Find the hauler_subscription row (created when checkout started) and activate it
    const subRow = await pool.query(
      `SELECT id FROM hauler_subscriptions
       WHERE hauler_id = $1 AND stripe_subscription_id = $2
       LIMIT 1`,
      [haulerId, subscriptionId]
    );

    if (subRow.rowCount) {
      await pool.query(
        `UPDATE hauler_subscriptions
         SET status = 'ACTIVE',
             current_period_end = to_timestamp($1),
             updated_at = NOW()
         WHERE id = $2`,
        [getSubPeriodEnd(sub), subRow.rows[0].id]
      );
    } else {
      const billingCycle =
        sub.items.data[0]?.price?.recurring?.interval === "year"
          ? "YEARLY"
          : "MONTHLY";
      const monthlyPrice =
        billingCycle === "YEARLY"
          ? Math.round((sub.items.data[0]?.price?.unit_amount ?? 0) / 12)
          : (sub.items.data[0]?.price?.unit_amount ?? 0);

      await pool.query(
        `INSERT INTO hauler_subscriptions
           (hauler_id, plan_type, status, billing_cycle, monthly_price, price_per_month,
            charged_amount, currency, started_at, current_period_end, stripe_subscription_id)
         VALUES ($1, 'INDIVIDUAL', 'ACTIVE', $2, $3, $4, $5, 'USD', NOW(), to_timestamp($6), $7)`,
        [
          haulerId,
          billingCycle,
          monthlyPrice / 100,
          monthlyPrice / 100,
          (sub.items.data[0]?.price?.unit_amount ?? 0) / 100,
          getSubPeriodEnd(sub),
          subscriptionId,
        ]
      );
    }

    await pool.query(
      `UPDATE haulers
       SET subscription_status = 'ACTIVE',
           subscription_current_period_end = to_timestamp($1)
       WHERE id = $2`,
      [getSubPeriodEnd(sub), haulerId]
    );

    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = getSubPeriodEnd(sub);

  await pool.query(
    `UPDATE hauler_subscriptions
     SET status = 'ACTIVE',
         current_period_end = to_timestamp($1),
         updated_at = NOW()
     WHERE stripe_subscription_id = $2`,
    [periodEnd, subscriptionId]
  );

  const subRow = await pool.query(
    `SELECT hauler_id FROM hauler_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
    [subscriptionId]
  );
  if (subRow.rowCount) {
    await pool.query(
      `UPDATE haulers
       SET subscription_status = 'ACTIVE',
           subscription_current_period_end = to_timestamp($1)
       WHERE id = $2`,
      [periodEnd, subRow.rows[0].hauler_id]
    );
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  await pool.query(
    `UPDATE hauler_subscriptions
     SET status = 'PAST_DUE', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [subscriptionId]
  );
}

async function handleSubscriptionUpdated(subscription: any) {
  const status = subscription.status === "active" ? "ACTIVE" : subscription.status?.toUpperCase();
  const periodEnd = getSubPeriodEnd(subscription);
  await pool.query(
    `UPDATE hauler_subscriptions
     SET status = $1,
         current_period_end = to_timestamp($2),
         updated_at = NOW()
     WHERE stripe_subscription_id = $3`,
    [status, periodEnd, subscription.id]
  );

  const subRow = await pool.query(
    `SELECT hauler_id FROM hauler_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
    [subscription.id]
  );
  if (subRow.rowCount) {
    await pool.query(
      `UPDATE haulers
       SET subscription_status = $1,
           subscription_current_period_end = to_timestamp($2)
       WHERE id = $3`,
      [status, periodEnd, subRow.rows[0].hauler_id]
    );
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  await pool.query(
    `UPDATE hauler_subscriptions
     SET status = 'CANCELED', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );

  const subRow = await pool.query(
    `SELECT hauler_id FROM hauler_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
    [subscription.id]
  );
  if (subRow.rowCount) {
    await pool.query(
      `UPDATE haulers
       SET subscription_status = 'CANCELED'
       WHERE id = $1`,
      [subRow.rows[0].hauler_id]
    );
  }
}

async function handleAccountUpdated(account: any) {
  const isComplete =
    account.charges_enabled && account.payouts_enabled && account.details_submitted;

  await pool.query(
    `UPDATE haulers
     SET stripe_onboarding_complete = $1
     WHERE stripe_connected_account_id = $2`,
    [isComplete, account.id]
  );
}

async function handlePaymentIntentSucceeded(pi: any) {
  const paymentId = pi.metadata?.payment_id;
  if (!paymentId) return;

  await pool.query(
    `UPDATE payments
     SET status = 'in_escrow',
         stripe_payment_intent_id = $1,
         funded_at = NOW(),
         updated_at = NOW()
     WHERE id = $2 AND status IN ('pending', 'pending_funding')`,
    [pi.id, paymentId]
  );
}

async function handlePaymentIntentFailed(pi: any) {
  const paymentId = pi.metadata?.payment_id;
  if (!paymentId) return;

  await pool.query(
    `UPDATE payments
     SET status = 'funding_failed', updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'pending_funding')`,
    [paymentId]
  );
}

async function handleTransferCreated(transfer: any) {
  const paymentId = transfer.metadata?.payment_id;
  if (!paymentId) return;

  await pool.query(
    `UPDATE payments
     SET stripe_transfer_id = $1,
         payout_status = 'completed',
         payout_completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [transfer.id, paymentId]
  );
}

// ── Hauler: Stripe Connect Onboarding ───────────────────────────────

router.post(
  "/connect/onboard",
  authRequired,
  requireRoles(["hauler"]),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req.user as any)?.id);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const haulerId = await ensureHaulerProfile(userId);

      // Check if hauler already has a connected account
      const haulerRow = await pool.query(
        `SELECT stripe_connected_account_id, stripe_onboarding_complete
         FROM haulers WHERE id = $1`,
        [haulerId]
      );
      const hauler = haulerRow.rows[0];

      let accountId = hauler?.stripe_connected_account_id;

      if (!accountId) {
        // Get user email for account creation
        const userRow = await pool.query(
          "SELECT email FROM app_users WHERE id = $1",
          [userId]
        );
        const email = userRow.rows[0]?.email;
        if (!email) return res.status(400).json({ error: "User email not found" });

        const account = await createConnectedAccount(email);
        accountId = account.id;

        await pool.query(
          `UPDATE haulers
           SET stripe_connected_account_id = $1, stripe_onboarding_complete = FALSE
           WHERE id = $2`,
          [accountId, haulerId]
        );
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const link = await createAccountOnboardingLink(
        accountId,
        `${frontendUrl}/hauler/stripe-refresh`,
        `${frontendUrl}/hauler/stripe-return`
      );

      return res.json({ url: link.url, accountId });
    } catch (err) {
      console.error("Stripe Connect onboarding error:", err);
      return res.status(500).json({ error: "Failed to create onboarding link" });
    }
  }
);

router.get(
  "/connect/status",
  authRequired,
  requireRoles(["hauler"]),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req.user as any)?.id);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const haulerId = await ensureHaulerProfile(userId);
      const haulerRow = await pool.query(
        `SELECT stripe_connected_account_id, stripe_onboarding_complete
         FROM haulers WHERE id = $1`,
        [haulerId]
      );
      const hauler = haulerRow.rows[0];

      if (!hauler?.stripe_connected_account_id) {
        return res.json({
          connected: false,
          onboardingComplete: false,
          accountId: null,
        });
      }

      const status = await getConnectedAccountStatus(
        hauler.stripe_connected_account_id
      );

      const isComplete =
        status.chargesEnabled && status.payoutsEnabled && status.detailsSubmitted;

      // Sync onboarding status to DB
      if (isComplete !== hauler.stripe_onboarding_complete) {
        await pool.query(
          `UPDATE haulers SET stripe_onboarding_complete = $1 WHERE id = $2`,
          [isComplete, haulerId]
        );
      }

      return res.json({
        connected: true,
        onboardingComplete: isComplete,
        accountId: hauler.stripe_connected_account_id,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        detailsSubmitted: status.detailsSubmitted,
        requirementsCurrentlyDue: status.requirementsCurrentlyDue,
      });
    } catch (err) {
      console.error("Stripe Connect status error:", err);
      return res.status(500).json({ error: "Failed to get connect status" });
    }
  }
);

// ── Hauler: Subscription Checkout via Stripe ────────────────────────

router.post(
  "/subscription/checkout",
  authRequired,
  requireRoles(["hauler"]),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req.user as any)?.id);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const haulerId = await ensureHaulerProfile(userId);
      const billingCycle =
        (req.body?.billing_cycle ?? "MONTHLY").toString().toUpperCase() === "YEARLY"
          ? "YEARLY"
          : "MONTHLY";

      // Get user + hauler info
      const userRow = await pool.query(
        "SELECT email, full_name, stripe_customer_id FROM app_users WHERE id = $1",
        [userId]
      );
      const user = userRow.rows[0];
      if (!user?.email) return res.status(400).json({ error: "User email not found" });

      const haulerRow = await pool.query(
        `SELECT hauler_type, subscription_status, stripe_customer_id
         FROM haulers WHERE id = $1`,
        [haulerId]
      );
      const hauler = haulerRow.rows[0];
      if ((hauler?.hauler_type ?? "").toString().toUpperCase() !== "INDIVIDUAL") {
        return res.status(400).json({ error: "Only individual haulers can subscribe via Stripe" });
      }

      // Get pricing config with Stripe price IDs
      const pricingRow = await pool.query(
        `SELECT id, monthly_price, stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly
         FROM pricing_configs
         WHERE target_user_type = 'HAULER_INDIVIDUAL' AND is_active = TRUE
         ORDER BY updated_at DESC LIMIT 1`
      );
      if (!pricingRow.rowCount) {
        return res.status(400).json({ error: "Pricing not configured" });
      }

      const pricing = pricingRow.rows[0];
      const stripePriceId =
        billingCycle === "YEARLY"
          ? pricing.stripe_price_id_yearly
          : pricing.stripe_price_id_monthly;

      if (!stripePriceId) {
        return res.status(400).json({
          error: `Stripe price not configured for ${billingCycle} billing`,
        });
      }

      let stripeCustomerId = hauler?.stripe_customer_id || user?.stripe_customer_id;
      if (!stripeCustomerId) {
        const customer = await getOrCreateCustomer(user.email, user.full_name);
        if (!customer) return res.status(500).json({ error: "Failed to create Stripe customer" });
        stripeCustomerId = customer.id;
        await pool.query(
          `UPDATE haulers SET stripe_customer_id = $1 WHERE id = $2`,
          [stripeCustomerId, haulerId]
        );
        await pool.query(
          `UPDATE app_users SET stripe_customer_id = $1 WHERE id = $2`,
          [stripeCustomerId, userId]
        );
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      const session = await createSubscriptionCheckoutSession({
        customerEmail: user.email,
        stripeCustomerId,
        stripePriceId,
        successUrl: `${frontendUrl}/hauler/payment?status=success`,
        cancelUrl: `${frontendUrl}/hauler/payment?status=cancelled`,
        metadata: {
          hauler_id: String(haulerId),
          user_id: String(userId),
          billing_cycle: billingCycle,
        },
      });

      // Pre-create subscription row so webhook can update it
      await pool.query(
        `INSERT INTO hauler_subscriptions
           (hauler_id, plan_type, status, billing_cycle, monthly_price, price_per_month,
            charged_amount, currency, started_at, current_period_end, stripe_subscription_id)
         VALUES ($1, 'INDIVIDUAL', 'PENDING', $2, $3, $4, $5, 'USD', NOW(), NOW(), NULL)`,
        [
          haulerId,
          billingCycle,
          pricing.monthly_price,
          pricing.monthly_price,
          billingCycle === "YEARLY"
            ? Number((pricing.monthly_price * 10).toFixed(2))
            : pricing.monthly_price,
        ]
      );

      return res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (err) {
      console.error("Subscription checkout error:", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// ── Public key endpoint (for frontend Stripe.js init) ───────────────

router.get("/config", (_req: Request, res: Response) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  });
});

export default router;
