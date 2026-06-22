export const DATABASE_NAME = 'treadmill.db';

export const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_preset INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY NOT NULL,
    program_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    label TEXT,
    duration_seconds INTEGER NOT NULL,
    speed_kmh REAL NOT NULL,
    incline_percent REAL NOT NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_segments_program ON segments(program_id);

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    program_id TEXT NOT NULL,
    program_name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    total_duration_seconds INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    calories INTEGER NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    session_log_json TEXT NOT NULL DEFAULT '[]'
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
`;
