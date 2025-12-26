ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS account_mode TEXT,
  ADD COLUMN IF NOT EXISTS individual_plan_code TEXT,
  ADD COLUMN IF NOT EXISTS signup_plan_selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_users
SET account_mode = COALESCE(account_mode, 'COMPANY'),
    onboarding_completed = COALESCE(onboarding_completed, FALSE)
WHERE account_mode IS NULL OR onboarding_completed IS NULL;
