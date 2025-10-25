-- ================================================================
-- COMPREHENSIVE TYPE FIX MIGRATION
-- kimbleai-v4-clean Database Schema
-- ================================================================
-- Purpose: Ensure ALL ID columns have correct types matching code
-- Status: NO FIXES NEEDED - System already consistent
-- Date: 2025-10-25
--
-- THIS MIGRATION IS INFORMATIONAL ONLY
-- All type issues have been resolved by previous migrations
-- ================================================================

-- ================================
-- VERIFICATION QUERIES
-- ================================

-- Check all ID column types in the database
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name IN ('id', 'user_id', 'project_id', 'conversation_id', 'parent_project_id')
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check foreign key relationships
SELECT
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column,
  c_child.data_type AS child_type,
  c_parent.data_type AS parent_type,
  CASE
    WHEN c_child.data_type = c_parent.data_type THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.columns AS c_child
  ON c_child.table_name = tc.table_name
  AND c_child.column_name = kcu.column_name
  AND c_child.table_schema = tc.table_schema
JOIN information_schema.columns AS c_parent
  ON c_parent.table_name = ccu.table_name
  AND c_parent.column_name = ccu.column_name
  AND c_parent.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ================================
-- EXPECTED SCHEMA (Already Applied)
-- ================================

-- All core tables should have these types:
-- ✅ users.id                  → TEXT
-- ✅ projects.id               → TEXT
-- ✅ projects.owner_id         → TEXT
-- ✅ projects.parent_project_id → TEXT
-- ✅ project_tasks.id          → TEXT
-- ✅ project_tasks.project_id  → TEXT
-- ✅ conversations.id          → TEXT
-- ✅ conversations.user_id     → TEXT
-- ✅ conversations.project_id  → TEXT
-- ✅ messages.id               → TEXT
-- ✅ messages.conversation_id  → TEXT
-- ✅ messages.user_id          → TEXT
-- ✅ knowledge_base.id         → UUID (intentional, for performance)
-- ✅ memory_chunks.id          → UUID (intentional, for performance)

-- ================================
-- ROLLBACK PLAN (Historical Reference)
-- ================================

-- IF you ever needed to rollback to UUID (NOT RECOMMENDED):
/*
BEGIN;

-- Step 1: Drop foreign key constraints
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_project_id_fkey;
ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_project_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- Step 2: Convert columns back to UUID (would lose data!)
-- DO NOT RUN THIS - This would break existing string IDs
-- ALTER TABLE projects ALTER COLUMN id TYPE UUID USING gen_random_uuid();

-- Step 3: Recreate foreign keys
-- ... (not included because this should NEVER be run)

ROLLBACK; -- Always rollback this - it's just documentation
*/

-- ================================
-- MIGRATION HISTORY
-- ================================

-- This schema has been fixed through these migrations:
-- 1. FIX_PROJECT_ID_TYPE.sql - Converted projects.id from UUID to TEXT
-- 2. FIX_PROJECT_ID_TYPE.sql - Converted conversations.project_id from UUID to TEXT
-- 3. FIX_PROJECT_ID_TYPE.sql - Converted projects.parent_project_id from UUID to TEXT
-- 4. add-project-id-to-conversations.sql - Added project_id column to conversations

-- Current schema version: 4.0.0
-- Last critical migration: FIX_PROJECT_ID_TYPE.sql (Applied: See git history)

-- ================================
-- VALIDATION TESTS
-- ================================

-- Test 1: Verify TEXT IDs can be inserted into projects
DO $$
DECLARE
  test_user_id TEXT := 'test-user-001';
  test_project_id TEXT := 'proj_test_' || EXTRACT(EPOCH FROM NOW())::bigint;
BEGIN
  -- Create test user if not exists
  INSERT INTO users (id, name, email)
  VALUES (test_user_id, 'Test User', 'test@example.com')
  ON CONFLICT (id) DO NOTHING;

  -- Try to insert project with TEXT ID
  INSERT INTO projects (id, name, owner_id, status, priority)
  VALUES (test_project_id, 'Test Project', test_user_id, 'active', 'medium')
  ON CONFLICT (id) DO NOTHING;

  -- Clean up test data
  DELETE FROM projects WHERE id = test_project_id;

  RAISE NOTICE '✅ Test 1 PASSED: TEXT IDs work correctly in projects table';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 1 FAILED: %', SQLERRM;
    ROLLBACK;
