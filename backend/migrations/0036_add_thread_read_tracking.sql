-- Add read tracking columns to job_application_threads

ALTER TABLE job_application_threads
ADD COLUMN IF NOT EXISTS job_poster_last_read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS applicant_last_read_at TIMESTAMPTZ;
