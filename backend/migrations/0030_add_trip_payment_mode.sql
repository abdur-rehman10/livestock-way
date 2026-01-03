-- Add payment mode to trips for escrow/direct routing.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'ESCROW';

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_version TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trips_payment_mode_check'
      AND conrelid = 'trips'::regclass
  ) THEN
    ALTER TABLE trips
      ADD CONSTRAINT trips_payment_mode_check
      CHECK (payment_mode IN ('ESCROW', 'DIRECT'));
  END IF;
END$$;
