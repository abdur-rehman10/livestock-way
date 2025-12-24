-- =========================================================
-- LivestockWay Phase 1 – Full Schema (PostgreSQL)
-- Consolidated from: phase1_full_ddl.sql, add_* cols, bidding_escrow_disputes.sql,
-- truck_board_bookings.sql, truck_board_chat.sql, kyc_tables.sql,
-- support_ticket_messages.sql, trip_messages.sql, hauler_account_mode.sql, audit_logs.sql
-- =========================================================

-- ENUM TYPES ------------------------------------------------
CREATE TYPE user_type_enum AS ENUM ('shipper','hauler','stakeholder','admin','super_admin');
CREATE TYPE account_status_enum AS ENUM ('pending','active','suspended');
CREATE TYPE auth_provider_enum AS ENUM ('password','google','apple','phone_otp');
CREATE TYPE truck_status_enum AS ENUM ('active','inactive','maintenance');
CREATE TYPE truck_type_enum AS ENUM ('cattle_trailer','horse_trailer','sheep_trailer','pig_trailer','mixed_livestock','other');
CREATE TYPE driver_status_enum AS ENUM ('active','inactive');
CREATE TYPE load_status_enum AS ENUM ('draft','posted','matched','in_transit','completed','cancelled');
CREATE TYPE load_visibility_enum AS ENUM ('public','private');
CREATE TYPE bid_status_enum AS ENUM ('pending','accepted','rejected','withdrawn','expired');
CREATE TYPE trip_status_enum AS ENUM ('planned','assigned','en_route','completed','cancelled');
CREATE TYPE payment_status_enum AS ENUM ('pending','in_escrow','released','refunded','failed');
CREATE TYPE transaction_type_enum AS ENUM ('escrow_fund','escrow_release','commission','refund');
CREATE TYPE notification_channel_enum AS ENUM ('email','sms','whatsapp','push','in_app');
CREATE TYPE notification_status_enum AS ENUM ('queued','sent','failed','read');
CREATE TYPE document_type_enum AS ENUM ('license','permit','insurance','other');
CREATE TYPE document_status_enum AS ENUM ('pending_verification','verified','rejected');
CREATE TYPE checklist_status_enum AS ENUM ('not_started','in_progress','completed');
CREATE TYPE checklist_item_status_enum AS ENUM ('pending','passed','failed');
CREATE TYPE device_platform_enum AS ENUM ('ios','android','web');
CREATE TYPE dispute_status_enum AS ENUM ('open','in_review','resolved','rejected');
CREATE TYPE pricing_plan_enum AS ENUM ('free','hauler_basic','hauler_premium','shipper_pilot');

-- Later enum extensions (escrow, trips, payments)
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

-- Extra enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
    CREATE TYPE booking_status_enum AS ENUM ('REQUESTED','ACCEPTED','REJECTED','CANCELLED');
  END IF;
END$$;
CREATE TYPE truck_chat_status AS ENUM ('OPEN','CONVERTED','CLOSED');

-- CORE USERS/AUTH ------------------------------------------
CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    phone_number TEXT,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash TEXT,
    user_type user_type_enum NOT NULL,
    account_status account_status_enum NOT NULL DEFAULT 'pending',
    full_name TEXT,
    company_name TEXT,
    country TEXT,
    timezone TEXT,
    preferred_language TEXT,
    account_mode TEXT DEFAULT 'COMPANY',   -- added for hauler company vs individual
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_app_users_user_type ON app_users (user_type);
CREATE INDEX idx_app_users_account_status ON app_users (account_status);

