-- Resources listings and applications for haulers and shippers

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_application_status_enum') THEN
        CREATE TYPE resource_application_status_enum AS ENUM ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn');
    END IF;
END$$;

-- Resources listings table
CREATE TABLE IF NOT EXISTS resources_listings (
    id                  BIGSERIAL PRIMARY KEY,
    posted_by_user_id   BIGSERIAL NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    posted_by_role      TEXT NOT NULL CHECK (posted_by_role IN ('hauler', 'shipper')),
    hauler_id           BIGINT REFERENCES haulers(id) ON DELETE CASCADE,
    shipper_id          BIGINT REFERENCES shippers(id) ON DELETE CASCADE,
    resource_type       TEXT NOT NULL CHECK (resource_type IN ('logistics', 'insurance', 'washout', 'scale', 'hay', 'stud', 'salesyard', 'beefspotter')),
    title               TEXT NOT NULL,
    description         TEXT,
    -- Common fields
    contact_name        TEXT,
    contact_phone       TEXT NOT NULL,
    contact_email       TEXT,
    city                TEXT,
    state               TEXT,
    zip_code            TEXT,
    photos              TEXT[],
    -- Type-specific fields stored as JSONB for flexibility
    type_specific_data  JSONB DEFAULT '{}'::jsonb,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    views               INTEGER DEFAULT 0,
    application_count   INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_listings_posted_by ON resources_listings (posted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_resources_listings_role ON resources_listings (posted_by_role);
CREATE INDEX IF NOT EXISTS idx_resources_listings_hauler ON resources_listings (hauler_id);
CREATE INDEX IF NOT EXISTS idx_resources_listings_shipper ON resources_listings (shipper_id);
CREATE INDEX IF NOT EXISTS idx_resources_listings_status ON resources_listings (status);
CREATE INDEX IF NOT EXISTS idx_resources_listings_resource_type ON resources_listings (resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_listings_created_at ON resources_listings (created_at DESC);

-- Resources applications table
CREATE TABLE IF NOT EXISTS resources_applications (
    id                  BIGSERIAL PRIMARY KEY,
    listing_id         BIGINT NOT NULL REFERENCES resources_listings(id) ON DELETE CASCADE,
    applicant_user_id   BIGSERIAL NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    applicant_name      TEXT NOT NULL,
    applicant_email     TEXT NOT NULL,
    applicant_phone     TEXT NOT NULL,
    message             TEXT,
    status              resource_application_status_enum NOT NULL DEFAULT 'pending',
    reviewed_at         TIMESTAMPTZ,
    reviewed_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_applications_listing_id ON resources_applications (listing_id);
CREATE INDEX IF NOT EXISTS idx_resources_applications_applicant ON resources_applications (applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_resources_applications_status ON resources_applications (status);
CREATE INDEX IF NOT EXISTS idx_resources_applications_created_at ON resources_applications (created_at DESC);

-- Function to update application count
CREATE OR REPLACE FUNCTION update_resources_application_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE resources_listings
        SET application_count = application_count + 1
        WHERE id = NEW.listing_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE resources_listings
        SET application_count = GREATEST(application_count - 1, 0)
        WHERE id = OLD.listing_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resources_application_count
    AFTER INSERT OR DELETE ON resources_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_resources_application_count();
