-- API Logs Table
-- Tracks all API requests for error monitoring and performance analysis

CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD')),
  status_code INTEGER NOT NULL,

  -- Performance
  response_time_ms INTEGER NOT NULL,

  -- Error tracking
  error_message TEXT,
  stack_trace TEXT,

  -- User context
  user_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,

  -- Request/Response data
  request_body JSONB,
  response_body JSONB,
  query_params JSONB,
  headers JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  environment TEXT DEFAULT 'production'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_response_time ON api_logs(response_time_ms);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);

-- Cleanup policy: Keep logs for 30 days
-- This should be run periodically (e.g., daily cron job)
-- DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '30 days';

COMMENT ON TABLE api_logs IS 'Tracks all API requests for monitoring, debugging, and performance analysis';
COMMENT ON COLUMN api_logs.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN api_logs.status_code IS 'HTTP status code (200, 404, 500, etc.)';
