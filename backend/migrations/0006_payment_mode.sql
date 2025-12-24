-- Add payment mode toggle and direct-payment disclaimer tracking to trips.
-- Defaults preserve current escrow behavior.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'ESCROW',
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_version TEXT;

DO $$
BEGIN
  -- Add a lightweight enum-like constraint if it is not already present.
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

-- Index for filtering/analytics by payment_mode.
CREATE INDEX IF NOT EXISTS idx_trips_payment_mode ON trips(payment_mode);
