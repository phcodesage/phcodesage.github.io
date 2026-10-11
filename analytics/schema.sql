-- Extend the existing portfolio database; preserve the original page-view table.
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  session_id TEXT,
  viewed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  project TEXT NOT NULL DEFAULT '',
  target TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'other',
  country TEXT NOT NULL DEFAULT 'XX',
  device TEXT NOT NULL,
  referrer TEXT NOT NULL DEFAULT 'direct',
  session_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  day TEXT NOT NULL,
  legacy_recorded INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS portfolio_events_time ON portfolio_events(created_at);
CREATE INDEX IF NOT EXISTS portfolio_events_session ON portfolio_events(day, session_key);
CREATE INDEX IF NOT EXISTS portfolio_events_project ON portfolio_events(project, kind, created_at);
