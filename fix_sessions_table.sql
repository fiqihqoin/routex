-- Fix the sessions table user_id column type issue
-- The issue: user_id is bigint but PtmsUser model uses UUIDs

-- First, clear existing sessions to avoid data type conflicts
TRUNCATE TABLE sessions;

-- Drop the existing index
DROP INDEX IF EXISTS sessions_user_id_index;

-- Alter the column type from bigint to uuid
-- Using varchar instead of uuid type for better compatibility
ALTER TABLE sessions
ALTER COLUMN user_id TYPE VARCHAR(36) USING user_id::text;

-- Recreate the index
CREATE INDEX sessions_user_id_index ON sessions (user_id);

-- Verify the change
\d sessions