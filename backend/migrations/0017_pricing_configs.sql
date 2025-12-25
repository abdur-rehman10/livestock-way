-- Pricing configuration managed by super admin.
-- Individual hauler pricing is stored directly on pricing_configs (simplest approach);
-- this avoids an extra table for a single price point.

CREATE TABLE IF NOT EXISTS pricing_configs (
  id BIGSERIAL PRIMARY KEY,
  target_user_type TEXT NOT NULL CHECK (target_user_type IN ('HAULER_INDIVIDUAL', 'HAULER_COMPANY')),
  monthly_price NUMERIC(10,2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Individual hauler pricing must be set; company configs may omit monthly_price (tiers handle pricing).
  CHECK (
    (target_user_type = 'HAULER_INDIVIDUAL' AND monthly_price IS NOT NULL AND monthly_price > 0)
    OR target_user_type = 'HAULER_COMPANY'
  )
);

-- Only one active config per target_user_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_configs_active_unique
  ON pricing_configs (target_user_type)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS pricing_company_tiers (
  id BIGSERIAL PRIMARY KEY,
  pricing_config_id BIGINT NOT NULL REFERENCES pricing_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_vehicles INTEGER NULL,
  max_vehicles INTEGER NULL,
  monthly_price NUMERIC(10,2) NULL,
  sales_form_link TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enterprise BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    -- Standard tiers: require vehicle bounds and a price, with min <= max.
    (is_enterprise = FALSE
      AND min_vehicles IS NOT NULL
      AND max_vehicles IS NOT NULL
      AND min_vehicles <= max_vehicles
      AND monthly_price IS NOT NULL)
    -- Enterprise tiers: no numeric price; must provide a sales form link.
    OR (is_enterprise = TRUE
      AND monthly_price IS NULL
      AND sales_form_link IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_pricing_company_tiers_config
  ON pricing_company_tiers (pricing_config_id, sort_order);
