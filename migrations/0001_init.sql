CREATE TABLE IF NOT EXISTS servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  ports TEXT NOT NULL DEFAULT '22,80,443',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'up', 'down')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  last_checked_at INTEGER NOT NULL DEFAULT 0,
  last_changed_at INTEGER NOT NULL DEFAULT 0,
  last_results TEXT NOT NULL DEFAULT '[]',
  last_error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_host_ports
  ON servers(host, ports);
CREATE INDEX IF NOT EXISTS idx_servers_due
  ON servers(enabled, last_checked_at, id);

CREATE TABLE IF NOT EXISTS pending_actions (
  admin_id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  server_id INTEGER,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_updates (
  update_id INTEGER PRIMARY KEY,
  processed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_updates_time
  ON processed_updates(processed_at);

CREATE TABLE IF NOT EXISTS status_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('down', 'recovered')),
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_status_events_time
  ON status_events(created_at DESC);
