-- Drop Autonomous Agent Schema (Clean Slate)
-- Run this FIRST if you get schema errors

-- Drop triggers first (depend on tables)
DROP TRIGGER IF EXISTS agent_tasks_updated_at ON agent_tasks;
DROP TRIGGER IF EXISTS agent_findings_updated_at ON agent_findings;
DROP TRIGGER IF EXISTS agent_state_updated_at ON agent_state;

-- Drop function
DROP FUNCTION IF EXISTS update_agent_updated_at();

-- Drop indexes (will be dropped with tables anyway, but being explicit)
DROP INDEX IF EXISTS idx_agent_tasks_status;
DROP INDEX IF EXISTS idx_agent_tasks_scheduled;
DROP INDEX IF EXISTS idx_agent_tasks_priority;
DROP INDEX IF EXISTS idx_agent_tasks_type;
DROP INDEX IF EXISTS idx_agent_findings_status;
DROP INDEX IF EXISTS idx_agent_findings_severity;
DROP INDEX IF EXISTS idx_agent_findings_type;
DROP INDEX IF EXISTS idx_agent_findings_detected;
DROP INDEX IF EXISTS idx_agent_logs_timestamp;
DROP INDEX IF EXISTS idx_agent_logs_level;
DROP INDEX IF EXISTS idx_agent_logs_task;
DROP INDEX IF EXISTS idx_agent_reports_generated;
DROP INDEX IF EXISTS idx_agent_reports_type;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS agent_logs CASCADE;
DROP TABLE IF EXISTS agent_reports CASCADE;
DROP TABLE IF EXISTS agent_findings CASCADE;
DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS agent_state CASCADE;
