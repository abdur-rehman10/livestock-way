ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS post_link TEXT;

ALTER TABLE truck_availability
  ADD COLUMN IF NOT EXISTS post_link TEXT;
