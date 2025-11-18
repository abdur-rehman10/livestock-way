-- Phase 1 – Add tables for:
-- - Pre-trip checklists
-- - ePOD (electronic proof of delivery)
-- - Trip expenses

-- 1) Pre-trip checklist
CREATE TABLE IF NOT EXISTS pre_trip_checks (
    id                  BIGSERIAL PRIMARY KEY,
    trip_id             BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id           BIGINT NOT NULL REFERENCES drivers(id),
    truck_id            BIGINT NOT NULL REFERENCES trucks(id),

    checklist_status    text NOT NULL DEFAULT 'COMPLETED', -- or DRAFT, etc.

    -- Basic vehicle checks
    is_vehicle_clean                boolean,
    is_vehicle_roadworthy           boolean,
    tyres_ok                        boolean,
    brakes_ok                       boolean,
    lights_ok                       boolean,
    gate_latches_ok                 boolean,
    ventilation_ok                  boolean,

    -- Animal fitness checks
    is_animals_fit_to_travel        boolean,
    overcrowding_checked            boolean,
    water_and_feed_checked          boolean,

    odometer_start                  numeric(10, 1),
    additional_notes                text,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_trip_checks_trip_id
    ON pre_trip_checks (trip_id);

CREATE INDEX IF NOT EXISTS idx_pre_trip_checks_driver_id
    ON pre_trip_checks (driver_id);

-- Ensure only one active checklist per trip (MVP assumption)
CREATE UNIQUE INDEX IF NOT EXISTS ux_pre_trip_checks_trip
    ON pre_trip_checks (trip_id);


-- 2) Trip ePOD (Proof of Delivery)
CREATE TABLE IF NOT EXISTS trip_epods (
    id                      BIGSERIAL PRIMARY KEY,
    trip_id                 BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

    delivered_at            timestamptz,
    receiver_name           text,
    receiver_signature      text,      -- could be a data URL, or an S3 URL later
    delivery_photos         jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of URLs
    delivery_notes          text,

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_trip_epods_trip
    ON trip_epods (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_epods_delivered_at
    ON trip_epods (delivered_at);


-- 3) Trip expenses
CREATE TABLE IF NOT EXISTS trip_expenses (
    id                  BIGSERIAL PRIMARY KEY,
    trip_id             BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id           BIGINT REFERENCES drivers(id),

    expense_type        text NOT NULL, -- FUEL, TOLL, PARKING, OTHER
    amount              numeric(12, 2) NOT NULL,
    currency            char(3) NOT NULL DEFAULT 'USD',

    description         text,
    receipt_photo_url   text,
    incurred_at         timestamptz,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id
    ON trip_expenses (trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_driver_id
    ON trip_expenses (driver_id);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_incurred_at
    ON trip_expenses (incurred_at);
