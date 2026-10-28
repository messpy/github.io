CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  planet TEXT NOT NULL,
  color TEXT NOT NULL,
  personality TEXT NOT NULL,
  talent TEXT NOT NULL,
  texture TEXT NOT NULL,
  hobby TEXT NOT NULL,
  favorite TEXT NOT NULL,
  size INTEGER NOT NULL,
  rings INTEGER NOT NULL DEFAULT 0,
  seed INTEGER NOT NULL,
  born TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visitors_updated_at ON visitors(updated_at);
