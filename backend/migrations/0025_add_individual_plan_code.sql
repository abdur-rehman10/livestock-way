ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS individual_plan_code TEXT;
