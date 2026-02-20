-- Add extended profile fields to haulers
ALTER TABLE haulers ADD COLUMN IF NOT EXISTS years_in_business TEXT;
ALTER TABLE haulers ADD COLUMN IF NOT EXISTS truck_count TEXT;
ALTER TABLE haulers ADD COLUMN IF NOT EXISTS livestock_types TEXT[];
ALTER TABLE haulers ADD COLUMN IF NOT EXISTS route_preferences TEXT;
ALTER TABLE haulers ADD COLUMN IF NOT EXISTS availability_status TEXT;
ALTER TABLE haulers ADD COLUMN IF NOT EXISTS accept_escrow BOOLEAN DEFAULT FALSE;
ALTER TABLE haulers ADD COLUMN IF NOT EXISTS digital_compliance BOOLEAN DEFAULT FALSE;

-- Add extended profile fields to shippers
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS shipper_role TEXT;
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS livestock_types TEXT[];
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS shipping_frequency TEXT;
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS average_head_count TEXT;
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS loading_facilities TEXT[];
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS common_routes TEXT;
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS require_tracking BOOLEAN DEFAULT FALSE;
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS use_escrow BOOLEAN DEFAULT FALSE;
ALTER TABLE shippers ADD COLUMN IF NOT EXISTS monitor_cameras BOOLEAN DEFAULT FALSE;

-- Add extended profile fields to stakeholders
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS role_in_business TEXT;
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS provider_type TEXT;
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS years_in_business TEXT;
