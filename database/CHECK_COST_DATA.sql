-- Quick check to see if cost tracking has any data

-- Check 1: Count total records
SELECT COUNT(*) as total_records FROM api_cost_tracking;

-- Check 2: Show recent records (if any exist)
SELECT
  id,
  user_id,
  model,
  endpoint,
  cost_usd,
  input_tokens,
  output_tokens,
  timestamp
FROM api_cost_tracking
ORDER BY timestamp DESC
LIMIT 10;

-- Check 3: Show sum of all costs
SELECT
  SUM(cost_usd) as total_cost,
  COUNT(*) as total_calls,
  COUNT(DISTINCT user_id) as unique_users
FROM api_cost_tracking;

-- Check 4: Check column structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'api_cost_tracking'
ORDER BY ordinal_position;
