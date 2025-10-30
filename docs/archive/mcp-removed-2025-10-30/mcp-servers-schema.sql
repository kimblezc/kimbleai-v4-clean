-- ================================================================
-- MCP (Model Context Protocol) Integration Schema
-- ================================================================
-- Purpose: Store MCP server configurations, logs, and metrics
-- Version: 1.0.0
-- Created: October 26, 2025
-- ================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- Table: mcp_servers
-- Purpose: Store MCP server configurations
-- ================================================================
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Transport configuration
  transport TEXT NOT NULL CHECK (transport IN ('stdio', 'sse', 'http')),

  -- For stdio transport
  command TEXT,
  args JSONB DEFAULT '[]'::jsonb,

  -- For HTTP/SSE transport
  url TEXT,

  -- Environment variables (API keys, tokens, etc.)
  env JSONB DEFAULT '{}'::jsonb,

  -- Server capabilities
  capabilities JSONB DEFAULT '{}'::jsonb,

  -- Connection settings
  timeout INTEGER DEFAULT 30000 CHECK (timeout > 0),
  retry_attempts INTEGER DEFAULT 3 CHECK (retry_attempts >= 0),
  retry_delay INTEGER DEFAULT 1000 CHECK (retry_delay >= 0),

  -- Health check settings
  health_check_interval INTEGER DEFAULT 60000 CHECK (health_check_interval > 0),
  health_check_timeout INTEGER DEFAULT 5000 CHECK (health_check_timeout > 0),

  -- Server status
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Tags for categorization
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- ================================================================
-- Table: mcp_connection_logs
-- Purpose: Log all connection events for debugging and monitoring
-- ================================================================
CREATE TABLE IF NOT EXISTS mcp_connection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,

  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN ('connected', 'disconnected', 'error', 'health_check')),

  -- Connection status
  status TEXT CHECK (status IN ('success', 'failure', 'timeout', 'unknown')),

  -- Error details
  error_message TEXT,
  error_code TEXT,

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- Table: mcp_tool_invocations
-- Purpose: Track all MCP tool invocations for analytics
-- ================================================================
CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,

  -- Tool details
  tool_name TEXT NOT NULL,

  -- Input/Output
  arguments JSONB,
  result JSONB,

  -- Execution details
  success BOOLEAN NOT NULL,
  execution_time INTEGER, -- milliseconds

  -- Error details (if failed)
  error_message TEXT,
  error_code TEXT,

  -- User context
  invoked_by TEXT,
  conversation_id UUID,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- Table: mcp_server_metrics
-- Purpose: Aggregated metrics for dashboard and analytics
-- ================================================================
CREATE TABLE IF NOT EXISTS mcp_server_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,

  -- Time period
  date DATE NOT NULL,

  -- Request metrics
  total_requests INTEGER DEFAULT 0 CHECK (total_requests >= 0),
  successful_requests INTEGER DEFAULT 0 CHECK (successful_requests >= 0),
  failed_requests INTEGER DEFAULT 0 CHECK (failed_requests >= 0),

  -- Performance metrics
  average_response_time FLOAT DEFAULT 0 CHECK (average_response_time >= 0),
  min_response_time FLOAT,
  max_response_time FLOAT,

  -- Availability metrics
  uptime_percentage FLOAT DEFAULT 0 CHECK (uptime_percentage BETWEEN 0 AND 100),
  total_downtime INTEGER DEFAULT 0, -- seconds

  -- Error tracking
  error_rate FLOAT DEFAULT 0 CHECK (error_rate BETWEEN 0 AND 100),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one row per server per day
  UNIQUE(server_id, date)
);

-- ================================================================
-- Indexes for Performance
-- ================================================================

