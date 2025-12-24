-- Add manual payment workflow for service bookings.
-- Flow: unpaid -> requested -> sent -> paid

DO $$
BEGIN
  -- Add enum values if they do not exist yet.
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_payment_status_enum') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'service_payment_status_enum' AND e.enumlabel = 'requested'
    ) THEN
      ALTER TYPE service_payment_status_enum ADD VALUE 'requested';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'service_payment_status_enum' AND e.enumlabel = 'sent'
    ) THEN
      ALTER TYPE service_payment_status_enum ADD VALUE 'sent';
    END IF;
  END IF;
END$$;

ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS payment_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_note TEXT;

