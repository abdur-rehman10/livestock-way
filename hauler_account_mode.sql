-- Add account_mode to app_users to distinguish individual vs company haulers
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS account_mode TEXT DEFAULT 'COMPANY';

-- Add hauler_type to haulers to mirror the account mode
ALTER TABLE haulers
  ADD COLUMN IF NOT EXISTS hauler_type TEXT DEFAULT 'company';
