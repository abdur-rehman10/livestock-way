-- Add dimension and capacity columns needed by fleet UI.
ALTER TABLE trucks
  ADD COLUMN IF NOT EXISTS height_m NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS width_m NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS length_m NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS axle_count INTEGER,
  ADD COLUMN IF NOT EXISTS max_gross_weight_kg NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS max_axle_weight_kg NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS hazmat_permitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS species_supported TEXT;
