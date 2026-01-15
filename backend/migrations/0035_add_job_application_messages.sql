-- Job application messages and threads

-- Job application threads table
CREATE TABLE IF NOT EXISTS job_application_threads (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    application_id      BIGINT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    job_poster_user_id  BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    applicant_user_id   BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    is_active           BOOLEAN DEFAULT TRUE,
    first_message_sent  BOOLEAN DEFAULT FALSE, -- Only job poster can send first message
    job_poster_last_read_at TIMESTAMPTZ, -- Last time job poster viewed this thread
    applicant_last_read_at TIMESTAMPTZ, -- Last time applicant viewed this thread
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_job_threads_job_id ON job_application_threads (job_id);
CREATE INDEX IF NOT EXISTS idx_job_threads_application_id ON job_application_threads (application_id);
CREATE INDEX IF NOT EXISTS idx_job_threads_poster ON job_application_threads (job_poster_user_id);
CREATE INDEX IF NOT EXISTS idx_job_threads_applicant ON job_application_threads (applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_job_threads_updated_at ON job_application_threads (updated_at DESC);

-- Job application messages table
CREATE TABLE IF NOT EXISTS job_application_messages (
    id                  BIGSERIAL PRIMARY KEY,
    thread_id           BIGINT NOT NULL REFERENCES job_application_threads(id) ON DELETE CASCADE,
    sender_user_id      BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    sender_role         TEXT NOT NULL,
    message             TEXT NOT NULL,
    attachments         JSONB DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_messages_thread_id ON job_application_messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_job_messages_sender ON job_application_messages (sender_user_id);

-- Function to create thread when application is created
CREATE OR REPLACE FUNCTION create_job_application_thread()
RETURNS TRIGGER AS $$
DECLARE
    job_poster_id BIGINT;
BEGIN
    -- Get the job poster user ID
    SELECT posted_by_user_id INTO job_poster_id
    FROM job_listings
    WHERE id = NEW.job_id;
    
    -- Create thread
    INSERT INTO job_application_threads (
        job_id,
        application_id,
        job_poster_user_id,
        applicant_user_id,
        is_active,
        first_message_sent
    ) VALUES (
        NEW.job_id,
        NEW.id,
        job_poster_id,
        NEW.applicant_user_id,
        TRUE,
        FALSE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_job_application_thread
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION create_job_application_thread();

-- Function to update thread updated_at when message is sent
CREATE OR REPLACE FUNCTION update_job_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread's updated_at and first_message_sent flag
    UPDATE job_application_threads
    SET 
        updated_at = NOW(),
        first_message_sent = TRUE
    WHERE id = NEW.thread_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_thread_on_message
    AFTER INSERT ON job_application_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_job_thread_on_message();
