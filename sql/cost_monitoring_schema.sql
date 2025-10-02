-- Cost Monitoring Database Schema for KimbleAI
-- Comprehensive cost tracking and monitoring system
-- Run this SQL in your Supabase SQL Editor

-- ================================
-- API USAGE TRACKING
-- ================================

-- Main table for tracking all API usage and costs
CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId TEXT NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('openai', 'anthropic', 'google', 'other')),
  model TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('completion', 'embedding', 'transcription', 'tts', 'image', 'other')),
  inputTokens INTEGER DEFAULT 0,
  outputTokens INTEGER DEFAULT 0,
  totalTokens INTEGER DEFAULT 0,
  inputCost DECIMAL(10,6) DEFAULT 0,
  outputCost DECIMAL(10,6) DEFAULT 0,
  totalCost DECIMAL(10,6) DEFAULT 0,
  duration INTEGER, -- for audio/video in seconds
  characters INTEGER, -- for TTS
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT valid_tokens CHECK (totalTokens >= 0),
  CONSTRAINT valid_cost CHECK (totalCost >= 0)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON api_usage_tracking(userId);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_timestamp ON api_usage_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_service ON api_usage_tracking(service);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_model ON api_usage_tracking(model);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_timestamp ON api_usage_tracking(userId, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_service ON api_usage_tracking(userId, service);

-- Composite index for period queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON api_usage_tracking(userId, timestamp)
  WHERE timestamp >= (NOW() - INTERVAL '30 days');

-- ================================
-- USER COST LIMITS
-- ================================

-- User-configurable cost and usage limits
CREATE TABLE IF NOT EXISTS user_cost_limits (
  userId TEXT PRIMARY KEY,
  limits JSONB NOT NULL DEFAULT '{
    "daily": {
      "cost": 50,
      "tokens": 1000000,
      "enabled": true
    },
    "weekly": {
      "cost": 200,
      "tokens": 5000000,
      "enabled": true
    },
    "monthly": {
      "cost": 500,
      "tokens": 20000000,
      "enabled": true
    },
    "perRequest": {
      "maxCost": 5,
      "maxTokens": 100000,
      "enabled": true
    }
  }',
  updatedAt TIMESTAMPTZ DEFAULT NOW(),
  createdAt TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- ALERT CONFIGURATION
-- ================================

-- User alert configuration and preferences
CREATE TABLE IF NOT EXISTS user_alert_config (
  userId TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{
    "email": {
      "enabled": true,
      "recipients": [],
      "thresholds": [50, 75, 90, 100]
    },
    "dashboard": {
      "enabled": true,
      "severity": "warning"
    },
    "autoThrottle": {
      "enabled": true,
      "pauseAt": 95,
      "resumeAfter": 60
    }
  }',
  updatedAt TIMESTAMPTZ DEFAULT NOW(),
  createdAt TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- COST ALERTS
-- ================================

-- Store triggered alerts for audit and dashboard
CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId TEXT NOT NULL,
  alertType TEXT NOT NULL CHECK (alertType IN ('threshold', 'limit_exceeded', 'service_paused', 'anomaly')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'warning',
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'realtime')),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledgedAt TIMESTAMPTZ,
  acknowledgedBy TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_cost_alerts_user_id ON cost_alerts(userId);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_timestamp ON cost_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_severity ON cost_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_acknowledged ON cost_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_user_unacked ON cost_alerts(userId, acknowledged)
  WHERE acknowledged = FALSE;

-- ================================
-- SERVICE STATUS
-- ================================

-- Track service pause/resume status
CREATE TABLE IF NOT EXISTS service_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'throttled', 'blocked')) DEFAULT 'active',
  reason TEXT,
  pausedAt TIMESTAMPTZ,
  resumedAt TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  updatedAt TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(userId, service)
);

-- Index for service status
CREATE INDEX IF NOT EXISTS idx_service_status_user_service ON service_status(userId, service);
CREATE INDEX IF NOT EXISTS idx_service_status_status ON service_status(status);

-- ================================
-- COST ANALYTICS VIEWS
-- ================================

-- Daily usage summary view
CREATE OR REPLACE VIEW daily_usage_summary AS
SELECT
  userId,
  DATE(timestamp) as usage_date,
  service,
  COUNT(*) as requests,
  SUM(inputTokens) as total_input_tokens,
  SUM(outputTokens) as total_output_tokens,
  SUM(totalTokens) as total_tokens,
  SUM(totalCost) as total_cost,
  AVG(totalCost) as avg_cost_per_request,
  MAX(totalCost) as max_cost_per_request
FROM api_usage_tracking
GROUP BY userId, DATE(timestamp), service
ORDER BY usage_date DESC, total_cost DESC;

