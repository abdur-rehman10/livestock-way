-- Ensure lowercase trip status values exist to avoid enum errors.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_enum') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'trip_status_enum' AND e.enumlabel = 'pending_escrow'
    ) THEN
      ALTER TYPE trip_status_enum ADD VALUE 'pending_escrow';
    END IF;
  END IF;
END$$;
