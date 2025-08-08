-- Rebuild tool_executions to unified, non-FK schema
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

-- Create new table if not exists
CREATE TABLE IF NOT EXISTS tool_executions (
  id TEXT PRIMARY KEY NOT NULL,
  tool_name TEXT NOT NULL,
  tool_uuid TEXT,
  user_uuid TEXT,
  parameters TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','completed','failed')),
  result TEXT,
  error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
PRAGMA foreign_keys=on;

