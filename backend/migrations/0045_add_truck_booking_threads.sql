-- Truck board booking threads and messages integration

-- Truck booking threads table
CREATE TABLE IF NOT EXISTS truck_booking_threads (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL REFERENCES load_bookings(id) ON DELETE CASCADE,
    truck_availability_id BIGINT NOT NULL REFERENCES truck_availability(id) ON DELETE CASCADE,
    load_id             BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    shipper_user_id     BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    hauler_user_id      BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    is_active           BOOLEAN DEFAULT TRUE,
    first_message_sent  BOOLEAN DEFAULT FALSE, -- Only shipper can send first message
    shipper_last_read_at TIMESTAMPTZ, -- Last time shipper viewed this thread
    hauler_last_read_at TIMESTAMPTZ, -- Last time hauler viewed this thread
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_truck_booking_threads_booking_id ON truck_booking_threads (booking_id);
CREATE INDEX IF NOT EXISTS idx_truck_booking_threads_truck_availability_id ON truck_booking_threads (truck_availability_id);
CREATE INDEX IF NOT EXISTS idx_truck_booking_threads_load_id ON truck_booking_threads (load_id);
CREATE INDEX IF NOT EXISTS idx_truck_booking_threads_shipper ON truck_booking_threads (shipper_user_id);
CREATE INDEX IF NOT EXISTS idx_truck_booking_threads_hauler ON truck_booking_threads (hauler_user_id);
CREATE INDEX IF NOT EXISTS idx_truck_booking_threads_updated_at ON truck_booking_threads (updated_at DESC);

-- Create truck_booking_messages table
CREATE TABLE IF NOT EXISTS truck_booking_messages (
    id                  BIGSERIAL PRIMARY KEY,
    thread_id           BIGINT NOT NULL REFERENCES truck_booking_threads(id) ON DELETE CASCADE,
    booking_id          BIGINT NOT NULL REFERENCES load_bookings(id) ON DELETE CASCADE,
    sender_user_id      BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    sender_role         TEXT NOT NULL,
    text                TEXT,
    attachments         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truck_booking_messages_thread_id ON truck_booking_messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_truck_booking_messages_booking_id ON truck_booking_messages (booking_id);

-- Function to create thread when booking is created
CREATE OR REPLACE FUNCTION create_truck_booking_thread()
RETURNS TRIGGER AS $$
DECLARE
    shipper_user_id_val BIGINT;
    hauler_user_id_val BIGINT;
    load_id_val BIGINT;
    shipper_id_val BIGINT;
    hauler_id_val BIGINT;
    truck_availability_id_val BIGINT;
BEGIN
    -- Only create thread for bookings with truck_availability_id (truck board bookings)
    IF NEW.truck_availability_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get the shipper ID and load ID from the load
    SELECT 
        l.shipper_id,
        l.id
    INTO 
        shipper_id_val,
        load_id_val
    FROM loads l
    WHERE l.id = NEW.load_id;
    
    -- Get truck availability to get hauler_id
    SELECT hauler_id INTO hauler_id_val
    FROM truck_availability
    WHERE id = NEW.truck_availability_id;
    
    -- Get shipper's user_id
    SELECT user_id INTO shipper_user_id_val
    FROM shippers
    WHERE id = shipper_id_val;
    
    -- Get hauler's user_id
    SELECT user_id INTO hauler_user_id_val
    FROM haulers
    WHERE id = hauler_id_val;
    
    -- Create thread
    INSERT INTO truck_booking_threads (
        booking_id,
        truck_availability_id,
        load_id,
        shipper_user_id,
        hauler_user_id,
        is_active,
        first_message_sent
    ) VALUES (
        NEW.id,
        NEW.truck_availability_id,
        load_id_val,
        shipper_user_id_val,
        hauler_user_id_val,
        TRUE,
        FALSE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_create_truck_booking_thread ON load_bookings;

CREATE TRIGGER trigger_create_truck_booking_thread
    AFTER INSERT ON load_bookings
    FOR EACH ROW
    WHEN (NEW.truck_availability_id IS NOT NULL)
    EXECUTE FUNCTION create_truck_booking_thread();

-- Function to update thread updated_at when message is sent
CREATE OR REPLACE FUNCTION update_truck_booking_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread's updated_at and first_message_sent flag
    IF NEW.thread_id IS NOT NULL THEN
        UPDATE truck_booking_threads
        SET 
            updated_at = NOW(),
            first_message_sent = TRUE
        WHERE id = NEW.thread_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_update_truck_booking_thread_on_message ON truck_booking_messages;

CREATE TRIGGER trigger_update_truck_booking_thread_on_message
    AFTER INSERT ON truck_booking_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_truck_booking_thread_on_message();
