-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  sms_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  new_load_posted BOOLEAN NOT NULL DEFAULT TRUE,
  new_truck_posted BOOLEAN NOT NULL DEFAULT TRUE,
  offer_received BOOLEAN NOT NULL DEFAULT TRUE,
  new_message BOOLEAN NOT NULL DEFAULT TRUE,
  contract_updates BOOLEAN NOT NULL DEFAULT TRUE,
  trip_updates BOOLEAN NOT NULL DEFAULT TRUE,
  payment_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
