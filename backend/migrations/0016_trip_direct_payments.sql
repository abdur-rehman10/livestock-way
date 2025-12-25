-- Direct payment receipts captured at trip completion for DIRECT mode trips.
CREATE TABLE IF NOT EXISTS trip_direct_payments (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  received_amount NUMERIC(14,2) NOT NULL CHECK (received_amount > 0),
  received_payment_method TEXT NOT NULL CHECK (received_payment_method IN ('CASH', 'BANK_TRANSFER', 'OTHER')),
  received_reference TEXT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_direct_payments_trip_unique UNIQUE (trip_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_direct_payments_trip_id ON trip_direct_payments(trip_id);
