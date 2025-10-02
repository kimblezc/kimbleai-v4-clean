-- API Cost Tracking Tables
-- Purpose: Monitor and limit API costs to prevent unexpected bills

-- ==================== COST TRACKING TABLE ====================

CREATE TABLE IF NOT EXISTS api_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexes for fast queries
  CONSTRAINT api_cost_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_api_cost_tracking_user_id ON api_cost_tracking(user_id);
CREATE INDEX idx_api_cost_tracking_timestamp ON api_cost_tracking(timestamp DESC);
CREATE INDEX idx_api_cost_tracking_model ON api_cost_tracking(model);
CREATE INDEX idx_api_cost_tracking_endpoint ON api_cost_tracking(endpoint);
CREATE INDEX idx_api_cost_tracking_cost ON api_cost_tracking(cost_usd DESC);

-- Composite index for common queries
CREATE INDEX idx_api_cost_tracking_user_time ON api_cost_tracking(user_id, timestamp DESC);

COMMENT ON TABLE api_cost_tracking IS 'Tracks every API call with token usage and cost for budget monitoring';

-- ==================== BUDGET ALERTS TABLE ====================

CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical', 'emergency')),
  percent_used DECIMAL(5, 2) NOT NULL,
  message TEXT NOT NULL,
  user_id TEXT,
  status JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,

  CONSTRAINT budget_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_budget_alerts_severity ON budget_alerts(severity);
CREATE INDEX idx_budget_alerts_timestamp ON budget_alerts(timestamp DESC);
CREATE INDEX idx_budget_alerts_user_id ON budget_alerts(user_id);
CREATE INDEX idx_budget_alerts_acknowledged ON budget_alerts(acknowledged) WHERE NOT acknowledged;

COMMENT ON TABLE budget_alerts IS 'Stores budget alert history for monitoring and review';

-- ==================== BUDGET CONFIGURATION TABLE ====================

CREATE TABLE IF NOT EXISTS budget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE,
  monthly_limit DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  daily_limit DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  hourly_limit DECIMAL(10, 2) NOT NULL DEFAULT 2.00,
  hard_stop_enabled BOOLEAN DEFAULT FALSE,
  alert_at_50 BOOLEAN DEFAULT TRUE,
  alert_at_75 BOOLEAN DEFAULT TRUE,
  alert_at_90 BOOLEAN DEFAULT TRUE,
  alert_email TEXT,
  alert_webhook TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT budget_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX idx_budget_config_user_id ON budget_config(user_id);

COMMENT ON TABLE budget_config IS 'Per-user budget configuration and alert settings';

-- ==================== HELPER FUNCTIONS ====================

-- Function: Get spending for a time period
CREATE OR REPLACE FUNCTION get_spending_since(
  since_timestamp TIMESTAMPTZ,
  filter_user_id TEXT DEFAULT NULL
)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
  total_cost DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(cost_usd), 0)::DECIMAL(10, 2)
  INTO total_cost
  FROM api_cost_tracking
  WHERE timestamp >= since_timestamp
    AND (filter_user_id IS NULL OR user_id = filter_user_id);

  RETURN total_cost;
END;
$$;

-- Function: Get monthly spending
CREATE OR REPLACE FUNCTION get_monthly_spending(
  filter_user_id TEXT DEFAULT NULL
)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN get_spending_since(
    DATE_TRUNC('month', NOW()),
    filter_user_id
  );
END;
$$;

-- Function: Get daily spending
CREATE OR REPLACE FUNCTION get_daily_spending(
  filter_user_id TEXT DEFAULT NULL
)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN get_spending_since(
    DATE_TRUNC('day', NOW()),
    filter_user_id
  );
END;
$$;

-- Function: Get hourly spending
CREATE OR REPLACE FUNCTION get_hourly_spending(
  filter_user_id TEXT DEFAULT NULL
)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN get_spending_since(
    DATE_TRUNC('hour', NOW()),
    filter_user_id
  );
END;
$$;

-- Function: Get top expensive calls
CREATE OR REPLACE FUNCTION get_top_expensive_calls(
  limit_count INTEGER DEFAULT 10,
  since_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  model TEXT,
  endpoint TEXT,
  cost_usd DECIMAL(10, 6),
  input_tokens INTEGER,
  output_tokens INTEGER,
  timestamp TIMESTAMPTZ,
  user_id TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    act.model,
    act.endpoint,
    act.cost_usd,
    act.input_tokens,
    act.output_tokens,
    act.timestamp,
    act.user_id
  FROM api_cost_tracking act
  WHERE act.timestamp >= NOW() - INTERVAL '1 day' * since_days
  ORDER BY act.cost_usd DESC
  LIMIT limit_count;
END;
$$;

-- ==================== MONITORING VIEWS ====================

-- View: Daily cost summary
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT
  DATE(timestamp) as date,
  user_id,
  COUNT(*) as total_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call,
  MAX(cost_usd) as max_cost_per_call
FROM api_cost_tracking
GROUP BY DATE(timestamp), user_id
ORDER BY DATE(timestamp) DESC, total_cost DESC;

-- View: Monthly cost summary
CREATE OR REPLACE VIEW monthly_cost_summary AS
SELECT
  DATE_TRUNC('month', timestamp) as month,
  user_id,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call
FROM api_cost_tracking
GROUP BY DATE_TRUNC('month', timestamp), user_id
ORDER BY month DESC, total_cost DESC;

-- View: Cost by model
CREATE OR REPLACE VIEW cost_by_model AS
SELECT
  model,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens
FROM api_cost_tracking
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY model
ORDER BY total_cost DESC;

-- View: Cost by endpoint
CREATE OR REPLACE VIEW cost_by_endpoint AS
SELECT
  endpoint,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call
FROM api_cost_tracking
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY endpoint
ORDER BY total_cost DESC;

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS
ALTER TABLE api_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_config ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own cost data
CREATE POLICY api_cost_tracking_user_policy ON api_cost_tracking
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt()->>'role' = 'admin');

CREATE POLICY budget_alerts_user_policy ON budget_alerts
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.jwt()->>'role' = 'admin');

CREATE POLICY budget_config_user_policy ON budget_config
  FOR ALL
  USING (auth.uid()::text = user_id OR auth.jwt()->>'role' = 'admin');

-- ==================== AUTOMATIC CLEANUP ====================

-- Function: Clean up old cost tracking data (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_cost_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM api_cost_tracking
  WHERE timestamp < NOW() - INTERVAL '90 days';

  DELETE FROM budget_alerts
  WHERE timestamp < NOW() - INTERVAL '90 days'
    AND acknowledged = TRUE;
END;
$$;

-- Schedule cleanup (run monthly via cron job or scheduled task)
-- Example cron: 0 0 1 * * (first day of each month at midnight)

COMMENT ON FUNCTION cleanup_old_cost_data IS 'Deletes cost tracking data older than 90 days to save storage';

-- ==================== SAMPLE QUERIES ====================

-- Example: Get current month spending
-- SELECT get_monthly_spending('user_id');

-- Example: Get today's spending
-- SELECT get_daily_spending('user_id');

-- Example: Get top 10 expensive calls this week
-- SELECT * FROM get_top_expensive_calls(10, 7);

-- Example: View daily costs
-- SELECT * FROM daily_cost_summary WHERE date >= CURRENT_DATE - 7;

-- Example: Check if user is over budget
-- SELECT
--   user_id,
--   get_monthly_spending(user_id) as current_spend,
--   bc.monthly_limit,
--   (get_monthly_spending(user_id) / bc.monthly_limit * 100) as percent_used
-- FROM budget_config bc;
