ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS account_mode TEXT;

UPDATE app_users
SET account_mode = 'COMPANY'
WHERE account_mode IS NULL;
