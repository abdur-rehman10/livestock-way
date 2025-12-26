ALTER TABLE truck_availability
  ADD COLUMN IF NOT EXISTS external_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS external_contact_phone TEXT;
