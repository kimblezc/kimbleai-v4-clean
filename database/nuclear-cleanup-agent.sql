-- Nuclear Cleanup for Autonomous Agent Schema
-- Drops EVERYTHING related to agent tables (views, triggers, functions, tables)

-- Step 1: Drop all views that might reference agent tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE 'agent%')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END $$;

-- Step 2: Drop all materialized views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT matviewname FROM pg_matviews WHERE schemaname = 'public' AND matviewname LIKE 'agent%')
    LOOP
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS ' || quote_ident(r.matviewname) || ' CASCADE';
    END LOOP;
END $$;

-- Step 3: Drop all triggers explicitly
DROP TRIGGER IF EXISTS agent_tasks_updated_at ON agent_tasks CASCADE;
DROP TRIGGER IF EXISTS agent_findings_updated_at ON agent_findings CASCADE;
DROP TRIGGER IF EXISTS agent_state_updated_at ON agent_state CASCADE;

-- Step 4: Drop all functions that might reference agent tables
DROP FUNCTION IF EXISTS update_agent_updated_at() CASCADE;

-- Step 5: Drop all indexes explicitly (in case they're orphaned)
DROP INDEX IF EXISTS idx_agent_tasks_status CASCADE;
DROP INDEX IF EXISTS idx_agent_tasks_scheduled CASCADE;
DROP INDEX IF EXISTS idx_agent_tasks_priority CASCADE;
DROP INDEX IF EXISTS idx_agent_tasks_type CASCADE;
DROP INDEX IF EXISTS idx_agent_findings_status CASCADE;
DROP INDEX IF EXISTS idx_agent_findings_severity CASCADE;
DROP INDEX IF EXISTS idx_agent_findings_type CASCADE;
DROP INDEX IF EXISTS idx_agent_findings_detected CASCADE;
DROP INDEX IF EXISTS idx_agent_logs_timestamp CASCADE;
DROP INDEX IF EXISTS idx_agent_logs_level CASCADE;
DROP INDEX IF EXISTS idx_agent_logs_task CASCADE;
DROP INDEX IF EXISTS idx_agent_reports_generated CASCADE;
DROP INDEX IF EXISTS idx_agent_reports_type CASCADE;

-- Step 6: Drop all tables (CASCADE will drop any remaining dependent objects)
DROP TABLE IF EXISTS agent_logs CASCADE;
DROP TABLE IF EXISTS agent_reports CASCADE;
DROP TABLE IF EXISTS agent_findings CASCADE;
DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS agent_state CASCADE;

-- Verification: List any remaining agent-related objects
SELECT 'TABLES:' as object_type, tablename as name FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'agent%'
UNION ALL
SELECT 'VIEWS:', viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'agent%'
UNION ALL
SELECT 'INDEXES:', indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%agent%'
UNION ALL
SELECT 'FUNCTIONS:', routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%agent%';
