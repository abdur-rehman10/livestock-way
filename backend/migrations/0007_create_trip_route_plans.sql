CREATE TABLE trip_route_plans (
    id                  BIGSERIAL PRIMARY KEY,
    trip_id             BIGINT NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
    plan_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    tolls_amount        NUMERIC(12,2),
    tolls_currency      CHAR(3) DEFAULT 'USD',
    compliance_status   TEXT,
    compliance_notes    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_route_plans_trip_id ON trip_route_plans (trip_id);
