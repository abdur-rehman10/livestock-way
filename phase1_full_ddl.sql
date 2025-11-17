-- =========================================================
-- LivestockWay Phase 1 - Full DDL (PostgreSQL)
-- =========================================================

-- Optional: set search path
-- SET search_path TO public;

-- =========================================================
-- ENUM TYPES
-- =========================================================

CREATE TYPE user_type_enum AS ENUM (
    'shipper',
    'hauler',
    'stakeholder',
    'admin',
    'super_admin'
);

CREATE TYPE account_status_enum AS ENUM (
    'pending',
    'active',
    'suspended'
);

CREATE TYPE auth_provider_enum AS ENUM (
    'password',
    'google',
    'apple',
    'phone_otp'
);

CREATE TYPE truck_status_enum AS ENUM (
    'active',
    'inactive',
    'maintenance'
);

CREATE TYPE truck_type_enum AS ENUM (
    'cattle_trailer',
    'horse_trailer',
    'sheep_trailer',
    'pig_trailer',
    'mixed_livestock',
    'other'
);

CREATE TYPE driver_status_enum AS ENUM (
    'active',
    'inactive'
);

CREATE TYPE load_status_enum AS ENUM (
    'draft',
    'posted',
    'matched',
    'in_transit',
    'completed',
    'cancelled'
);

CREATE TYPE load_visibility_enum AS ENUM (
    'public',
    'private'
);

CREATE TYPE bid_status_enum AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'withdrawn',
    'expired'
);

CREATE TYPE trip_status_enum AS ENUM (
    'planned',
    'assigned',
    'en_route',
    'completed',
    'cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
    'pending',
    'in_escrow',
    'released',
    'refunded',
    'failed'
);

CREATE TYPE transaction_type_enum AS ENUM (
    'escrow_fund',
    'escrow_release',
    'commission',
    'refund'
);

CREATE TYPE notification_channel_enum AS ENUM (
    'email',
    'sms',
    'whatsapp',
    'push',
    'in_app'
);

CREATE TYPE notification_status_enum AS ENUM (
    'queued',
    'sent',
    'failed',
    'read'
);

CREATE TYPE document_type_enum AS ENUM (
    'license',
    'permit',
    'insurance',
    'other'
);

CREATE TYPE document_status_enum AS ENUM (
    'pending_verification',
    'verified',
    'rejected'
);

CREATE TYPE checklist_status_enum AS ENUM (
    'not_started',
    'in_progress',
    'completed'
);

CREATE TYPE checklist_item_status_enum AS ENUM (
    'pending',
    'passed',
    'failed'
);

CREATE TYPE device_platform_enum AS ENUM (
    'ios',
    'android',
    'web'
);

CREATE TYPE dispute_status_enum AS ENUM (
    'open',
    'in_review',
    'resolved',
    'rejected'
);

CREATE TYPE pricing_plan_enum AS ENUM (
    'free',
    'hauler_basic',
    'hauler_premium',
    'shipper_pilot'
);

-- =========================================================
-- CORE USER & AUTH TABLES
-- =========================================================

