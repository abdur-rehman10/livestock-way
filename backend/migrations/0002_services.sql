-- Service marketplace tables for stakeholder listings and hauler bookings

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_booking_status_enum') THEN
        CREATE TYPE service_booking_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_payment_status_enum') THEN
        CREATE TYPE service_payment_status_enum AS ENUM ('unpaid', 'pending', 'paid');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS service_listings (
    id              BIGSERIAL PRIMARY KEY,
    stakeholder_id  BIGINT NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    owner_user_id   BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    service_type    TEXT,
    description     TEXT,
    location_name   TEXT,
    street_address  TEXT,
    city            TEXT,
    state           TEXT,
    zip             TEXT,
    price_type      TEXT NOT NULL DEFAULT 'fixed',
    base_price      NUMERIC(12,2),
    availability    TEXT,
    response_time   TEXT,
    certifications  TEXT,
    insured         BOOLEAN NOT NULL DEFAULT FALSE,
    images          TEXT[],
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_listings_status ON service_listings (status);
CREATE INDEX IF NOT EXISTS idx_service_listings_type ON service_listings (service_type);
CREATE INDEX IF NOT EXISTS idx_service_listings_owner ON service_listings (owner_user_id);

CREATE TABLE IF NOT EXISTS service_bookings (
    id              BIGSERIAL PRIMARY KEY,
    service_id      BIGINT NOT NULL REFERENCES service_listings(id) ON DELETE CASCADE,
    stakeholder_id  BIGINT NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    hauler_id       BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    hauler_user_id  BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    price           NUMERIC(12,2),
    notes           TEXT,
    status          service_booking_status_enum NOT NULL DEFAULT 'pending',
    payment_status  service_payment_status_enum NOT NULL DEFAULT 'unpaid',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at     TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_service ON service_bookings (service_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_hauler ON service_bookings (hauler_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON service_bookings (status);
CREATE INDEX IF NOT EXISTS idx_service_bookings_payment_status ON service_bookings (payment_status);
