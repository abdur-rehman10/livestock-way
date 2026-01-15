-- Add truck_id column to load_offers table
-- This makes it mandatory for haulers to select a truck when placing an offer

ALTER TABLE load_offers
  ADD COLUMN IF NOT EXISTS truck_id BIGINT REFERENCES trucks(id) ON DELETE SET NULL;

-- Create index for truck_id
CREATE INDEX IF NOT EXISTS idx_load_offers_truck_id ON load_offers (truck_id);

-- Add comment
COMMENT ON COLUMN load_offers.truck_id IS 'The truck selected by the hauler for this offer';