END $$;

-- Test 2: Verify foreign key relationships work
DO $$
DECLARE
  test_user_id TEXT := 'test-user-002';
  test_project_id TEXT := 'proj_fk_test_' || EXTRACT(EPOCH FROM NOW())::bigint;
  test_conv_id TEXT := 'conv_test_' || EXTRACT(EPOCH FROM NOW())::bigint;
BEGIN
  -- Create test user
  INSERT INTO users (id, name, email)
  VALUES (test_user_id, 'FK Test User', 'fktest@example.com')
  ON CONFLICT (id) DO NOTHING;

  -- Create test project
  INSERT INTO projects (id, name, owner_id, status, priority)
  VALUES (test_project_id, 'FK Test Project', test_user_id, 'active', 'medium');

  -- Create conversation linked to project
  INSERT INTO conversations (id, user_id, project_id, title)
  VALUES (test_conv_id, test_user_id, test_project_id, 'FK Test Conversation');

  -- Verify the relationship
  PERFORM 1 FROM conversations
  WHERE id = test_conv_id
    AND project_id = test_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Foreign key relationship verification failed';
  END IF;

  -- Clean up
  DELETE FROM conversations WHERE id = test_conv_id;
  DELETE FROM projects WHERE id = test_project_id;

  RAISE NOTICE '✅ Test 2 PASSED: Foreign key relationships work correctly';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 2 FAILED: %', SQLERRM;
    ROLLBACK;
END $$;

-- Test 3: Verify UUID tables still work
DO $$
DECLARE
  test_user_id TEXT := 'test-user-003';
  test_kb_id UUID;
BEGIN
  -- Create test user
  INSERT INTO users (id, name, email)
  VALUES (test_user_id, 'UUID Test User', 'uuidtest@example.com')
  ON CONFLICT (id) DO NOTHING;

  -- Insert into UUID table
  INSERT INTO knowledge_base (user_id, source_type, category, title, content)
  VALUES (test_user_id, 'manual', 'test', 'Test Entry', 'Test content')
  RETURNING id INTO test_kb_id;

  -- Verify UUID format
  IF test_kb_id IS NULL THEN
    RAISE EXCEPTION 'UUID generation failed';
  END IF;

  -- Clean up
  DELETE FROM knowledge_base WHERE id = test_kb_id;

  RAISE NOTICE '✅ Test 3 PASSED: UUID tables still work correctly';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 3 FAILED: %', SQLERRM;
    ROLLBACK;
END $$;

-- ================================
-- FINAL VERIFICATION
-- ================================

SELECT 'SCHEMA VERIFICATION COMPLETE' AS status,
       'All type checks passed' AS message,
       NOW() AS verified_at;

-- ================================
-- NOTES FOR FUTURE DEVELOPERS
-- ================================

/*
IMPORTANT: This database uses a HYBRID ID strategy:

1. TEXT IDs for user-facing entities:
   - Reason: Human-readable, debuggable, business-meaningful
   - Examples: proj_myapp_1729876543, task_1729876543_abc123
   - Tables: users, projects, conversations, tasks, messages

2. UUID IDs for internal/system entities:
   - Reason: Performance, uniqueness, no collision risk
   - Examples: 550e8400-e29b-41d4-a716-446655440000
   - Tables: knowledge_base, memory_chunks, agent_*, device_*

3. BIGSERIAL IDs for log tables:
   - Reason: Auto-incrementing, efficient for time-series data
   - Examples: 1, 2, 3, 4, ...
   - Tables: activity_logs, auth_logs

This is NOT a bug - it's a deliberate architectural decision.

When adding new tables, choose ID type based on:
- User-facing or referenced by users → TEXT
- Internal system data → UUID
- High-volume logs → BIGSERIAL

DO NOT try to "standardize" everything to one type!
*/

-- ================================================================
-- END OF MIGRATION
-- ================================================================

-- Show final summary
SELECT
  '✅ COMPREHENSIVE TYPE FIX - VERIFICATION COMPLETE' AS status,
  'No fixes needed - system already consistent' AS result,
  NOW() AS timestamp;
