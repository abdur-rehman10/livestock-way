-- Job listings and applications for haulers and shippers

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_application_status_enum') THEN
        CREATE TYPE job_application_status_enum AS ENUM ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn');
    END IF;
END$$;

-- Job listings table
CREATE TABLE IF NOT EXISTS job_listings (
    id                  BIGSERIAL PRIMARY KEY,
    posted_by_user_id   BIGSERIAL NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    posted_by_role      TEXT NOT NULL CHECK (posted_by_role IN ('hauler', 'shipper')),
    hauler_id           BIGINT REFERENCES haulers(id) ON DELETE CASCADE,
    shipper_id          BIGINT REFERENCES shippers(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    required_skills     TEXT,
    job_type            TEXT NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'temporary', 'freelance')),
    location_type       TEXT NOT NULL CHECK (location_type IN ('remote', 'on-site', 'mobile')),
    location            TEXT,
    salary              TEXT,
    salary_frequency    TEXT CHECK (salary_frequency IN ('hourly', 'weekly', 'monthly', 'yearly', 'project')),
    benefits_accommodation BOOLEAN DEFAULT FALSE,
    benefits_food       BOOLEAN DEFAULT FALSE,
    benefits_fuel       BOOLEAN DEFAULT FALSE,
    benefits_vehicle    BOOLEAN DEFAULT FALSE,
    benefits_bonus      BOOLEAN DEFAULT FALSE,
    benefits_others     BOOLEAN DEFAULT FALSE,
    contact_person      TEXT NOT NULL,
    contact_phone       TEXT NOT NULL,
    preferred_call_time TEXT,
    contact_email       TEXT,
    photos              TEXT[],
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'filled')),
    views               INTEGER DEFAULT 0,
    application_count   INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_listings_posted_by ON job_listings (posted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_role ON job_listings (posted_by_role);
CREATE INDEX IF NOT EXISTS idx_job_listings_hauler ON job_listings (hauler_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_shipper ON job_listings (shipper_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_status ON job_listings (status);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON job_listings (created_at DESC);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    applicant_user_id   BIGSERIAL NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    applicant_name      TEXT NOT NULL,
    applicant_email     TEXT NOT NULL,
    applicant_phone     TEXT NOT NULL,
    resume_url          TEXT,
    cover_letter        TEXT,
    status              job_application_status_enum NOT NULL DEFAULT 'pending',
    reviewed_at         TIMESTAMPTZ,
    reviewed_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications (applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications (status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications (created_at DESC);

-- Function to update application count
CREATE OR REPLACE FUNCTION update_job_application_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE job_listings
        SET application_count = application_count + 1
        WHERE id = NEW.job_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE job_listings
        SET application_count = GREATEST(application_count - 1, 0)
        WHERE id = OLD.job_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_application_count
    AFTER INSERT OR DELETE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_job_application_count();
