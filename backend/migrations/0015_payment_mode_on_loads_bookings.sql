-- Add payment mode and direct payment disclaimer metadata to loads and load_bookings.

ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'ESCROW',
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_version TEXT;

ALTER TABLE load_bookings
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'ESCROW',
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS direct_payment_disclaimer_version TEXT;

-- Simple check constraints for allowed values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'loads_payment_mode_check'
      AND conrelid = 'loads'::regclass
  ) THEN
    ALTER TABLE loads ADD CONSTRAINT loads_payment_mode_check CHECK (payment_mode IN ('ESCROW', 'DIRECT'));
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'load_bookings_payment_mode_check'
      AND conrelid = 'load_bookings'::regclass
  ) THEN
    ALTER TABLE load_bookings ADD CONSTRAINT load_bookings_payment_mode_check CHECK (payment_mode IN ('ESCROW', 'DIRECT'));
  END IF;
END$$;
