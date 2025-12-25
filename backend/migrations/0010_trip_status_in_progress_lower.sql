-- Ensure lowercase in_progress exists in trip_status_enum.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_enum') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'trip_status_enum'
        AND e.enumlabel = 'in_progress'
    ) THEN
      ALTER TYPE trip_status_enum ADD VALUE 'in_progress';
    END IF;
  END IF;
END$$;
