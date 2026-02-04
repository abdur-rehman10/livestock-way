BEGIN;

-- Add pickup and delivery tracking columns to trip_loads
ALTER TABLE trip_loads
  ADD COLUMN IF NOT EXISTS pickup_photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pickup_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_photos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_receiver_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trip_loads_pickup_completed 
  ON trip_loads (pickup_completed_at) WHERE pickup_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_loads_delivery_completed 
  ON trip_loads (delivery_completed_at) WHERE delivery_completed_at IS NOT NULL;

COMMIT;
