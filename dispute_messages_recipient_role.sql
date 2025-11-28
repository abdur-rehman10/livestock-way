ALTER TABLE dispute_messages
    ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(32);

UPDATE dispute_messages
SET recipient_role = CASE
    WHEN UPPER(sender_role) LIKE 'SUPER_ADMIN%' THEN 'ALL'
    ELSE 'ADMIN'
END
WHERE recipient_role IS NULL;

ALTER TABLE dispute_messages
    ALTER COLUMN recipient_role SET DEFAULT 'ADMIN';

ALTER TABLE dispute_messages
    ALTER COLUMN recipient_role SET NOT NULL;
