-- Email verification & password reset columns
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_code     TEXT,
  ADD COLUMN IF NOT EXISTS verification_code_exp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_code            TEXT,
  ADD COLUMN IF NOT EXISTS reset_code_exp        TIMESTAMPTZ;
