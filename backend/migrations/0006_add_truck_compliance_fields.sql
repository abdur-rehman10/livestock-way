ALTER TABLE trucks
  ADD COLUMN height_m NUMERIC(8,3),
  ADD COLUMN width_m NUMERIC(8,3),
  ADD COLUMN length_m NUMERIC(8,3),
  ADD COLUMN axle_count INTEGER,
  ADD COLUMN max_gross_weight_kg NUMERIC(12,2),
  ADD COLUMN max_axle_weight_kg NUMERIC(12,2),
  ADD COLUMN hazmat_permitted BOOLEAN NOT NULL DEFAULT FALSE;
