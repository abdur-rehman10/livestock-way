import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set — Stripe features will not work.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export const PLATFORM_FEE_PERCENT = Number(
  process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 3
);

export const STRIPE_PROCESSING_RATE = 0.029;
export const STRIPE_PROCESSING_FIXED = 30; // cents

/**
 * Calculate the total amount a shipper must pay so that:
 *  - The hauler receives exactly `baseAmountCents`
 *  - The platform keeps `PLATFORM_FEE_PERCENT`%
 *  - Stripe processing fees are covered
 *
 * Returns all amounts in cents.
 */
export function calculateShipperCharge(baseAmountCents: number) {
  const platformFeeCents = Math.round(
    baseAmountCents * (PLATFORM_FEE_PERCENT / 100)
  );
  const subtotalCents = baseAmountCents + platformFeeCents;

  // total = (subtotal + fixed) / (1 - rate) — covers Stripe's 2.9% + $0.30
  const totalChargedCents = Math.ceil(
    (subtotalCents + STRIPE_PROCESSING_FIXED) / (1 - STRIPE_PROCESSING_RATE)
  );
  const stripeFeeCents = totalChargedCents - subtotalCents;

  return {
    baseAmountCents,
    platformFeeCents,
    stripeFeeCents,
    totalChargedCents,
  };
}

// ── Stripe Products & Prices ────────────────────────────────────────

export async function createStripeProduct(name: string, description?: string) {
  if (description) {
    return stripe.products.create({
      name,
      description,
      metadata: { source: "livestockway" },
    });
  }
  return stripe.products.create({
    name,
    metadata: { source: "livestockway" },
  });
}

export async function createStripePrice(
  productId: string,
  unitAmountCents: number,
  interval: "month" | "year",
  currency = "usd"
) {
  return stripe.prices.create({
    product: productId,
    unit_amount: unitAmountCents,
    currency,
    recurring: { interval },
  });
}

export async function archiveStripeProduct(productId: string) {
  return stripe.products.update(productId, { active: false });
}

export async function archiveStripePrice(priceId: string) {
  return stripe.prices.update(priceId, { active: false });
}

// ── Stripe Checkout (Subscriptions) ─────────────────────────────────

export async function createSubscriptionCheckoutSession(params: {
  customerEmail: string;
  stripeCustomerId?: string;
  stripePriceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const sessionParams: Record<string, any> = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: params.stripePriceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  };

  if (params.metadata) sessionParams.metadata = params.metadata;

  if (params.stripeCustomerId) {
    sessionParams.customer = params.stripeCustomerId;
  } else {
    sessionParams.customer_email = params.customerEmail;
  }

  return stripe.checkout.sessions.create(sessionParams);
}

// ── Stripe Connect ──────────────────────────────────────────────────

export async function createConnectedAccount(email: string) {
  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { source: "livestockway" },
  });
}

export async function createAccountOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function getConnectedAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirementsCurrentlyDue: account.requirements?.currently_due ?? [],
  };
}

// ── Stripe Transfers (Payouts to Hauler) ────────────────────────────

export async function createTransfer(params: {
  amountCents: number;
  destinationAccountId: string;
  description?: string;
  metadata?: Record<string, string>;
}) {
  const base = {
    amount: params.amountCents,
    currency: "usd" as const,
    destination: params.destinationAccountId,
  };
  const extra: Record<string, any> = {};
  if (params.description) extra.description = params.description;
  if (params.metadata) extra.metadata = params.metadata;
  return stripe.transfers.create({ ...base, ...extra });
}

// ── Stripe Customer ─────────────────────────────────────────────────

export async function getOrCreateCustomer(email: string, name?: string) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0];
  if (name) {
    return stripe.customers.create({
      email,
      name,
      metadata: { source: "livestockway" },
    });
  }
  return stripe.customers.create({
    email,
    metadata: { source: "livestockway" },
  });
}

// ── Webhook Signature Verification ──────────────────────────────────

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
