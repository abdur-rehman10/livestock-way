-- Add missing columns to audit_logs table
-- The table was created with a minimal schema, but the service expects additional columns

-- First, handle metadata_json -> metadata rename if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'metadata_json'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN metadata_json TO metadata;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS resource TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Set default values for existing rows
UPDATE audit_logs 
SET action = COALESCE(action, event_type, 'unknown')
WHERE action IS NULL;

-- Make action NOT NULL with a default
ALTER TABLE audit_logs 
  ALTER COLUMN action SET DEFAULT 'unknown';

-- Try to make it NOT NULL, but handle if there are still NULLs
DO $$
BEGIN
  ALTER TABLE audit_logs ALTER COLUMN action SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- If there are still NULL values, update them first
    UPDATE audit_logs SET action = COALESCE(event_type, 'unknown') WHERE action IS NULL;
    ALTER TABLE audit_logs ALTER COLUMN action SET NOT NULL;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_role ON audit_logs (user_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
