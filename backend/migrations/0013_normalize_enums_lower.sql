-- Add lower-case enum labels if missing to avoid runtime errors.
DO $$
DECLARE
  label text;
BEGIN
  -- Trip statuses (lowercase variants)
  FOREACH label IN ARRAY ARRAY[
    'pending_escrow',
    'ready_to_start',
    'in_progress',
    'delivered_awaiting_confirmation',
    'delivered_confirmed',
    'disputed',
    'closed'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_enum') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'trip_status_enum'
          AND e.enumlabel = label
      ) THEN
        EXECUTE format('ALTER TYPE trip_status_enum ADD VALUE %L', label);
      END IF;
    END IF;
  END LOOP;

  -- Load statuses (lowercase variants)
  FOREACH label IN ARRAY ARRAY[
    'awaiting_escrow',
    'delivered'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'load_status_enum') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'load_status_enum'
          AND e.enumlabel = label
      ) THEN
        EXECUTE format('ALTER TYPE load_status_enum ADD VALUE %L', label);
      END IF;
    END IF;
  END LOOP;

  -- Payment statuses (lowercase variants)
  FOREACH label IN ARRAY ARRAY[
    'awaiting_funding',
    'escrow_funded',
    'released_to_hauler',
    'refunded_to_shipper',
    'split_between_parties',
    'cancelled',
    'not_applicable'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'payment_status_enum'
          AND e.enumlabel = label
      ) THEN
        EXECUTE format('ALTER TYPE payment_status_enum ADD VALUE %L', label);
      END IF;
    END IF;
  END LOOP;
END$$;