CREATE TABLE user_auth_providers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    provider auth_provider_enum NOT NULL,
    provider_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE user_roles (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE user_role_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

-- KYC (latest version)
CREATE TABLE IF NOT EXISTS kyc_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON kyc_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests (status);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id BIGSERIAL PRIMARY KEY,
  kyc_request_id BIGINT NOT NULL REFERENCES kyc_requests(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_request_id ON kyc_documents (kyc_request_id);

-- BUSINESS PROFILES ----------------------------------------
CREATE TABLE haulers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    legal_name TEXT,
    dot_number TEXT,
    tax_id TEXT,
    website_url TEXT,
    hauler_type TEXT DEFAULT 'company', -- added to mirror account_mode
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE TABLE shippers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    farm_name TEXT,
    registration_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE TABLE stakeholders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    service_type TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- TRUCKS & DRIVERS -----------------------------------------
CREATE TABLE trucks (
    id BIGSERIAL PRIMARY KEY,
    hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    truck_type truck_type_enum NOT NULL,
    capacity_weight_kg NUMERIC(12,2),
    capacity_headcount INTEGER,
    year_of_manufacture INTEGER,
    status truck_status_enum NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (hauler_id, plate_number)
);

CREATE TABLE drivers (
    id BIGSERIAL PRIMARY KEY,
    hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    license_number TEXT,
    license_expiry DATE,
    status driver_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_drivers_hauler_id ON drivers (hauler_id);

-- LOADS ----------------------------------------------------
CREATE TABLE loads (
    id BIGSERIAL PRIMARY KEY,
    shipper_id BIGINT NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    species TEXT,
    animal_count INTEGER,
    estimated_weight_kg NUMERIC(12,2),
    pickup_location_text TEXT NOT NULL,
    pickup_lat NUMERIC(10,7),
    pickup_lng NUMERIC(10,7),
    dropoff_location_text TEXT NOT NULL,
    dropoff_lat NUMERIC(10,7),
    dropoff_lng NUMERIC(10,7),
    pickup_window_start TIMESTAMPTZ,
    pickup_window_end TIMESTAMPTZ,
    delivery_window_start TIMESTAMPTZ,
    delivery_window_end TIMESTAMPTZ,
    distance_km NUMERIC(10,2),
    price_offer_amount NUMERIC(14,2),
    price_currency CHAR(3) DEFAULT 'USD',
    visibility load_visibility_enum NOT NULL DEFAULT 'public',
    status load_status_enum NOT NULL DEFAULT 'draft',
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- added columns
    assigned_to_user_id BIGINT,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    epod_url TEXT,
    asking_amount NUMERIC(12,2),
    asking_currency VARCHAR(3),
    awarded_offer_id BIGINT REFERENCES load_offers(id) ON DELETE SET NULL
);
CREATE INDEX idx_loads_status ON loads (status);
CREATE INDEX idx_loads_visibility ON loads (visibility);
CREATE INDEX idx_loads_shipper_id ON loads (shipper_id);
CREATE INDEX IF NOT EXISTS idx_loads_awarded_offer_id ON loads (awarded_offer_id);

CREATE TABLE load_invitations (
    id BIGSERIAL PRIMARY KEY,
    load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    invited_by_user BIGINT NOT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    accepted BOOLEAN,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (load_id, hauler_id)
);

-- Truck availability ("Post a Truck")
CREATE TABLE truck_availability (
    id BIGSERIAL PRIMARY KEY,
    hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    truck_id BIGINT REFERENCES trucks(id) ON DELETE SET NULL,
    origin_location_text TEXT NOT NULL,
    origin_lat NUMERIC(10,7),
    origin_lng NUMERIC(10,7),
    destination_location_text TEXT,
    destination_lat NUMERIC(10,7),
    destination_lng NUMERIC(10,7),
    available_from TIMESTAMPTZ NOT NULL,
    available_until TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- shared-capacity extensions
    capacity_headcount INTEGER,
    capacity_weight_kg NUMERIC(10,2),
    allow_shared BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_truck_availability_hauler ON truck_availability (hauler_id, is_active);

-- MATCHING / OFFERS / BOOKINGS -----------------------------
CREATE TABLE bids (
    id BIGSERIAL PRIMARY KEY,
    load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
    truck_id BIGINT REFERENCES trucks(id) ON DELETE SET NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status bid_status_enum NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bids_load_id ON bids (load_id);
CREATE INDEX idx_bids_hauler_id ON bids (hauler_id);
CREATE INDEX idx_bids_status ON bids (status);

CREATE TABLE load_offers (
    id BIGSERIAL PRIMARY KEY,
    load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE RESTRICT,
    created_by_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    offered_amount NUMERIC(12,2) NOT NULL CHECK (offered_amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_load_offers_load_id ON load_offers (load_id);
CREATE INDEX idx_load_offers_hauler_id ON load_offers (hauler_id);
CREATE INDEX idx_load_offers_status ON load_offers (status);

CREATE TABLE load_offer_messages (
    id BIGSERIAL PRIMARY KEY,
    offer_id BIGINT NOT NULL REFERENCES load_offers(id) ON DELETE CASCADE,
    sender_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    sender_role VARCHAR(32) NOT NULL,
    text TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_load_offer_messages_offer_id_created_at ON load_offer_messages (offer_id, created_at);

-- Truck board bookings
CREATE TABLE load_bookings (
  id BIGSERIAL PRIMARY KEY,
  load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
  shipper_id BIGINT NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
  offer_id BIGINT REFERENCES load_offers(id) ON DELETE SET NULL,
  truck_availability_id BIGINT REFERENCES truck_availability(id) ON DELETE SET NULL,
  requested_headcount INTEGER,
  requested_weight_kg NUMERIC(10,2),
  status booking_status_enum NOT NULL DEFAULT 'REQUESTED',
  notes TEXT,
  offered_amount NUMERIC(12,2),
  offered_currency TEXT,
  created_by_user_id BIGINT NOT NULL REFERENCES app_users(id),
  updated_by_user_id BIGINT REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_load_bookings_load ON load_bookings(load_id);
CREATE INDEX idx_load_bookings_offer ON load_bookings(offer_id);
CREATE INDEX idx_load_bookings_truck_availability ON load_bookings(truck_availability_id);
CREATE INDEX idx_load_bookings_hauler_status ON load_bookings(hauler_id, status);

-- Truck board chat
CREATE TABLE truck_availability_chats (
  id BIGSERIAL PRIMARY KEY,
  truck_availability_id BIGINT NOT NULL REFERENCES truck_availability(id) ON DELETE CASCADE,
  shipper_id BIGINT NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
  load_id BIGINT REFERENCES loads(id) ON DELETE SET NULL,
  status truck_chat_status NOT NULL DEFAULT 'OPEN',
  created_by_user_id BIGINT NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE truck_availability_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES truck_availability_chats(id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  message TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_truck_chats_availability ON truck_availability_chats(truck_availability_id);
CREATE INDEX idx_truck_chats_shipper ON truck_availability_chats(shipper_id);
CREATE INDEX idx_truck_messages_chat ON truck_availability_messages(chat_id, created_at);

-- TRIPS ----------------------------------------------------
CREATE TABLE trips (
    id BIGSERIAL PRIMARY KEY,
    load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE SET NULL,
    truck_id BIGINT NOT NULL REFERENCES trucks(id) ON DELETE SET NULL,
    driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    accepted_bid_id BIGINT REFERENCES bids(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_ESCROW',
    planned_start_time TIMESTAMPTZ,
    planned_end_time TIMESTAMPTZ,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    delivered_confirmed_at TIMESTAMPTZ,
    route_distance_km NUMERIC(10,2),
    rest_stop_plan_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_trips_status ON trips (status);
CREATE INDEX idx_trips_hauler_id ON trips (hauler_id);
CREATE INDEX idx_trips_driver_id ON trips (driver_id);

CREATE TABLE trip_locations (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    speed_kmh NUMERIC(6,2),
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_trip_locations_trip_id ON trip_locations (trip_id, recorded_at);

-- Pre-trip checklist (simple MVP table; see also pre_trip_checklists in base)
CREATE TABLE IF NOT EXISTS pre_trip_checks (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id BIGINT NOT NULL REFERENCES drivers(id),
    truck_id BIGINT NOT NULL REFERENCES trucks(id),
    checklist_status text NOT NULL DEFAULT 'COMPLETED',
    is_vehicle_clean boolean,
    is_vehicle_roadworthy boolean,
    tyres_ok boolean,
    brakes_ok boolean,
    lights_ok boolean,
    gate_latches_ok boolean,
    ventilation_ok boolean,
    is_animals_fit_to_travel boolean,
    overcrowding_checked boolean,
    water_and_feed_checked boolean,
    odometer_start numeric(10,1),
    additional_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (trip_id)
);
CREATE INDEX IF NOT EXISTS idx_pre_trip_checks_trip_id ON pre_trip_checks (trip_id);
CREATE INDEX IF NOT EXISTS idx_pre_trip_checks_driver_id ON pre_trip_checks (driver_id);

-- ePOD
CREATE TABLE trip_epods (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    delivered_at timestamptz,
    receiver_name text,
    receiver_signature text,
    delivery_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
    delivery_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (trip_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_epods_delivered_at ON trip_epods (delivered_at);

-- Trip expenses (extended version)
CREATE TABLE trip_expenses (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id BIGINT REFERENCES drivers(id),
    expense_type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency char(3) NOT NULL DEFAULT 'USD',
    description text,
    receipt_photo_url text,
    incurred_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON trip_expenses (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_driver_id ON trip_expenses (driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_incurred_at ON trip_expenses (incurred_at);

-- Trip messages (chat)
CREATE TABLE IF NOT EXISTS trip_messages (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    sender VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_id_created_at ON trip_messages (trip_id, created_at);

-- DOCUMENTS (uploads, ePOD photos, etc.)
CREATE TABLE uploaded_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    hauler_id BIGINT REFERENCES haulers(id) ON DELETE SET NULL,
    driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
    document_type document_type_enum NOT NULL,
    status document_status_enum NOT NULL DEFAULT 'pending_verification',
    file_url TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE epod_documents (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    signed_by_name TEXT,
    signed_by_role TEXT,
    signed_at TIMESTAMPTZ,
    signature_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id)
);

CREATE TABLE trip_photos (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PAYMENTS / ESCROW ----------------------------------------
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    load_id BIGINT REFERENCES loads(id) ON DELETE SET NULL,
    trip_id BIGINT REFERENCES trips(id) ON DELETE SET NULL,
    payer_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    payee_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status payment_status_enum NOT NULL DEFAULT 'pending',
    escrow_reference TEXT,
    commission_amount NUMERIC(14,2),
    commission_bps INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    funded_at TIMESTAMPTZ,
    funded_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    released_at TIMESTAMPTZ,
    released_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    auto_release_at TIMESTAMPTZ,
    external_provider VARCHAR(32),
    external_intent_id VARCHAR(128),
    external_charge_id VARCHAR(128),
    is_escrow BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_payer ON payments (payer_user_id);
CREATE INDEX idx_payments_payee ON payments (payee_user_id);

CREATE TABLE payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    transaction_type transaction_type_enum NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status payment_status_enum NOT NULL DEFAULT 'pending',
    external_reference TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_transactions_payment_id ON payment_transactions (payment_id);

-- Subscriptions
CREATE TABLE pricing_plans (
    id BIGSERIAL PRIMARY KEY,
    code pricing_plan_enum NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    monthly_price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
    transaction_fee_bps INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    hauler_id BIGINT REFERENCES haulers(id) ON DELETE SET NULL,
    plan_code pricing_plan_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    INDEX (user_id, is_active)
);

-- NOTIFICATIONS --------------------------------------------
CREATE TABLE devices (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    platform device_platform_enum NOT NULL,
    device_token TEXT NOT NULL,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, platform, device_token)
);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    channel notification_channel_enum NOT NULL,
    template_code TEXT,
    payload_json JSONB,
    status notification_status_enum NOT NULL DEFAULT 'queued',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id ON notifications (user_id, status);

-- DISPUTES / COMPLIANCE ------------------------------------
CREATE TABLE payment_disputes (
    id BIGSERIAL PRIMARY KEY,
    trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    opened_by_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    opened_by_role VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    reason_code VARCHAR(64) NOT NULL,
    description TEXT,
    requested_action VARCHAR(32),
    resolution_type VARCHAR(32),
    resolution_amount_to_hauler NUMERIC(12,2),
    resolution_amount_to_shipper NUMERIC(12,2),
    resolved_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_disputes_payment_id ON payment_disputes (payment_id);
CREATE INDEX idx_payment_disputes_trip_id ON payment_disputes (trip_id);
CREATE INDEX idx_payment_disputes_status ON payment_disputes (status);

CREATE TABLE dispute_messages (
    id BIGSERIAL PRIMARY KEY,
    dispute_id BIGINT NOT NULL REFERENCES payment_disputes(id) ON DELETE CASCADE,
    sender_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    sender_role VARCHAR(32) NOT NULL,
    recipient_role VARCHAR(32) NOT NULL DEFAULT 'ADMIN',
    text TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dispute_messages_dispute_id_created_at ON dispute_messages (dispute_id, created_at);

-- Legacy simple disputes (non-payment) still exist in code
CREATE TABLE disputes (
    id BIGSERIAL PRIMARY KEY,
    load_id BIGINT REFERENCES loads(id) ON DELETE SET NULL,
    trip_id BIGINT REFERENCES trips(id) ON DELETE SET NULL,
    raised_by_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    status dispute_status_enum NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUPPORT --------------------------------------------------
-- Base support_tickets table is assumed existing; extensions below:
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    sender_role TEXT,
    message TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id_created_at
    ON support_ticket_messages (ticket_id, created_at);

-- AUDIT ----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  user_role TEXT,
  action TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'generic',
  resource TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_role ON audit_logs (user_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ADMIN CHAT / MESSAGES ------------------------------------
-- (Trip, dispute, support messages already defined above)