-- Verify session_logs table was created successfully

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'session_logs'
) AS table_exists;

-- 2. Show all columns and their types
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'session_logs'
ORDER BY ordinal_position;

-- 3. Show indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'session_logs';

-- 4. Show foreign key constraint
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS referenced_table,
  af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'session_logs'::regclass
  AND contype = 'f';

-- 5. Show RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'session_logs';

-- 6. Count existing records (should be 0)
SELECT COUNT(*) AS total_sessions FROM session_logs;
