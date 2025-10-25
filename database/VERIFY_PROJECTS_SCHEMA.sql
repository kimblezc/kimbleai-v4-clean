-- ================================================================
-- VERIFICATION SCRIPT: Check projects table schema
-- ================================================================
-- Run this in Supabase SQL Editor to see what columns actually exist
-- ================================================================

-- 1. List ALL columns in projects table with their types
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- name (text)
-- description (text)
-- status (text)
-- priority (text)
-- owner_id (text)
-- collaborators (text[])
-- parent_project_id (uuid)
-- tags (text[])
-- metadata (jsonb)
-- stats (jsonb)
-- created_at (timestamptz)
-- updated_at (timestamptz)
-- user_id (text) - legacy column

-- 2. Check for any constraints
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE
    WHEN con.contype = 'c' THEN pg_get_constraintdef(con.oid)
    ELSE ''
  END AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'projects';

-- 3. Check for indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'projects';

-- 4. Test insert (will show exact error if schema is wrong)
DO $$
BEGIN
  -- Try to insert a test project
  INSERT INTO projects (
    id,
    name,
    description,
    status,
    priority,
    owner_id,
    collaborators,
    parent_project_id,
    tags,
    metadata,
    stats
  ) VALUES (
    gen_random_uuid(),
    'TEST_PROJECT_DELETE_ME',
    'Schema verification test',
    'active',
    'medium',
    'zach',
    ARRAY['zach'],
    NULL,
    ARRAY['test']::text[],
    '{"created_at": "2025-10-25T00:00:00.000Z", "updated_at": "2025-10-25T00:00:00.000Z"}'::jsonb,
    '{"total_conversations": 0, "total_messages": 0, "active_tasks": 0, "completed_tasks": 0, "last_activity": "2025-10-25T00:00:00.000Z"}'::jsonb
  );

  -- If successful, delete the test project
  DELETE FROM projects WHERE name = 'TEST_PROJECT_DELETE_ME';

  RAISE NOTICE 'SUCCESS: All columns exist and test insert worked!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
  ROLLBACK;
END $$;
