-- ============================================================================
-- MCP Infrastructure Cleanup Migration
-- Date: 2025-10-30
-- Purpose: Remove all MCP-related database entries
-- ============================================================================

-- Drop mcp_servers table if exists
DROP TABLE IF EXISTS public.mcp_servers CASCADE;

-- Drop any MCP-related functions
DROP FUNCTION IF EXISTS public.get_mcp_servers() CASCADE;
DROP FUNCTION IF EXISTS public.get_mcp_server_by_id(text) CASCADE;
DROP FUNCTION IF EXISTS public.update_mcp_server_status(text, text) CASCADE;

-- Clean up any orphaned data
-- (Add specific cleanup queries if you know of other MCP-related tables)

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'MCP infrastructure has been completely removed from the database';
  RAISE NOTICE 'Migration completed at %', NOW();
END $$;
