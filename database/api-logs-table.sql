-- API Logs Table
-- For monitoring API performance and errors
-- Used by autonomous agent to detect performance issues and errors

CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')),

  -- Response details
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,

  -- Request context
  user_id UUID,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,

  -- Request/response data (optional)
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  stack_trace TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  environment TEXT DEFAULT 'production'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_response_time ON api_logs(response_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_errors ON api_logs(status_code) WHERE status_code >= 400;

-- Composite index for common agent queries
CREATE INDEX IF NOT EXISTS idx_api_logs_agent_monitoring
  ON api_logs(created_at DESC, status_code, response_time_ms);

-- Comments
COMMENT ON TABLE api_logs IS 'Logs all API requests for performance monitoring and error detection';
COMMENT ON COLUMN api_logs.endpoint IS 'API endpoint path (e.g., /api/chat, /api/search)';
COMMENT ON COLUMN api_logs.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN api_logs.status_code IS 'HTTP status code (200, 404, 500, etc.)';