CREATE TABLE app_users (
    id                  BIGSERIAL PRIMARY KEY,
    email               TEXT UNIQUE,
    phone_number        TEXT,
    phone_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash       TEXT,
    user_type           user_type_enum NOT NULL,
    account_status      account_status_enum NOT NULL DEFAULT 'pending',
    full_name           TEXT,
    company_name        TEXT,
    country             TEXT,
    timezone            TEXT,
    preferred_language  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_users_user_type ON app_users (user_type);
CREATE INDEX idx_app_users_account_status ON app_users (account_status);

CREATE TABLE user_auth_providers (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    provider            auth_provider_enum NOT NULL,
    provider_user_id    TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_auth_provider_user
    ON user_auth_providers (provider, provider_user_id);

CREATE TABLE user_roles (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE user_role_assignments (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role_id     BIGINT NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_user_role_assignment
    ON user_role_assignments (user_id, role_id);

-- Basic KYC tracking
CREATE TABLE kyc_requests (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    status          document_status_enum NOT NULL DEFAULT 'pending_verification',
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    review_notes    TEXT
);

-- =========================================================
-- BUSINESS PROFILES (HAULERS, SHIPPERS, STAKEHOLDERS)
-- =========================================================

CREATE TABLE haulers (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    legal_name      TEXT,
    dot_number      TEXT,
    tax_id          TEXT,
    website_url     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_haulers_user_id ON haulers (user_id);

CREATE TABLE shippers (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    farm_name       TEXT,
    registration_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_shippers_user_id ON shippers (user_id);

CREATE TABLE stakeholders (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    service_type    TEXT, -- e.g. washout, vet, hay_supplier
    company_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_stakeholders_user_id ON stakeholders (user_id);

-- =========================================================
-- TRUCKS, DRIVERS, REGISTRY
-- =========================================================

CREATE TABLE trucks (
    id                      BIGSERIAL PRIMARY KEY,
    hauler_id               BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    plate_number            TEXT NOT NULL,
    truck_type              truck_type_enum NOT NULL,
    capacity_weight_kg      NUMERIC(12,2),
    capacity_headcount      INTEGER,
    year_of_manufacture     INTEGER,
    status                  truck_status_enum NOT NULL DEFAULT 'active',
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_trucks_plate_hauler
    ON trucks (hauler_id, plate_number);

CREATE TABLE drivers (
    id                  BIGSERIAL PRIMARY KEY,
    hauler_id           BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    user_id             BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    full_name           TEXT NOT NULL,
    phone_number        TEXT,
    license_number      TEXT,
    license_expiry      DATE,
    status              driver_status_enum NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_hauler_id ON drivers (hauler_id);

-- =========================================================
-- LOADS & TRUCK AVAILABILITY (LOAD BOARD)
-- =========================================================

CREATE TABLE loads (
    id                      BIGSERIAL PRIMARY KEY,
    shipper_id              BIGINT NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    species                 TEXT,      -- e.g. cattle, sheep
    animal_count            INTEGER,
    estimated_weight_kg     NUMERIC(12,2),
    pickup_location_text    TEXT NOT NULL,
    pickup_lat              NUMERIC(10,7),
    pickup_lng              NUMERIC(10,7),
    dropoff_location_text   TEXT NOT NULL,
    dropoff_lat             NUMERIC(10,7),
    dropoff_lng             NUMERIC(10,7),
    pickup_window_start     TIMESTAMPTZ,
    pickup_window_end       TIMESTAMPTZ,
    delivery_window_start   TIMESTAMPTZ,
    delivery_window_end     TIMESTAMPTZ,
    distance_km             NUMERIC(10,2),
    price_offer_amount      NUMERIC(14,2),
    price_currency          CHAR(3) DEFAULT 'USD',
    visibility              load_visibility_enum NOT NULL DEFAULT 'public',
    status                  load_status_enum NOT NULL DEFAULT 'draft',
    notes                   TEXT,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loads_status ON loads (status);
CREATE INDEX idx_loads_visibility ON loads (visibility);
CREATE INDEX idx_loads_shipper_id ON loads (shipper_id);

-- Private load invitations (for specific haulers)
CREATE TABLE load_invitations (
    id              BIGSERIAL PRIMARY KEY,
    load_id         BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id       BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    invited_by_user BIGINT NOT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted        BOOLEAN,
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_load_invitations_unique
    ON load_invitations (load_id, hauler_id);

-- Truck availability postings ("Post a Truck")
CREATE TABLE truck_availability (
    id                      BIGSERIAL PRIMARY KEY,
    hauler_id               BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    truck_id                BIGINT REFERENCES trucks(id) ON DELETE SET NULL,
    origin_location_text    TEXT NOT NULL,
    origin_lat              NUMERIC(10,7),
    origin_lng              NUMERIC(10,7),
    destination_location_text TEXT,
    destination_lat         NUMERIC(10,7),
    destination_lng         NUMERIC(10,7),
    available_from          TIMESTAMPTZ NOT NULL,
    available_until         TIMESTAMPTZ,
    notes                   TEXT,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_truck_availability_hauler
    ON truck_availability (hauler_id, is_active);

-- =========================================================
-- MATCHING, BIDS & TRIPS
-- =========================================================

CREATE TABLE bids (
    id              BIGSERIAL PRIMARY KEY,
    load_id         BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id       BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    truck_id        BIGINT REFERENCES trucks(id) ON DELETE SET NULL,
    amount          NUMERIC(14,2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    status          bid_status_enum NOT NULL DEFAULT 'pending',
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bids_load_id ON bids (load_id);
CREATE INDEX idx_bids_hauler_id ON bids (hauler_id);
CREATE INDEX idx_bids_status ON bids (status);

CREATE TABLE trips (
    id                      BIGSERIAL PRIMARY KEY,
    load_id                 BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id               BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    truck_id                BIGINT NOT NULL REFERENCES trucks(id) ON DELETE SET NULL,
    driver_id               BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    accepted_bid_id         BIGINT REFERENCES bids(id) ON DELETE SET NULL,
    status                  trip_status_enum NOT NULL DEFAULT 'planned',
    planned_start_time      TIMESTAMPTZ,
    planned_end_time        TIMESTAMPTZ,
    actual_start_time       TIMESTAMPTZ,
    actual_end_time         TIMESTAMPTZ,
    route_distance_km       NUMERIC(10,2),
    rest_stop_plan_json     JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_status ON trips (status);
CREATE INDEX idx_trips_hauler_id ON trips (hauler_id);
CREATE INDEX idx_trips_driver_id ON trips (driver_id);

-- GPS / location tracking (for basic traceability)
CREATE TABLE trip_locations (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL,
    latitude        NUMERIC(10,7) NOT NULL,
    longitude       NUMERIC(10,7) NOT NULL,
    speed_kmh       NUMERIC(6,2),
    source          TEXT, -- e.g. "driver_app"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_locations_trip_id ON trip_locations (trip_id, recorded_at);

-- =========================================================
-- PRE-TRIP CHECKLIST & DOCUMENTS (ePOD)
-- =========================================================

CREATE TABLE pre_trip_checklists (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id       BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    status          checklist_status_enum NOT NULL DEFAULT 'not_started',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_pre_trip_checklists_trip
    ON pre_trip_checklists (trip_id);

CREATE TABLE pre_trip_checklist_items (
    id              BIGSERIAL PRIMARY KEY,
    checklist_id    BIGINT NOT NULL REFERENCES pre_trip_checklists(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    status          checklist_item_status_enum NOT NULL DEFAULT 'pending',
    notes           TEXT,
    checked_at      TIMESTAMPTZ
);

CREATE INDEX idx_checklist_items_checklist_id
    ON pre_trip_checklist_items (checklist_id);

CREATE TABLE uploaded_documents (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    hauler_id           BIGINT REFERENCES haulers(id) ON DELETE SET NULL,
    driver_id           BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    document_type       document_type_enum NOT NULL,
    status              document_status_enum NOT NULL DEFAULT 'pending_verification',
    file_url            TEXT NOT NULL,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE epod_documents (
    id                  BIGSERIAL PRIMARY KEY,
    trip_id             BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    signed_by_name      TEXT,
    signed_by_role      TEXT, -- e.g. "receiver", "farm_manager"
    signed_at           TIMESTAMPTZ,
    signature_image_url TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_epod_trip_id ON epod_documents (trip_id);

CREATE TABLE trip_photos (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    photo_url       TEXT NOT NULL,
    label           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- EXPENSE LOGGING
-- =========================================================

CREATE TABLE trip_expenses (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id       BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    expense_type    TEXT NOT NULL, -- e.g. fuel, toll, parking
    amount          NUMERIC(14,2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    incurred_at     TIMESTAMPTZ NOT NULL,
    receipt_url     TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_expenses_trip_id ON trip_expenses (trip_id);

-- =========================================================
-- PAYMENTS & ESCROW
-- =========================================================

CREATE TABLE payments (
    id                  BIGSERIAL PRIMARY KEY,
    load_id             BIGINT REFERENCES loads(id) ON DELETE SET NULL,
    trip_id             BIGINT REFERENCES trips(id) ON DELETE SET NULL,
    payer_user_id       BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    payee_user_id       BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    amount              NUMERIC(14,2) NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    status              payment_status_enum NOT NULL DEFAULT 'pending',
    escrow_reference    TEXT,
    commission_amount   NUMERIC(14,2),
    commission_bps      INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_payer ON payments (payer_user_id);
CREATE INDEX idx_payments_payee ON payments (payee_user_id);

CREATE TABLE payment_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    payment_id          BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    transaction_type    transaction_type_enum NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    status              payment_status_enum NOT NULL DEFAULT 'pending',
    external_reference  TEXT,
    processed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_payment_id
    ON payment_transactions (payment_id);

-- =========================================================
-- PRICING & SUBSCRIPTIONS
-- =========================================================

CREATE TABLE pricing_plans (
    id                  BIGSERIAL PRIMARY KEY,
    code                pricing_plan_enum NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    description         TEXT,
    monthly_price_usd   NUMERIC(10,2) NOT NULL DEFAULT 0,
    transaction_fee_bps INTEGER NOT NULL DEFAULT 0, -- basis points (e.g. 250 = 2.5%)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_subscriptions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    hauler_id           BIGINT REFERENCES haulers(id) ON DELETE SET NULL,
    plan_code           pricing_plan_enum NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id
    ON user_subscriptions (user_id, is_active);

-- =========================================================
-- NOTIFICATIONS & DEVICES
-- =========================================================

CREATE TABLE devices (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    platform            device_platform_enum NOT NULL,
    device_token        TEXT NOT NULL,
    last_seen_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_devices_user_platform_token
    ON devices (user_id, platform, device_token);

CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    channel             notification_channel_enum NOT NULL,
    template_code       TEXT,
    payload_json        JSONB,
    status              notification_status_enum NOT NULL DEFAULT 'queued',
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id
    ON notifications (user_id, status);

-- =========================================================
-- DISPUTES & AUDIT LOGS
-- =========================================================

CREATE TABLE disputes (
    id                      BIGSERIAL PRIMARY KEY,
    load_id                 BIGINT REFERENCES loads(id) ON DELETE SET NULL,
    trip_id                 BIGINT REFERENCES trips(id) ON DELETE SET NULL,
    raised_by_user_id       BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    status                  dispute_status_enum NOT NULL DEFAULT 'open',
    description             TEXT NOT NULL,
    resolution_notes        TEXT,
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_status ON disputes (status);

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    event_type      TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       BIGINT,
    metadata_json   JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs (entity_type, entity_id);

-- =========================================================
-- SIMPLE ADMIN METRICS HELPERS (OPTIONAL)
-- =========================================================

-- Example material for ops dashboards can be built via views later.
-- Phase 1 keeps it simple: raw tables above are enough.