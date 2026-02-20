-- Add profile photo URL column to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
