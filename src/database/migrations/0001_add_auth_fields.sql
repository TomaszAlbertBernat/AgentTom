-- Add password field to users table
ALTER TABLE users ADD COLUMN password text NOT NULL DEFAULT '';

-- Update users schema to work with auth system
CREATE TABLE IF NOT EXISTS auth_users (
  id text PRIMARY KEY NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  name text NOT NULL,
  created_at integer NOT NULL DEFAULT (unixepoch()),
  updated_at integer NOT NULL DEFAULT (unixepoch())
); 