-- Ensure lowercase READY_TO_START exists in trip_status_enum.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_enum') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'trip_status_enum'
        AND e.enumlabel = 'ready_to_start'
    ) THEN
      ALTER TYPE trip_status_enum ADD VALUE 'ready_to_start';
    END IF;
  END IF;
END$$;
