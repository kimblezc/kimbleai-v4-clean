-- ================================================================
-- Fix MCP Server Arguments
-- ================================================================
-- Purpose: Add required arguments for MCP servers to work properly
-- Issue: Servers were configured with empty args, causing Connection closed errors
-- ================================================================

-- Filesystem Server: Needs directory path argument
UPDATE mcp_servers
SET args = '["@modelcontextprotocol/server-filesystem", "/tmp"]'::jsonb
WHERE name = 'filesystem';

-- GitHub Server: Args are correct (package name only)
UPDATE mcp_servers
SET args = '["@modelcontextprotocol/server-github"]'::jsonb
WHERE name = 'github';

-- Memory Server: Args are correct (package name only)
UPDATE mcp_servers
SET args = '["@modelcontextprotocol/server-memory"]'::jsonb
WHERE name = 'memory';

-- Verify the updates
SELECT name, command, args, enabled
FROM mcp_servers
ORDER BY priority DESC;

-- Success message
SELECT '✅ MCP server arguments fixed!' as result;
