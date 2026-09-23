ALTER TABLE servers ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE servers ADD COLUMN last_check_token TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS notification_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  check_token TEXT NOT NULL UNIQUE,
  event TEXT NOT NULL CHECK (event IN ('down', 'recovered')),
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_due
  ON notification_outbox(sent_at, next_attempt_at, id);
