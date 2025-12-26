ALTER TABLE haulers
  ADD COLUMN IF NOT EXISTS hauler_type TEXT;

UPDATE haulers
SET hauler_type = 'company'
WHERE hauler_type IS NULL;
