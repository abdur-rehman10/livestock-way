-- Buy and Sell listings and applications for haulers and shippers

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'buy_sell_application_status_enum') THEN
        CREATE TYPE buy_sell_application_status_enum AS ENUM ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn');
    END IF;
END$$;

-- Buy and Sell listings table
CREATE TABLE IF NOT EXISTS buy_and_sell_listings (
    id                  BIGSERIAL PRIMARY KEY,
    posted_by_user_id   BIGSERIAL NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    posted_by_role      TEXT NOT NULL CHECK (posted_by_role IN ('hauler', 'shipper')),
    hauler_id           BIGINT REFERENCES haulers(id) ON DELETE CASCADE,
    shipper_id          BIGINT REFERENCES shippers(id) ON DELETE CASCADE,
    listing_type        TEXT NOT NULL CHECK (listing_type IN ('for-sale', 'wanted', 'for-rent')),
    category            TEXT NOT NULL CHECK (category IN ('equipment', 'livestock', 'supplies', 'services', 'vehicles', 'trailers')),
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    price               NUMERIC(12,2),
    price_type          TEXT CHECK (price_type IN ('fixed', 'negotiable', 'per-unit', 'per-head', 'obo')),
    payment_terms       TEXT CHECK (payment_terms IN ('cash', 'check', 'financing', 'trade', 'flexible')),
    city                TEXT NOT NULL,
    state               TEXT NOT NULL,
    zip_code            TEXT,
    contact_name        TEXT NOT NULL,
    contact_phone       TEXT NOT NULL,
    contact_email       TEXT,
    photos              TEXT[],
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'sold')),
    views               INTEGER DEFAULT 0,
    application_count   INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_posted_by ON buy_and_sell_listings (posted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_role ON buy_and_sell_listings (posted_by_role);
CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_hauler ON buy_and_sell_listings (hauler_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_shipper ON buy_and_sell_listings (shipper_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_status ON buy_and_sell_listings (status);
CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_category ON buy_and_sell_listings (category);
CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_listing_type ON buy_and_sell_listings (listing_type);
CREATE INDEX IF NOT EXISTS idx_buy_sell_listings_created_at ON buy_and_sell_listings (created_at DESC);

-- Buy and Sell applications table
CREATE TABLE IF NOT EXISTS buy_and_sell_applications (
    id                  BIGSERIAL PRIMARY KEY,
    listing_id         BIGINT NOT NULL REFERENCES buy_and_sell_listings(id) ON DELETE CASCADE,
    applicant_user_id   BIGSERIAL NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    applicant_name      TEXT NOT NULL,
    applicant_email     TEXT NOT NULL,
    applicant_phone     TEXT NOT NULL,
    offered_price       NUMERIC(12,2),
    message             TEXT,
    status              buy_sell_application_status_enum NOT NULL DEFAULT 'pending',
    reviewed_at         TIMESTAMPTZ,
    reviewed_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buy_sell_applications_listing_id ON buy_and_sell_applications (listing_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_applications_applicant ON buy_and_sell_applications (applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_applications_status ON buy_and_sell_applications (status);
CREATE INDEX IF NOT EXISTS idx_buy_sell_applications_created_at ON buy_and_sell_applications (created_at DESC);

-- Function to update application count
CREATE OR REPLACE FUNCTION update_buy_sell_application_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE buy_and_sell_listings
        SET application_count = application_count + 1
        WHERE id = NEW.listing_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE buy_and_sell_listings
        SET application_count = GREATEST(application_count - 1, 0)
        WHERE id = OLD.listing_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_buy_sell_application_count
    AFTER INSERT OR DELETE ON buy_and_sell_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_buy_sell_application_count();
