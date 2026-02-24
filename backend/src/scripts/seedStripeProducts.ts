/**
 * One-time seed script: Creates Stripe Products + Prices for subscription plans
 * and saves the IDs back into the pricing_configs table.
 *
 * Usage:
 *   npx ts-node src/scripts/seedStripeProducts.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { pool } from "../config/database";
import {
  stripe,
  createStripeProduct,
  createStripePrice,
} from "../services/stripeService";

async function seed() {
  console.log("🔄 Starting Stripe product seeding...\n");

  // ── 1. Hauler Individual Plan ──────────────────────────────────────

  const individualConfig = await pool.query(
    `SELECT id, monthly_price, stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly
     FROM pricing_configs
     WHERE target_user_type = 'HAULER_INDIVIDUAL' AND is_active = TRUE
     ORDER BY updated_at DESC LIMIT 1`
  );

  if (!individualConfig.rowCount) {
    console.log("⚠️  No active HAULER_INDIVIDUAL pricing config found. Creating default ($70/month)...");
    await pool.query(
      `INSERT INTO pricing_configs (target_user_type, monthly_price, is_active)
       VALUES ('HAULER_INDIVIDUAL', 70, TRUE)
       ON CONFLICT DO NOTHING`
    );
    return seed(); // retry
  }

  const config = individualConfig.rows[0];
  const monthlyPriceDollars = Number(config.monthly_price);
  const yearlyPriceDollars = Number((monthlyPriceDollars * 10).toFixed(2));
  const monthlyPriceCents = Math.round(monthlyPriceDollars * 100);
  const yearlyPriceCents = Math.round(yearlyPriceDollars * 100);

  console.log(`📦 HAULER_INDIVIDUAL Plan:`);
  console.log(`   Monthly: $${monthlyPriceDollars} (${monthlyPriceCents} cents)`);
  console.log(`   Yearly:  $${yearlyPriceDollars} (${yearlyPriceCents} cents) — 2 months free\n`);

  // Check if Stripe product already exists
  let productId = config.stripe_product_id;
  if (productId) {
    try {
      const existing = await stripe.products.retrieve(productId);
      console.log(`✅ Product already exists: ${existing.name} (${productId})`);
    } catch {
      console.log(`⚠️  Stored product ID ${productId} not found in Stripe. Creating new...`);
      productId = null;
    }
  }

  if (!productId) {
    const product = await createStripeProduct(
      "LivestockWay Hauler Individual Plan",
      "Monthly/yearly subscription for individual haulers on LivestockWay platform"
    );
    productId = product.id;
    console.log(`✅ Created Stripe Product: ${productId}`);
  }

  // Create or retrieve monthly price
  let monthlyPriceId = config.stripe_price_id_monthly;
  if (monthlyPriceId) {
    try {
      await stripe.prices.retrieve(monthlyPriceId);
      console.log(`✅ Monthly price already exists: ${monthlyPriceId}`);
    } catch {
      console.log(`⚠️  Stored monthly price ${monthlyPriceId} not found. Creating new...`);
      monthlyPriceId = null;
    }
  }

  if (!monthlyPriceId) {
    const monthlyPrice = await createStripePrice(productId, monthlyPriceCents, "month");
    monthlyPriceId = monthlyPrice.id;
    console.log(`✅ Created monthly price: ${monthlyPriceId} ($${monthlyPriceDollars}/mo)`);
  }

  // Create or retrieve yearly price
  let yearlyPriceId = config.stripe_price_id_yearly;
  if (yearlyPriceId) {
    try {
      await stripe.prices.retrieve(yearlyPriceId);
      console.log(`✅ Yearly price already exists: ${yearlyPriceId}`);
    } catch {
      console.log(`⚠️  Stored yearly price ${yearlyPriceId} not found. Creating new...`);
      yearlyPriceId = null;
    }
  }

  if (!yearlyPriceId) {
    const yearlyPrice = await createStripePrice(productId, yearlyPriceCents, "year");
    yearlyPriceId = yearlyPrice.id;
    console.log(`✅ Created yearly price: ${yearlyPriceId} ($${yearlyPriceDollars}/yr)`);
  }

  // ── 2. Save IDs back to DB ──────────────────────────────────────────

  await pool.query(
    `UPDATE pricing_configs
     SET stripe_product_id = $1,
         stripe_price_id_monthly = $2,
         stripe_price_id_yearly = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [productId, monthlyPriceId, yearlyPriceId, config.id]
  );

  console.log(`\n✅ Saved Stripe IDs to pricing_configs (id: ${config.id})`);
  console.log(`   stripe_product_id:       ${productId}`);
  console.log(`   stripe_price_id_monthly: ${monthlyPriceId}`);
  console.log(`   stripe_price_id_yearly:  ${yearlyPriceId}`);

  // ── 3. Summary ───────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("Stripe seeding complete!");
  console.log("═".repeat(60));
  console.log("\nNext steps:");
  console.log("  1. Set up Stripe webhook endpoint in Stripe Dashboard:");
  console.log("     URL: https://your-domain.com/api/stripe/webhooks");
  console.log("     Events: checkout.session.completed, invoice.paid,");
  console.log("             invoice.payment_failed, customer.subscription.updated,");
  console.log("             customer.subscription.deleted, account.updated,");
  console.log("             payment_intent.succeeded, payment_intent.payment_failed,");
  console.log("             transfer.created");
  console.log("  2. Add STRIPE_WEBHOOK_SECRET to .env");
  console.log("  3. Restart backend server");
}

seed()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
