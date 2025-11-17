-- =========================================================
-- LivestockWay - Phase 1 MVP
-- Document C — SQL DDL (PostgreSQL)
-- =========================================================

-- ================================
-- 1. ENUM TYPES
-- ================================

CREATE TYPE tenant_type_enum AS ENUM ('HAULER', 'SHIPPER', 'STAKEHOLDER', 'PLATFORM_PARTNER');

CREATE TYPE verification_status_enum AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

CREATE TYPE user_type_enum AS ENUM ('HAULER', 'SHIPPER', 'STAKEHOLDER', 'PLATFORM');

CREATE TYPE truck_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'IN_TRIP', 'MAINTENANCE');

CREATE TYPE driver_status_enum AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE load_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'MATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

CREATE TYPE load_visibility_enum AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TYPE rate_type_enum AS ENUM ('PER_MILE', 'FLAT');

CREATE TYPE bid_status_enum AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

CREATE TYPE trip_status_enum AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

CREATE TYPE checklist_status_enum AS ENUM ('PENDING', 'COMPLETED');

CREATE TYPE checklist_item_status_enum AS ENUM ('PENDING', 'COMPLETED', 'NOT_APPLICABLE');

CREATE TYPE expense_type_enum AS ENUM ('FUEL', 'TOLL', 'PARKING', 'OTHER');

CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'ESCROWED', 'RELEASED', 'REFUNDED', 'FAILED');

CREATE TYPE escrow_status_enum AS ENUM ('INITIATED', 'FUNDED', 'RELEASED', 'ON_HOLD', 'DISPUTED', 'CLOSED');

CREATE TYPE service_type_enum AS ENUM ('WASHOUT', 'HAY', 'FEED', 'VET', 'OTHER');

CREATE TYPE dispute_status_enum AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

CREATE TYPE support_ticket_category_enum AS ENUM ('ACCOUNT', 'TRIP', 'PAYMENT', 'TECHNICAL', 'OTHER');

CREATE TYPE support_ticket_status_enum AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

CREATE TYPE support_ticket_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE notification_platform_enum AS ENUM ('ANDROID', 'IOS', 'WEB');

CREATE TYPE entity_type_enum AS ENUM ('DRIVER', 'TRUCK', 'TENANT', 'USER');

-- Could reuse tenant_type_enum for onboarding, but create a dedicated one for clarity if needed
CREATE TYPE onboarding_tenant_type_enum AS ENUM ('HAULER', 'SHIPPER', 'STAKEHOLDER');

-- ================================
-- 2. CORE ORGANIZATION & USERS
-- ================================

CREATE TABLE tenants (
    id                      UUID PRIMARY KEY,
    name                    VARCHAR(255) NOT NULL,
    tenant_type             tenant_type_enum NOT NULL,
    country                 VARCHAR(2),
    timezone                VARCHAR(64),
    verification_status     verification_status_enum NOT NULL DEFAULT 'UNVERIFIED',
    notes                   TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE
);

CREATE TABLE users (
    id                      UUID PRIMARY KEY,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password_hash           VARCHAR(255) NOT NULL,
    full_name               VARCHAR(255) NOT NULL,
    phone                   VARCHAR(32),
    default_tenant_id       UUID REFERENCES tenants(id),
    user_type               user_type_enum NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at           TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_default_tenant ON users (default_tenant_id);

CREATE TABLE roles (
    id                      UUID PRIMARY KEY,
    code                    VARCHAR(64) NOT NULL UNIQUE,
    description             VARCHAR(255)
);

CREATE TABLE user_roles (
    user_id                 UUID NOT NULL REFERENCES users(id),
    role_id                 UUID NOT NULL REFERENCES roles(id),
    tenant_id               UUID REFERENCES tenants(id),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, role_id, tenant_id)
);

