-- Phase 1: Stripe Integration — Schema Changes

-- 1. Haulers: Stripe Connect fields
ALTER TABLE haulers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. App Users: Stripe customer ID (for shippers paying via Stripe)
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 3. Pricing Configs: Stripe product/price IDs for subscription plans
ALTER TABLE pricing_configs
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- 4. Hauler Subscriptions: Link to Stripe subscription
ALTER TABLE hauler_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 5. Payments: Stripe payment tracking + payout scheduling
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS stripe_fee_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_charged_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'none'
    CHECK (payout_status IN ('none', 'scheduled', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS payout_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMPTZ;

-- 6. Webhook idempotency log
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(stripe_event_id);

-- 7. Indexes for payout cron job
CREATE INDEX IF NOT EXISTS idx_payments_payout_due
  ON payments(payout_status, payout_due_at)
  WHERE payout_status = 'scheduled';

-- 8. Indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_haulers_stripe_connected ON haulers(stripe_connected_account_id) WHERE stripe_connected_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hauler_subs_stripe ON hauler_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- 9. Direct payment screenshot support
ALTER TABLE trip_direct_payments
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
