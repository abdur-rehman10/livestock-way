BEGIN;

CREATE TYPE truck_chat_status AS ENUM ('OPEN', 'CONVERTED', 'CLOSED');

CREATE TABLE IF NOT EXISTS truck_availability_chats (
  id BIGSERIAL PRIMARY KEY,
  truck_availability_id BIGINT NOT NULL REFERENCES truck_availability(id) ON DELETE CASCADE,
  shipper_id BIGINT NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
  load_id BIGINT REFERENCES loads(id) ON DELETE SET NULL,
  status truck_chat_status NOT NULL DEFAULT 'OPEN',
  created_by_user_id BIGINT NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS truck_availability_messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES truck_availability_chats(id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  message TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truck_chats_availability ON truck_availability_chats(truck_availability_id);
CREATE INDEX IF NOT EXISTS idx_truck_chats_shipper ON truck_availability_chats(shipper_id);
CREATE INDEX IF NOT EXISTS idx_truck_messages_chat ON truck_availability_messages(chat_id, created_at);

COMMIT;
