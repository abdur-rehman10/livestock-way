ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS signup_plan_selected_at TIMESTAMPTZ;
