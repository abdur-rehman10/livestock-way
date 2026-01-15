-- Add stakeholder support to job_listings, buy_and_sell_listings, and resources_listings

-- Update job_listings table
ALTER TABLE job_listings 
  DROP CONSTRAINT IF EXISTS job_listings_posted_by_role_check;

ALTER TABLE job_listings 
  ADD CONSTRAINT job_listings_posted_by_role_check 
  CHECK (posted_by_role IN ('hauler', 'shipper', 'stakeholder'));

ALTER TABLE job_listings 
  ADD COLUMN IF NOT EXISTS stakeholder_id BIGINT REFERENCES stakeholders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_job_listings_stakeholder ON job_listings (stakeholder_id);

-- Update buy_and_sell_listings table
ALTER TABLE buy_and_sell_listings 
  DROP CONSTRAINT IF EXISTS buy_and_sell_listings_posted_by_role_check;

ALTER TABLE buy_and_sell_listings 
  ADD CONSTRAINT buy_and_sell_listings_posted_by_role_check 
  CHECK (posted_by_role IN ('hauler', 'shipper', 'stakeholder'));

ALTER TABLE buy_and_sell_listings 
  ADD COLUMN IF NOT EXISTS stakeholder_id BIGINT REFERENCES stakeholders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_buy_and_sell_listings_stakeholder ON buy_and_sell_listings (stakeholder_id);

-- Update resources_listings table
ALTER TABLE resources_listings 
  DROP CONSTRAINT IF EXISTS resources_listings_posted_by_role_check;

ALTER TABLE resources_listings 
  ADD CONSTRAINT resources_listings_posted_by_role_check 
  CHECK (posted_by_role IN ('hauler', 'shipper', 'stakeholder'));

ALTER TABLE resources_listings 
  ADD COLUMN IF NOT EXISTS stakeholder_id BIGINT REFERENCES stakeholders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_resources_listings_stakeholder ON resources_listings (stakeholder_id);
