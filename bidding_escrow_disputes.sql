BEGIN;

-- Extend existing enums so new marketplace states can be stored safely.
ALTER TYPE load_status_enum ADD VALUE IF NOT EXISTS 'AWAITING_ESCROW';
ALTER TYPE load_status_enum ADD VALUE IF NOT EXISTS 'DELIVERED';

ALTER TYPE trip_status_enum ADD VALUE IF NOT EXISTS 'PENDING_ESCROW';
ALTER TYPE trip_status_enum ADD VALUE IF NOT EXISTS 'READY_TO_START';
ALTER TYPE trip_status_enum ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE trip_status_enum ADD VALUE IF NOT EXISTS 'DELIVERED_AWAITING_CONFIRMATION';
ALTER TYPE trip_status_enum ADD VALUE IF NOT EXISTS 'DELIVERED_CONFIRMED';
ALTER TYPE trip_status_enum ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE trip_status_enum ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'AWAITING_FUNDING';
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'ESCROW_FUNDED';
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'RELEASED_TO_HAULER';
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'REFUNDED_TO_SHIPPER';
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'SPLIT_BETWEEN_PARTIES';
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TABLE IF NOT EXISTS load_offers (
    id                  BIGSERIAL PRIMARY KEY,
    load_id             BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id           BIGINT NOT NULL REFERENCES haulers(id) ON DELETE RESTRICT,
    created_by_user_id  BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    offered_amount      NUMERIC(12,2) NOT NULL CHECK (offered_amount > 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    message             TEXT,
    status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    expires_at          TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    rejected_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_load_offers_load_id
    ON load_offers (load_id);
CREATE INDEX IF NOT EXISTS idx_load_offers_hauler_id
    ON load_offers (hauler_id);
CREATE INDEX IF NOT EXISTS idx_load_offers_status
    ON load_offers (status);


CREATE TABLE IF NOT EXISTS load_offer_messages (
    id              BIGSERIAL PRIMARY KEY,
    offer_id        BIGINT NOT NULL REFERENCES load_offers(id) ON DELETE CASCADE,
    sender_user_id  BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    sender_role     VARCHAR(32) NOT NULL,
    text            TEXT,
    attachments     JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_load_offer_messages_offer_id_created_at
    ON load_offer_messages (offer_id, created_at);


CREATE TABLE IF NOT EXISTS payment_disputes (
    id                          BIGSERIAL PRIMARY KEY,
    trip_id                     BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
    payment_id                  BIGINT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    opened_by_user_id           BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    opened_by_role              VARCHAR(32) NOT NULL,
    status                      VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    reason_code                 VARCHAR(64) NOT NULL,
    description                 TEXT,
    requested_action            VARCHAR(32),
    resolution_type             VARCHAR(32),
    resolution_amount_to_hauler NUMERIC(12,2),
    resolution_amount_to_shipper NUMERIC(12,2),
    resolved_by_user_id         BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    opened_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_payment_id
    ON payment_disputes (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_trip_id
    ON payment_disputes (trip_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status
    ON payment_disputes (status);


CREATE TABLE IF NOT EXISTS dispute_messages (
    id              BIGSERIAL PRIMARY KEY,
    dispute_id      BIGINT NOT NULL REFERENCES payment_disputes(id) ON DELETE CASCADE,
    sender_user_id  BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    sender_role     VARCHAR(32) NOT NULL,
    text            TEXT,
    attachments     JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id_created_at
    ON dispute_messages (dispute_id, created_at);


ALTER TABLE loads
    ADD COLUMN IF NOT EXISTS asking_amount    NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS asking_currency  VARCHAR(3),
    ADD COLUMN IF NOT EXISTS awarded_offer_id BIGINT REFERENCES load_offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loads_awarded_offer_id
    ON loads (awarded_offer_id);


ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS hauler_id              BIGINT REFERENCES haulers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status                 VARCHAR(32) NOT NULL DEFAULT 'PENDING_ESCROW',
    ADD COLUMN IF NOT EXISTS delivered_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trips_status
    ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_hauler_id
    ON trips (hauler_id);


ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS auto_release_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS external_provider  VARCHAR(32),
    ADD COLUMN IF NOT EXISTS external_intent_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS external_charge_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS is_escrow          BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
