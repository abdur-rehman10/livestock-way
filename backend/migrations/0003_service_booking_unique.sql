-- Prevent multiple active bookings for the same hauler and service.
-- Allows re-request if previous booking was rejected/cancelled.

CREATE UNIQUE INDEX IF NOT EXISTS ux_service_bookings_service_hauler_active
ON service_bookings (service_id, hauler_id)
WHERE status IN ('pending', 'accepted', 'completed');
