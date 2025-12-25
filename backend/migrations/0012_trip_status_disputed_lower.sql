-- Ensure lowercase disputed exists in trip_status_enum.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_enum') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'trip_status_enum'
        AND e.enumlabel = 'disputed'
    ) THEN
      ALTER TYPE trip_status_enum ADD VALUE 'disputed';
    END IF;
  END IF;
END$$;
