-- Rename Old Agent Tables (Preserve Existing Data)
-- This preserves your existing chatbot agent tables while making room for the new autonomous agent system

-- Rename existing tables to "_legacy" suffix
ALTER TABLE IF EXISTS agent_logs RENAME TO agent_logs_legacy;
ALTER TABLE IF EXISTS agents RENAME TO agents_legacy;

-- Rename associated indexes
ALTER INDEX IF EXISTS agent_logs_pkey RENAME TO agent_logs_legacy_pkey;
ALTER INDEX IF EXISTS agents_pkey RENAME TO agents_legacy_pkey;
ALTER INDEX IF EXISTS idx_agent_logs_agent RENAME TO idx_agent_logs_legacy_agent;
ALTER INDEX IF EXISTS idx_agents_user RENAME TO idx_agents_legacy_user;

-- Rename constraints (foreign keys)
ALTER TABLE IF EXISTS agent_logs_legacy
  RENAME CONSTRAINT agent_logs_agent_id_fkey TO agent_logs_legacy_agent_id_fkey;

-- Verification: Show renamed tables
SELECT tablename FROM pg_tables WHERE tablename LIKE '%agent%' ORDER BY tablename;
