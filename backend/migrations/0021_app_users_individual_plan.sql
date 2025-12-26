-- Track the selected individual plan for haulers and onboarding completion.

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS individual_plan_code TEXT NULL CHECK (individual_plan_code IN ('FREE', 'PAID')),
  ADD COLUMN IF NOT EXISTS signup_plan_selected_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