-- Weekly usage summary view
CREATE OR REPLACE VIEW weekly_usage_summary AS
SELECT
  userId,
  DATE_TRUNC('week', timestamp) as week_start,
  service,
  COUNT(*) as requests,
  SUM(totalTokens) as total_tokens,
  SUM(totalCost) as total_cost
FROM api_usage_tracking
GROUP BY userId, DATE_TRUNC('week', timestamp), service
ORDER BY week_start DESC, total_cost DESC;

-- Monthly usage summary view
CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT
  userId,
  DATE_TRUNC('month', timestamp) as month_start,
  service,
  COUNT(*) as requests,
  SUM(totalTokens) as total_tokens,
  SUM(totalCost) as total_cost
FROM api_usage_tracking
GROUP BY userId, DATE_TRUNC('month', timestamp), service
ORDER BY month_start DESC, total_cost DESC;

-- ================================
-- COST MONITORING FUNCTIONS
-- ================================

-- Function to get current period usage
CREATE OR REPLACE FUNCTION get_period_usage(
  p_user_id TEXT,
  p_period TEXT, -- 'daily', 'weekly', 'monthly'
  p_service TEXT DEFAULT NULL
)
RETURNS TABLE (
  cost DECIMAL,
  tokens BIGINT,
  requests BIGINT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  WITH period_bounds AS (
    SELECT
      CASE
        WHEN p_period = 'daily' THEN DATE_TRUNC('day', NOW())
        WHEN p_period = 'weekly' THEN DATE_TRUNC('week', NOW())
        WHEN p_period = 'monthly' THEN DATE_TRUNC('month', NOW())
        ELSE DATE_TRUNC('day', NOW())
      END AS start_time,
      NOW() AS end_time
  )
  SELECT
    COALESCE(SUM(aut.totalCost), 0)::DECIMAL AS cost,
    COALESCE(SUM(aut.totalTokens), 0)::BIGINT AS tokens,
    COUNT(*)::BIGINT AS requests,
    pb.start_time AS period_start,
    pb.end_time AS period_end
  FROM period_bounds pb
  LEFT JOIN api_usage_tracking aut ON
    aut.userId = p_user_id
    AND aut.timestamp >= pb.start_time
    AND aut.timestamp <= pb.end_time
    AND (p_service IS NULL OR aut.service = p_service)
  GROUP BY pb.start_time, pb.end_time;
$$;

-- Function to check if user is over limits
CREATE OR REPLACE FUNCTION check_user_limits(
  p_user_id TEXT,
  p_period TEXT
)
RETURNS TABLE (
  over_cost_limit BOOLEAN,
  over_token_limit BOOLEAN,
  cost_percentage DECIMAL,
  token_percentage DECIMAL,
  current_cost DECIMAL,
  current_tokens BIGINT,
  cost_limit DECIMAL,
  token_limit BIGINT
)
LANGUAGE SQL STABLE
AS $$
  WITH user_limits AS (
    SELECT
      COALESCE(
        (limits->p_period->>'cost')::DECIMAL,
        CASE
          WHEN p_period = 'daily' THEN 50
          WHEN p_period = 'weekly' THEN 200
          WHEN p_period = 'monthly' THEN 500
          ELSE 50
        END
      ) AS cost_limit,
      COALESCE(
        (limits->p_period->>'tokens')::BIGINT,
        CASE
          WHEN p_period = 'daily' THEN 1000000
          WHEN p_period = 'weekly' THEN 5000000
          WHEN p_period = 'monthly' THEN 20000000
          ELSE 1000000
        END
      ) AS token_limit,
      COALESCE(
        (limits->p_period->>'enabled')::BOOLEAN,
        TRUE
      ) AS enabled
    FROM user_cost_limits
    WHERE userId = p_user_id
    UNION ALL
    SELECT
      CASE
        WHEN p_period = 'daily' THEN 50
        WHEN p_period = 'weekly' THEN 200
        WHEN p_period = 'monthly' THEN 500
        ELSE 50
      END,
      CASE
        WHEN p_period = 'daily' THEN 1000000
        WHEN p_period = 'weekly' THEN 5000000
        WHEN p_period = 'monthly' THEN 20000000
        ELSE 1000000
      END,
      TRUE
    WHERE NOT EXISTS (SELECT 1 FROM user_cost_limits WHERE userId = p_user_id)
    LIMIT 1
  ),
  current_usage AS (
    SELECT cost, tokens
    FROM get_period_usage(p_user_id, p_period)
  )
  SELECT
    (cu.cost > ul.cost_limit) AS over_cost_limit,
    (cu.tokens > ul.token_limit) AS over_token_limit,
    CASE WHEN ul.cost_limit > 0 THEN (cu.cost / ul.cost_limit * 100) ELSE 0 END AS cost_percentage,
    CASE WHEN ul.token_limit > 0 THEN (cu.tokens::DECIMAL / ul.token_limit * 100) ELSE 0 END AS token_percentage,
    cu.cost AS current_cost,
    cu.tokens AS current_tokens,
    ul.cost_limit,
    ul.token_limit
  FROM user_limits ul, current_usage cu
  WHERE ul.enabled = TRUE;
$$;

-- Function to get cost trends
CREATE OR REPLACE FUNCTION get_cost_trends(
  p_user_id TEXT,
  p_period TEXT
)
RETURNS TABLE (
  current_cost DECIMAL,
  previous_cost DECIMAL,
  change_amount DECIMAL,
  change_percentage DECIMAL,
  trend TEXT
)
LANGUAGE SQL STABLE
AS $$
  WITH period_intervals AS (
    SELECT
      CASE
        WHEN p_period = 'daily' THEN INTERVAL '1 day'
        WHEN p_period = 'weekly' THEN INTERVAL '1 week'
        WHEN p_period = 'monthly' THEN INTERVAL '1 month'
        ELSE INTERVAL '1 day'
      END AS interval_length
  ),
  current_period AS (
    SELECT cost FROM get_period_usage(p_user_id, p_period)
  ),
  previous_period AS (
    SELECT
      COALESCE(SUM(aut.totalCost), 0)::DECIMAL AS cost
    FROM api_usage_tracking aut, period_intervals pi
    WHERE
      aut.userId = p_user_id
      AND aut.timestamp >= (
        CASE
          WHEN p_period = 'daily' THEN DATE_TRUNC('day', NOW() - pi.interval_length)
          WHEN p_period = 'weekly' THEN DATE_TRUNC('week', NOW() - pi.interval_length)
          WHEN p_period = 'monthly' THEN DATE_TRUNC('month', NOW() - pi.interval_length)
          ELSE DATE_TRUNC('day', NOW() - pi.interval_length)
        END
      )
      AND aut.timestamp < (
        CASE
          WHEN p_period = 'daily' THEN DATE_TRUNC('day', NOW())
          WHEN p_period = 'weekly' THEN DATE_TRUNC('week', NOW())
          WHEN p_period = 'monthly' THEN DATE_TRUNC('month', NOW())
          ELSE DATE_TRUNC('day', NOW())
        END
      )
  )
  SELECT
    cp.cost AS current_cost,
    pp.cost AS previous_cost,
    (cp.cost - pp.cost) AS change_amount,
    CASE
      WHEN pp.cost > 0 THEN ((cp.cost - pp.cost) / pp.cost * 100)
      ELSE 0
    END AS change_percentage,
    CASE
      WHEN (cp.cost - pp.cost) > (pp.cost * 0.1) THEN 'increasing'
      WHEN (cp.cost - pp.cost) < -(pp.cost * 0.1) THEN 'decreasing'
      ELSE 'stable'
    END AS trend
  FROM current_period cp, previous_period pp;
$$;

-- ================================
-- TRIGGERS AND AUTOMATION
-- ================================

-- Trigger to automatically check limits after usage recording
CREATE OR REPLACE FUNCTION trigger_limit_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any limits are exceeded and create alerts
  INSERT INTO cost_alerts (userId, alertType, severity, period, message, data)
  SELECT
    NEW.userId,
    'threshold',
    CASE
      WHEN cost_percentage >= 100 OR token_percentage >= 100 THEN 'critical'
      WHEN cost_percentage >= 90 OR token_percentage >= 90 THEN 'error'
      WHEN cost_percentage >= 75 OR token_percentage >= 75 THEN 'warning'
      ELSE 'info'
    END,
    period_check.period,
    format('Usage limit alert: %s usage at %.1f%% of limit',
           period_check.period,
           GREATEST(cost_percentage, token_percentage)),
    json_build_object(
      'cost_percentage', cost_percentage,
      'token_percentage', token_percentage,
      'current_cost', current_cost,
      'current_tokens', current_tokens,
      'cost_limit', cost_limit,
      'token_limit', token_limit
    )
  FROM (
    SELECT 'daily' AS period UNION ALL
    SELECT 'weekly' AS period UNION ALL
    SELECT 'monthly' AS period
  ) period_check,
  LATERAL check_user_limits(NEW.userId, period_check.period)
  WHERE (cost_percentage >= 75 OR token_percentage >= 75)
    AND NOT EXISTS (
      SELECT 1 FROM cost_alerts
      WHERE userId = NEW.userId
        AND period = period_check.period
        AND timestamp > NOW() - INTERVAL '1 hour'
        AND alertType = 'threshold'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to usage tracking
CREATE TRIGGER usage_limit_check_trigger
  AFTER INSERT ON api_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION trigger_limit_check();

-- ================================
-- ROW LEVEL SECURITY
-- ================================

-- Enable RLS on all cost monitoring tables
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cost_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cost monitoring tables

-- API usage tracking: Users can only see their own data
CREATE POLICY "Users can access own usage data" ON api_usage_tracking
  FOR ALL USING (
    userId = current_setting('app.current_user_id', true) OR
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

-- User cost limits: Users can only see/modify their own limits
CREATE POLICY "Users can manage own cost limits" ON user_cost_limits
  FOR ALL USING (
    userId = current_setting('app.current_user_id', true) OR
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

-- Alert config: Users can only see/modify their own config
CREATE POLICY "Users can manage own alert config" ON user_alert_config
  FOR ALL USING (
    userId = current_setting('app.current_user_id', true) OR
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

-- Cost alerts: Users can see their own alerts
CREATE POLICY "Users can view own alerts" ON cost_alerts
  FOR ALL USING (
    userId = current_setting('app.current_user_id', true) OR
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

-- Service status: Users can see their own service status
CREATE POLICY "Users can view own service status" ON service_status
  FOR ALL USING (
    userId = current_setting('app.current_user_id', true) OR
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true) AND role = 'admin')
  );

-- ================================
-- INITIAL DATA AND DEFAULTS
-- ================================

-- Insert default cost limits for existing users
INSERT INTO user_cost_limits (userId, limits)
SELECT
  id,
  '{
    "daily": {"cost": 50, "tokens": 1000000, "enabled": true},
    "weekly": {"cost": 200, "tokens": 5000000, "enabled": true},
    "monthly": {"cost": 500, "tokens": 20000000, "enabled": true},
    "perRequest": {"maxCost": 5, "maxTokens": 100000, "enabled": true}
  }'::jsonb
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_cost_limits WHERE userId = users.id
);

-- Insert default alert configurations
INSERT INTO user_alert_config (userId, config)
SELECT
  id,
  json_build_object(
    'email', json_build_object(
      'enabled', true,
      'recipients', ARRAY[email],
      'thresholds', ARRAY[50, 75, 90, 100]
    ),
    'dashboard', json_build_object(
      'enabled', true,
      'severity', 'warning'
    ),
    'autoThrottle', json_build_object(
      'enabled', true,
      'pauseAt', 95,
      'resumeAfter', 60
    )
  )::jsonb
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_alert_config WHERE userId = users.id
);

-- ================================
-- PERMISSIONS
-- ================================

-- Grant permissions for cost monitoring tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes on JSONB fields for better performance
CREATE INDEX IF NOT EXISTS idx_user_cost_limits_gin ON user_cost_limits USING gin(limits);
CREATE INDEX IF NOT EXISTS idx_user_alert_config_gin ON user_alert_config USING gin(config);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_data_gin ON cost_alerts USING gin(data);
CREATE INDEX IF NOT EXISTS idx_service_status_metadata_gin ON service_status USING gin(metadata);

-- ================================
-- COMMENTS AND DOCUMENTATION
-- ================================

COMMENT ON TABLE api_usage_tracking IS 'Comprehensive tracking of all API usage and associated costs';
COMMENT ON TABLE user_cost_limits IS 'User-configurable spending and usage limits';
COMMENT ON TABLE user_alert_config IS 'Alert configuration and notification preferences';
COMMENT ON TABLE cost_alerts IS 'Historical record of all triggered cost alerts';
COMMENT ON TABLE service_status IS 'Current status of services (active/paused/throttled)';

COMMENT ON FUNCTION get_period_usage IS 'Get usage statistics for a specific time period';
COMMENT ON FUNCTION check_user_limits IS 'Check if user has exceeded configured limits';
COMMENT ON FUNCTION get_cost_trends IS 'Calculate cost trends and changes over time';

-- ================================
-- CLEANUP AND MAINTENANCE
-- ================================

-- Function to cleanup old usage data (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_usage_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE SQL
AS $$
  WITH deleted AS (
    DELETE FROM api_usage_tracking
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) FROM deleted;
$$;

-- Function to cleanup old alerts (run weekly)
CREATE OR REPLACE FUNCTION cleanup_old_alerts(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE SQL
AS $$
  WITH deleted AS (
    DELETE FROM cost_alerts
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL
      AND acknowledged = TRUE
    RETURNING id
  )
  SELECT COUNT(*) FROM deleted;
$$;

-- Create maintenance schedule (would be run by cron job)
COMMENT ON FUNCTION cleanup_old_usage_data IS 'Cleanup old usage data - should be run monthly';
COMMENT ON FUNCTION cleanup_old_alerts IS 'Cleanup old acknowledged alerts - should be run weekly';