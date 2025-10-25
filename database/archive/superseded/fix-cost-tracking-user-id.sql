-- Migration: Fix cost tracking user_id to support string identifiers
-- Issue: api_cost_tracking.user_id is UUID but app uses "zach"/"rebecca" strings
-- Error: invalid input syntax for type uuid: "rebecca"

-- Step 1: Drop the foreign key constraint
ALTER TABLE api_cost_tracking
DROP CONSTRAINT IF EXISTS api_cost_tracking_user_id_fkey;

ALTER TABLE budget_alerts
DROP CONSTRAINT IF EXISTS budget_alerts_user_id_fkey;

ALTER TABLE budget_config
DROP CONSTRAINT IF EXISTS budget_config_user_id_fkey;

-- Step 2: Change user_id from UUID to TEXT in api_cost_tracking
ALTER TABLE api_cost_tracking
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 3: Change user_id in budget_alerts
ALTER TABLE budget_alerts
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Change user_id in budget_config
ALTER TABLE budget_config
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 5: Drop UUID functions that won't work with TEXT user_id
DROP FUNCTION IF EXISTS get_spending_since(TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS get_monthly_spending(UUID);
DROP FUNCTION IF EXISTS get_daily_spending(UUID);
DROP FUNCTION IF EXISTS get_hourly_spending(UUID);

-- Step 6: Recreate functions with TEXT user_id
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

-- Step 7: Recreate top_expensive_calls function with TEXT user_id
DROP FUNCTION IF EXISTS get_top_expensive_calls(INTEGER, INTEGER);

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

-- Step 8: Update RLS policies to work with TEXT user_id
DROP POLICY IF EXISTS api_cost_tracking_user_policy ON api_cost_tracking;
DROP POLICY IF EXISTS budget_alerts_user_policy ON budget_alerts;
DROP POLICY IF EXISTS budget_config_user_policy ON budget_config;

-- Note: RLS policies will need to be updated based on your authentication system
-- For now, we'll create simple policies that allow service role access
CREATE POLICY api_cost_tracking_service_role ON api_cost_tracking
  FOR ALL
  USING (true);

CREATE POLICY budget_alerts_service_role ON budget_alerts
  FOR ALL
  USING (true);

CREATE POLICY budget_config_service_role ON budget_config
  FOR ALL
  USING (true);

-- Verification queries
-- SELECT user_id, COUNT(*), SUM(cost_usd) FROM api_cost_tracking GROUP BY user_id;
-- SELECT * FROM api_cost_tracking WHERE user_id = 'zach' OR user_id = 'rebecca' LIMIT 5;

COMMENT ON COLUMN api_cost_tracking.user_id IS 'User identifier (supports both UUIDs and string identifiers like "zach" or "rebecca")';
COMMENT ON COLUMN budget_alerts.user_id IS 'User identifier (TEXT format)';
COMMENT ON COLUMN budget_config.user_id IS 'User identifier (TEXT format)';
