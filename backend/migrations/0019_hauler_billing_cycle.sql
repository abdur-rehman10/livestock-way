-- Support subscription billing cycle (monthly/yearly) and pricing captures.

ALTER TABLE hauler_subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  ADD COLUMN IF NOT EXISTS price_per_month NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charged_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE hauler_subscription_payments
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