-- mcp_servers indexes
CREATE INDEX IF NOT EXISTS idx_mcp_servers_enabled ON mcp_servers(enabled);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_priority ON mcp_servers(priority DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_transport ON mcp_servers(transport);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_tags ON mcp_servers USING GIN(tags);

-- mcp_connection_logs indexes
CREATE INDEX IF NOT EXISTS idx_mcp_connection_logs_server_id ON mcp_connection_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connection_logs_created_at ON mcp_connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_connection_logs_event_type ON mcp_connection_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_mcp_connection_logs_status ON mcp_connection_logs(status);

-- mcp_tool_invocations indexes
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_server_id ON mcp_tool_invocations(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_created_at ON mcp_tool_invocations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_tool_name ON mcp_tool_invocations(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_success ON mcp_tool_invocations(success);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_invoked_by ON mcp_tool_invocations(invoked_by);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_conversation_id ON mcp_tool_invocations(conversation_id);

-- mcp_server_metrics indexes
CREATE INDEX IF NOT EXISTS idx_mcp_server_metrics_server_id ON mcp_server_metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_server_metrics_date ON mcp_server_metrics(date DESC);

-- ================================================================
-- Functions and Triggers
-- ================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mcp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on mcp_servers
DROP TRIGGER IF EXISTS trigger_mcp_servers_updated_at ON mcp_servers;
CREATE TRIGGER trigger_mcp_servers_updated_at
  BEFORE UPDATE ON mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_updated_at();

-- Trigger: Auto-update updated_at on mcp_server_metrics
DROP TRIGGER IF EXISTS trigger_mcp_server_metrics_updated_at ON mcp_server_metrics;
CREATE TRIGGER trigger_mcp_server_metrics_updated_at
  BEFORE UPDATE ON mcp_server_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_updated_at();

-- ================================================================
-- Row Level Security (RLS) Policies
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tool_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all MCP data
CREATE POLICY "Allow authenticated users to read mcp_servers"
  ON mcp_servers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read mcp_connection_logs"
  ON mcp_connection_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read mcp_tool_invocations"
  ON mcp_tool_invocations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read mcp_server_metrics"
  ON mcp_server_metrics FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow service role full access to mcp_servers"
  ON mcp_servers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to mcp_connection_logs"
  ON mcp_connection_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to mcp_tool_invocations"
  ON mcp_tool_invocations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to mcp_server_metrics"
  ON mcp_server_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- Initial Data: Sample MCP Servers
-- ================================================================

-- GitHub Server (requires GITHUB_PERSONAL_ACCESS_TOKEN env var)
INSERT INTO mcp_servers (name, description, transport, command, args, capabilities, priority, tags)
VALUES (
  'github',
  'GitHub repository access, code search, and issue management',
  'stdio',
  'npx',
  '["@modelcontextprotocol/server-github"]'::jsonb,
  '{"tools": true, "resources": true, "prompts": false}'::jsonb,
  10,
  ARRAY['git', 'code', 'collaboration']
) ON CONFLICT (name) DO NOTHING;

-- Filesystem Server (requires path configuration)
INSERT INTO mcp_servers (name, description, transport, command, args, capabilities, priority, tags)
VALUES (
  'filesystem',
  'Secure local filesystem access with directory restrictions',
  'stdio',
  'npx',
  '["@modelcontextprotocol/server-filesystem"]'::jsonb,
  '{"tools": true, "resources": true, "prompts": false}'::jsonb,
  9,
  ARRAY['files', 'storage', 'local']
) ON CONFLICT (name) DO NOTHING;

-- Memory Server (persistent knowledge graph)
INSERT INTO mcp_servers (name, description, transport, command, args, capabilities, priority, tags)
VALUES (
  'memory',
  'Persistent memory and knowledge graph for context across sessions',
  'stdio',
  'npx',
  '["@modelcontextprotocol/server-memory"]'::jsonb,
  '{"tools": true, "resources": true, "prompts": false}'::jsonb,
  8,
  ARRAY['memory', 'knowledge', 'context']
) ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- Verification Queries
-- ================================================================

-- Check table creation
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename LIKE 'mcp_%'
ORDER BY tablename;

-- Check indexes
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename LIKE 'mcp_%'
ORDER BY tablename, indexname;

-- Check initial data
SELECT
  name,
  transport,
  enabled,
  priority,
  tags
FROM mcp_servers
ORDER BY priority DESC;

-- Success message
SELECT '✅ MCP Schema created successfully!' as result;
