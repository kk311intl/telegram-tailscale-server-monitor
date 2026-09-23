ALTER TABLE notification_outbox ADD COLUMN lease_token TEXT NOT NULL DEFAULT '';
ALTER TABLE notification_outbox ADD COLUMN lease_until INTEGER NOT NULL DEFAULT 0;
