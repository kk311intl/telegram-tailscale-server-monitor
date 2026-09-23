ALTER TABLE processed_updates ADD COLUMN status TEXT NOT NULL DEFAULT 'done'
  CHECK (status IN ('processing', 'done', 'failed'));
ALTER TABLE processed_updates ADD COLUMN lease_token TEXT NOT NULL DEFAULT '';
ALTER TABLE processed_updates ADD COLUMN lease_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processed_updates ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processed_updates ADD COLUMN last_error TEXT NOT NULL DEFAULT '';

ALTER TABLE notification_outbox ADD COLUMN failed_at INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_processed_updates_claim
  ON processed_updates(status, lease_until, update_id);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_delivery
  ON notification_outbox(sent_at, failed_at, next_attempt_at, lease_until, id);
