-- Individual hauler subscription + free-trip tracking.

ALTER TABLE haulers
  ADD COLUMN IF NOT EXISTS free_trip_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS free_trip_used_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'NONE' CHECK (subscription_status IN ('NONE', 'ACTIVE', 'CANCELED', 'EXPIRED')),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS hauler_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('INDIVIDUAL')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELED', 'EXPIRED')),
  monthly_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hauler_subscriptions_hauler_status
  ON hauler_subscriptions (hauler_id, status);

CREATE TABLE IF NOT EXISTS hauler_subscription_payments (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES hauler_subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL,
  provider_ref TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hauler_subscription_payments_subscription
  ON hauler_subscription_payments (subscription_id, status);