CREATE TABLE phone_verifications (
    id                      UUID PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES users(id),
    phone                   VARCHAR(32) NOT NULL,
    otp_code                VARCHAR(10) NOT NULL,
    expires_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at             TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE refresh_tokens (
    id                      UUID PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES users(id),
    token                   VARCHAR(512) NOT NULL UNIQUE,
    expires_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at              TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ================================
-- 3. CORE TMS ENTITIES
-- ================================

CREATE TABLE trucks (
    id                      UUID PRIMARY KEY,
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    plate_number            VARCHAR(64) NOT NULL,
    vin                     VARCHAR(64),
    truck_type              VARCHAR(64) NOT NULL,
    capacity_lbs            INTEGER NOT NULL,
    makes                   VARCHAR(128),
    model                   VARCHAR(128),
    year                    SMALLINT,
    species_supported       TEXT[],
    status                  truck_status_enum NOT NULL DEFAULT 'ACTIVE',
    notes                   TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by              UUID REFERENCES users(id),
    updated_by              UUID REFERENCES users(id),
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_trucks_plate_unique
    ON trucks (tenant_id, plate_number);

CREATE INDEX idx_trucks_tenant
    ON trucks (tenant_id);

CREATE TABLE drivers (
    id                      UUID PRIMARY KEY,
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    full_name               VARCHAR(255) NOT NULL,
    phone                   VARCHAR(32) NOT NULL,
    email                   VARCHAR(255),
    license_number          VARCHAR(64) NOT NULL,
    license_state           VARCHAR(32),
    license_country         VARCHAR(2),
    linked_user_id          UUID REFERENCES users(id),
    status                  driver_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_drivers_tenant
    ON drivers (tenant_id);

CREATE INDEX idx_drivers_linked_user
    ON drivers (linked_user_id);

CREATE TABLE truck_availability (
    id                      UUID PRIMARY KEY,
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    truck_id                UUID NOT NULL REFERENCES trucks(id),
    available_from          TIMESTAMP WITH TIME ZONE NOT NULL,
    available_to            TIMESTAMP WITH TIME ZONE NOT NULL,
    origin_lat              NUMERIC(9,6),
    origin_lng              NUMERIC(9,6),
    origin_city             VARCHAR(128),
    origin_state            VARCHAR(128),
    origin_country          VARCHAR(2),
    preferred_radius_miles  INTEGER,
    is_public               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_truck_avail_tenant ON truck_availability (tenant_id);
CREATE INDEX idx_truck_avail_origin_geo ON truck_availability (origin_lat, origin_lng);

-- ================================
-- 4. LOADS, BIDS, TRIPS
-- ================================

CREATE TABLE loads (
    id                      UUID PRIMARY KEY,
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    title                   VARCHAR(255) NOT NULL,
    species                 VARCHAR(64) NOT NULL,
    estimated_head_count    INTEGER,
    estimated_weight_lbs    INTEGER,
    pickup_earliest_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_latest_at        TIMESTAMP WITH TIME ZONE,
    pickup_address          VARCHAR(255),
    pickup_city             VARCHAR(128),
    pickup_state            VARCHAR(128),
    pickup_country          VARCHAR(2),
    pickup_lat              NUMERIC(9,6),
    pickup_lng              NUMERIC(9,6),
    delivery_address        VARCHAR(255),
    delivery_city           VARCHAR(128),
    delivery_state          VARCHAR(128),
    delivery_country        VARCHAR(2),
    delivery_lat            NUMERIC(9,6),
    delivery_lng            NUMERIC(9,6),
    distance_miles          NUMERIC(8,2),
    rate_type               rate_type_enum NOT NULL,
    rate_per_mile           NUMERIC(10,2),
    flat_rate               NUMERIC(10,2),
    currency                VARCHAR(3) NOT NULL DEFAULT 'USD',
    visibility              load_visibility_enum NOT NULL DEFAULT 'PUBLIC',
    status                  load_status_enum NOT NULL DEFAULT 'DRAFT',
    special_requirements    TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by              UUID REFERENCES users(id),
    updated_by              UUID REFERENCES users(id),
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP WITH TIME ZONE
);

... (truncated for brevity)
