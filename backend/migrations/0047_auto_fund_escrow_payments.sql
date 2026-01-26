BEGIN;

-- Migration to auto-fund escrow payments
-- This updates existing payments and trips to reflect the new behavior where
-- payments are automatically funded when contracts/trips are created

-- Update all payments with status 'awaiting_funding' to 'escrow_funded'
-- This assumes payments should be automatically funded (as per new business logic)
UPDATE payments
SET status = 'escrow_funded'::payment_status_enum,
    updated_at = NOW()
WHERE status::text IN ('awaiting_funding', 'pending_funding');

-- Update all trips with status 'pending_escrow' to 'ready_to_start'
-- Only if they have escrow payments (which are now automatically funded)
UPDATE trips
SET status = 'ready_to_start'::trip_status_enum,
    updated_at = NOW()
WHERE status::text IN ('pending_escrow')
  AND EXISTS (
    SELECT 1
    FROM payments
    WHERE payments.trip_id = trips.id
      AND payments.is_escrow = TRUE
      AND payments.status::text IN ('escrow_funded', 'awaiting_funding', 'pending_funding')
  );

COMMIT;
