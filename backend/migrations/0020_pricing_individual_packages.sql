-- Catalog of individual hauler packages (immutable rows; updates only).

CREATE TABLE IF NOT EXISTS pricing_individual_packages (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('FREE', 'PAID')),
  name TEXT NOT NULL,
  description TEXT NULL,
  features JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent deletes; packages are managed via UPDATE only.
CREATE OR REPLACE FUNCTION prevent_pricing_individual_package_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'pricing_individual_packages rows cannot be deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pricing_individual_packages_no_delete ON pricing_individual_packages;
CREATE TRIGGER trg_pricing_individual_packages_no_delete
BEFORE DELETE ON pricing_individual_packages
FOR EACH ROW EXECUTE FUNCTION prevent_pricing_individual_package_delete();

-- Seed the two allowed packages (FREE and PAID). Upserts keep rows in sync if rerun.
INSERT INTO pricing_individual_packages (code, name, description, features, is_active)
VALUES
  (
    'FREE',
    'Free',
    'Starter access with limited tracking and validations.',
    jsonb_build_object(
      'feature_list', jsonb_build_array(
        'Track up to 1 trip at a time',
        'Validate 1 set of documents',
        'Up to 3 outside trips supported'
      ),
      'trip_tracking_limit', 1,
      'documents_validation_limit', 1,
      'outside_trips_limit', 3,
      'trips_unlimited', false,
      'loadboard_unlimited', false,
      'truckboard_unlimited', false
    ),
    TRUE
  ),
  (
    'PAID',
    'Paid',
    'Full access for individual haulers.',
    jsonb_build_object(
      'feature_list', jsonb_build_array(
        'Unlimited trips',
        'Unlimited loadboard access',
        'Unlimited truck board access'
      ),
      'trip_tracking_limit', NULL,
      'documents_validation_limit', NULL,
      'outside_trips_limit', NULL,
      'trips_unlimited', TRUE,
      'loadboard_unlimited', TRUE,
      'truckboard_unlimited', TRUE
    ),
    TRUE
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
