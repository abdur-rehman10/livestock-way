-- Cleanup duplicate active service bookings so we can enforce uniqueness.
-- Keeps the most recent booking per (service_id, hauler_id) and cancels older duplicates.

WITH ranked AS (
  SELECT
    id,
    service_id,
    hauler_id,
    ROW_NUMBER() OVER (
      PARTITION BY service_id, hauler_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM service_bookings
  WHERE status IN ('pending', 'accepted', 'completed')
)
UPDATE service_bookings sb
SET status = 'cancelled',
    updated_at = NOW()
FROM ranked r
WHERE sb.id = r.id
  AND r.rn > 1;

-- Now enforce uniqueness for active bookings.
CREATE UNIQUE INDEX IF NOT EXISTS ux_service_bookings_service_hauler_active
ON service_bookings (service_id, hauler_id)
WHERE status IN ('pending', 'accepted', 'completed');

