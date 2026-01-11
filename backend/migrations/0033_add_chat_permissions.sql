ALTER TABLE load_offers
ADD COLUMN IF NOT EXISTS chat_enabled_by_hauler BOOLEAN DEFAULT FALSE;

ALTER TABLE truck_availability_chats
ADD COLUMN IF NOT EXISTS chat_enabled_by_shipper BOOLEAN DEFAULT FALSE;
