-- Contracts between shipper and hauler tied to offers/bookings.

CREATE TABLE IF NOT EXISTS contracts (
  id BIGSERIAL PRIMARY KEY,
  load_id BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  offer_id BIGINT REFERENCES load_offers(id) ON DELETE SET NULL,
  booking_id BIGINT REFERENCES load_bookings(id) ON DELETE SET NULL,
  shipper_id BIGINT NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
  hauler_id BIGINT NOT NULL REFERENCES haulers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  price_amount NUMERIC(12,2),
  price_type TEXT,
  payment_method TEXT,
  payment_schedule TEXT,
  contract_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_by_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  updated_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_shipper_id ON contracts(shipper_id);
CREATE INDEX IF NOT EXISTS idx_contracts_hauler_id ON contracts(hauler_id);
CREATE INDEX IF NOT EXISTS idx_contracts_load_id ON contracts(load_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

CREATE UNIQUE INDEX IF NOT EXISTS ux_contracts_offer_id
  ON contracts(offer_id)
  WHERE offer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contracts_booking_id
  ON contracts(booking_id)
  WHERE booking_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contracts_status_check'
      AND conrelid = 'contracts'::regclass
  ) THEN
    ALTER TABLE contracts
      ADD CONSTRAINT contracts_status_check
      CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'LOCKED'));
  END IF;
END$$;
