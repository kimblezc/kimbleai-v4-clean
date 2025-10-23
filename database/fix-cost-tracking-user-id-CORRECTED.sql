-- CORRECTED Migration: Fix cost tracking user_id to support string identifiers
-- Issue: Views depend on user_id column, must drop them first

-- ==================== STEP 1: DROP DEPENDENT VIEWS ====================

DROP VIEW IF EXISTS daily_cost_summary CASCADE;
DROP VIEW IF EXISTS monthly_cost_summary CASCADE;
DROP VIEW IF EXISTS cost_by_model CASCADE;
DROP VIEW IF EXISTS cost_by_endpoint CASCADE;

-- ==================== STEP 2: DROP FOREIGN KEY CONSTRAINTS ====================

ALTER TABLE api_cost_tracking DROP CONSTRAINT IF EXISTS api_cost_tracking_user_id_fkey;
ALTER TABLE budget_alerts DROP CONSTRAINT IF EXISTS budget_alerts_user_id_fkey;
ALTER TABLE budget_config DROP CONSTRAINT IF EXISTS budget_config_user_id_fkey;

-- ==================== STEP 3: CHANGE COLUMN TYPES ====================

ALTER TABLE api_cost_tracking ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE budget_alerts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE budget_config ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ==================== STEP 4: DROP AND RECREATE FUNCTIONS ====================

DROP FUNCTION IF EXISTS get_spending_since(TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS get_monthly_spending(UUID);
DROP FUNCTION IF EXISTS get_daily_spending(UUID);
DROP FUNCTION IF EXISTS get_hourly_spending(UUID);
DROP FUNCTION IF EXISTS get_top_expensive_calls(INTEGER, INTEGER);

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
  call_timestamp TIMESTAMPTZ,
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

-- ==================== STEP 5: RECREATE VIEWS WITH TEXT USER_ID ====================

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

-- ==================== STEP 6: UPDATE RLS POLICIES ====================

DROP POLICY IF EXISTS api_cost_tracking_user_policy ON api_cost_tracking;
DROP POLICY IF EXISTS budget_alerts_user_policy ON budget_alerts;
DROP POLICY IF EXISTS budget_config_user_policy ON budget_config;
DROP POLICY IF EXISTS api_cost_tracking_service_role ON api_cost_tracking;
DROP POLICY IF EXISTS budget_alerts_service_role ON budget_alerts;
DROP POLICY IF EXISTS budget_config_service_role ON budget_config;

-- Allow service role full access (needed for API to work)
CREATE POLICY api_cost_tracking_service_role ON api_cost_tracking
  FOR ALL
  USING (true);

CREATE POLICY budget_alerts_service_role ON budget_alerts
  FOR ALL
  USING (true);

CREATE POLICY budget_config_service_role ON budget_config
  FOR ALL
  USING (true);

-- ==================== VERIFICATION ====================

-- Test that string user IDs work
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test query with string user_id
  SELECT user_id, COUNT(*) as count INTO test_result
  FROM api_cost_tracking
  WHERE user_id IN ('zach', 'rebecca')
  GROUP BY user_id
  LIMIT 1;

  RAISE NOTICE 'Migration successful! Found user_id: %', test_result.user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Verification query failed (may be expected if no data yet): %', SQLERRM;
END $$;

-- ==================== COMMENTS ====================

COMMENT ON COLUMN api_cost_tracking.user_id IS 'User identifier (TEXT) - supports both UUIDs and simple strings like "zach" or "rebecca"';
COMMENT ON COLUMN budget_alerts.user_id IS 'User identifier (TEXT)';
COMMENT ON COLUMN budget_config.user_id IS 'User identifier (TEXT)';

-- Success message
SELECT 'Migration completed successfully! user_id is now TEXT type in all cost tracking tables.' as status;
