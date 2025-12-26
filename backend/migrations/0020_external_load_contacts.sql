ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS external_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS external_contact_phone TEXT;
