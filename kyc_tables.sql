CREATE TABLE IF NOT EXISTS kyc_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_kyc_requests_user_id ON kyc_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests (status);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id BIGSERIAL PRIMARY KEY,
  kyc_request_id BIGINT NOT NULL REFERENCES kyc_requests(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_request_id ON kyc_documents (kyc_request_id);
