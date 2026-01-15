-- Loadboard offer threads and messages integration

-- Loadboard offer threads table
CREATE TABLE IF NOT EXISTS load_offer_threads (
    id                  BIGSERIAL PRIMARY KEY,
    offer_id            BIGINT NOT NULL REFERENCES load_offers(id) ON DELETE CASCADE,
    load_id             BIGINT NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    shipper_user_id     BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    hauler_user_id      BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    is_active           BOOLEAN DEFAULT TRUE,
    first_message_sent  BOOLEAN DEFAULT FALSE, -- Only shipper can send first message
    shipper_last_read_at TIMESTAMPTZ, -- Last time shipper viewed this thread
    hauler_last_read_at TIMESTAMPTZ, -- Last time hauler viewed this thread
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(offer_id)
);

CREATE INDEX IF NOT EXISTS idx_load_offer_threads_offer_id ON load_offer_threads (offer_id);
CREATE INDEX IF NOT EXISTS idx_load_offer_threads_load_id ON load_offer_threads (load_id);
CREATE INDEX IF NOT EXISTS idx_load_offer_threads_shipper ON load_offer_threads (shipper_user_id);
CREATE INDEX IF NOT EXISTS idx_load_offer_threads_hauler ON load_offer_threads (hauler_user_id);
CREATE INDEX IF NOT EXISTS idx_load_offer_threads_updated_at ON load_offer_threads (updated_at DESC);

-- Update load_offer_messages to reference thread_id instead of just offer_id
-- First, add thread_id column (nullable initially)
ALTER TABLE load_offer_messages 
  ADD COLUMN IF NOT EXISTS thread_id BIGINT REFERENCES load_offer_threads(id) ON DELETE CASCADE;

-- Create index for thread_id
CREATE INDEX IF NOT EXISTS idx_load_offer_messages_thread_id ON load_offer_messages (thread_id, created_at);

-- Function to create thread when offer is created
CREATE OR REPLACE FUNCTION create_load_offer_thread()
RETURNS TRIGGER AS $$
DECLARE
    shipper_user_id_val BIGINT;
    hauler_user_id_val BIGINT;
    load_id_val BIGINT;
    shipper_id_val BIGINT;
BEGIN
    -- Get the shipper ID and load ID from the load
    SELECT 
        l.shipper_id,
        l.id
    INTO 
        shipper_id_val,
        load_id_val
    FROM loads l
    WHERE l.id = NEW.load_id;
    
    -- Get shipper's user_id
    SELECT user_id INTO shipper_user_id_val
    FROM shippers
    WHERE id = shipper_id_val;
    
    -- Get hauler's user_id
    SELECT user_id INTO hauler_user_id_val
    FROM haulers
    WHERE id = NEW.hauler_id;
    
    -- Create thread
    INSERT INTO load_offer_threads (
        offer_id,
        load_id,
        shipper_user_id,
        hauler_user_id,
        is_active,
        first_message_sent
    ) VALUES (
        NEW.id,
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
DROP TRIGGER IF EXISTS trigger_create_load_offer_thread ON load_offers;

CREATE TRIGGER trigger_create_load_offer_thread
    AFTER INSERT ON load_offers
    FOR EACH ROW
    EXECUTE FUNCTION create_load_offer_thread();

-- Function to update thread updated_at when message is sent
CREATE OR REPLACE FUNCTION update_load_offer_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread's updated_at and first_message_sent flag
    IF NEW.thread_id IS NOT NULL THEN
        UPDATE load_offer_threads
        SET 
            updated_at = NOW(),
            first_message_sent = TRUE
        WHERE id = NEW.thread_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_update_load_offer_thread_on_message ON load_offer_messages;

CREATE TRIGGER trigger_update_load_offer_thread_on_message
    AFTER INSERT ON load_offer_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_load_offer_thread_on_message();

-- Migrate existing messages to threads (optional - for existing data)
-- This will link existing messages to their threads
DO $$
DECLARE
    msg_record RECORD;
    thread_record RECORD;
    offer_load_id_val BIGINT;
    offer_hauler_id_val BIGINT;
    shipper_user_id_val BIGINT;
    hauler_user_id_val BIGINT;
    shipper_id_val BIGINT;
BEGIN
    -- For each message without a thread_id, find or create thread
    FOR msg_record IN 
        SELECT DISTINCT offer_id 
        FROM load_offer_messages 
        WHERE thread_id IS NULL
    LOOP
        -- Check if thread exists
        SELECT * INTO thread_record
        FROM load_offer_threads
        WHERE offer_id = msg_record.offer_id;
        
        -- If thread doesn't exist, create it
        IF NOT FOUND THEN
            -- Get offer details
            SELECT load_id, hauler_id INTO offer_load_id_val, offer_hauler_id_val
            FROM load_offers
            WHERE id = msg_record.offer_id;
            
            -- Get shipper ID from load
            SELECT shipper_id INTO shipper_id_val
            FROM loads
            WHERE id = offer_load_id_val;
            
            -- Get user IDs
            SELECT user_id INTO shipper_user_id_val
            FROM shippers
            WHERE id = shipper_id_val;
            
            SELECT user_id INTO hauler_user_id_val
            FROM haulers
            WHERE id = offer_hauler_id_val;
            
            -- Create thread
            INSERT INTO load_offer_threads (
                offer_id,
                load_id,
                shipper_user_id,
                hauler_user_id,
                is_active,
                first_message_sent
            ) VALUES (
                msg_record.offer_id,
                offer_load_id_val,
                shipper_user_id_val,
                hauler_user_id_val,
                TRUE,
                TRUE -- Assume messages already sent
            );
        END IF;
        
        -- Update messages to link to thread
        UPDATE load_offer_messages
        SET thread_id = (
            SELECT id FROM load_offer_threads WHERE offer_id = msg_record.offer_id
        )
        WHERE offer_id = msg_record.offer_id AND thread_id IS NULL;
    END LOOP;
END $$;
