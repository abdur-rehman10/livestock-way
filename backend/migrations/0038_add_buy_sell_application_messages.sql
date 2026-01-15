-- Buy and Sell application messages and threads

-- Buy and Sell application threads table
CREATE TABLE IF NOT EXISTS buy_sell_application_threads (
    id                  BIGSERIAL PRIMARY KEY,
    listing_id         BIGINT NOT NULL REFERENCES buy_and_sell_listings(id) ON DELETE CASCADE,
    application_id     BIGINT NOT NULL REFERENCES buy_and_sell_applications(id) ON DELETE CASCADE,
    listing_poster_user_id  BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    applicant_user_id  BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    is_active          BOOLEAN DEFAULT TRUE,
    first_message_sent BOOLEAN DEFAULT FALSE, -- Only listing poster can send first message
    listing_poster_last_read_at TIMESTAMPTZ, -- Last time listing poster viewed this thread
    applicant_last_read_at TIMESTAMPTZ, -- Last time applicant viewed this thread
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(listing_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_buy_sell_threads_listing_id ON buy_sell_application_threads (listing_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_threads_application_id ON buy_sell_application_threads (application_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_threads_poster ON buy_sell_application_threads (listing_poster_user_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_threads_applicant ON buy_sell_application_threads (applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_buy_sell_threads_updated_at ON buy_sell_application_threads (updated_at DESC);

-- Buy and Sell application messages table
CREATE TABLE IF NOT EXISTS buy_sell_application_messages (
    id                  BIGSERIAL PRIMARY KEY,
    thread_id           BIGINT NOT NULL REFERENCES buy_sell_application_threads(id) ON DELETE CASCADE,
    sender_user_id      BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    sender_role         TEXT NOT NULL,
    message             TEXT NOT NULL,
    attachments         JSONB DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buy_sell_messages_thread_id ON buy_sell_application_messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_buy_sell_messages_sender ON buy_sell_application_messages (sender_user_id);

-- Function to create thread when application is created
CREATE OR REPLACE FUNCTION create_buy_sell_application_thread()
RETURNS TRIGGER AS $$
DECLARE
    listing_poster_id BIGINT;
BEGIN
    -- Get the listing poster user ID
    SELECT posted_by_user_id INTO listing_poster_id
    FROM buy_and_sell_listings
    WHERE id = NEW.listing_id;
    
    -- Create thread
    INSERT INTO buy_sell_application_threads (
        listing_id,
        application_id,
        listing_poster_user_id,
        applicant_user_id,
        is_active,
        first_message_sent
    ) VALUES (
        NEW.listing_id,
        NEW.id,
        listing_poster_id,
        NEW.applicant_user_id,
        TRUE,
        FALSE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_buy_sell_application_thread
    AFTER INSERT ON buy_and_sell_applications
    FOR EACH ROW
    EXECUTE FUNCTION create_buy_sell_application_thread();

-- Function to update thread updated_at when message is sent
CREATE OR REPLACE FUNCTION update_buy_sell_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread's updated_at and first_message_sent flag
    UPDATE buy_sell_application_threads
    SET 
        updated_at = NOW(),
        first_message_sent = TRUE
    WHERE id = NEW.thread_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_buy_sell_thread_on_message
    AFTER INSERT ON buy_sell_application_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_buy_sell_thread_on_message();
