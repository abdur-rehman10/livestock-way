BEGIN;

-- Add truck_availability_id to trips table for linking trips to truck/route listings
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS truck_availability_id BIGINT REFERENCES truck_availability(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trips_truck_availability_id
  ON trips (truck_availability_id);

-- Create junction table for multi-load trips
CREATE TABLE IF NOT EXISTS trip_loads (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
  booking_id BIGINT REFERENCES load_bookings(id) ON DELETE SET NULL,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, load_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_loads_trip_id
  ON trip_loads (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_loads_load_id
  ON trip_loads (load_id);

CREATE INDEX IF NOT EXISTS idx_trip_loads_contract_id
  ON trip_loads (contract_id);

COMMIT;
