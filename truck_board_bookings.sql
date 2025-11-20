BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
    CREATE TYPE booking_status_enum AS ENUM (
      'REQUESTED',
      'ACCEPTED',
      'REJECTED',
      'CANCELLED'
    );
  END IF;
END$$;

ALTER TABLE truck_availability
  ADD COLUMN IF NOT EXISTS capacity_headcount INTEGER,
  ADD COLUMN IF NOT EXISTS capacity_weight_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS allow_shared BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS load_bookings (
  id BIGSERIAL PRIMARY KEY,
  load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
  shipper_id BIGINT NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
  offer_id BIGINT REFERENCES load_offers(id) ON DELETE SET NULL,
  truck_availability_id BIGINT REFERENCES truck_availability(id) ON DELETE SET NULL,
  requested_headcount INTEGER,
  requested_weight_kg NUMERIC(10,2),
  status booking_status_enum NOT NULL DEFAULT 'REQUESTED',
  notes TEXT,
  offered_amount NUMERIC(12,2),
  offered_currency TEXT,
  created_by_user_id BIGINT NOT NULL REFERENCES app_users(id),
  updated_by_user_id BIGINT REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_load_bookings_load ON load_bookings(load_id);
CREATE INDEX IF NOT EXISTS idx_load_bookings_offer ON load_bookings(offer_id);
CREATE INDEX IF NOT EXISTS idx_load_bookings_truck_availability ON load_bookings(truck_availability_id);
CREATE INDEX IF NOT EXISTS idx_load_bookings_hauler_status ON load_bookings(hauler_id, status);

COMMIT;
