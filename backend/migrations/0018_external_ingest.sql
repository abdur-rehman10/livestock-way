ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE trucks
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE truck_availability
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO app_users (email, user_type, account_status, full_name)
SELECT 'external-shipper@livestockway.local', 'shipper', 'active', 'External Shipper'
WHERE NOT EXISTS (
  SELECT 1 FROM app_users WHERE email = 'external-shipper@livestockway.local'
);

INSERT INTO app_users (email, user_type, account_status, full_name)
SELECT 'external-hauler@livestockway.local', 'hauler', 'active', 'External Hauler'
WHERE NOT EXISTS (
  SELECT 1 FROM app_users WHERE email = 'external-hauler@livestockway.local'
);

INSERT INTO shippers (user_id, farm_name, registration_id)
SELECT u.id, 'External Shipper', 'EXT-SHIPPER'
FROM app_users u
WHERE u.email = 'external-shipper@livestockway.local'
  AND NOT EXISTS (SELECT 1 FROM shippers s WHERE s.user_id = u.id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'haulers'
      AND column_name = 'hauler_type'
  ) THEN
    INSERT INTO haulers (user_id, legal_name, dot_number, hauler_type)
    SELECT u.id, 'External Hauler', 'EXT-HAULER', 'company'
    FROM app_users u
    WHERE u.email = 'external-hauler@livestockway.local'
      AND NOT EXISTS (SELECT 1 FROM haulers h WHERE h.user_id = u.id);
  ELSE
    INSERT INTO haulers (user_id, legal_name, dot_number)
    SELECT u.id, 'External Hauler', 'EXT-HAULER'
    FROM app_users u
    WHERE u.email = 'external-hauler@livestockway.local'
      AND NOT EXISTS (SELECT 1 FROM haulers h WHERE h.user_id = u.id);
  END IF;
END $$;
