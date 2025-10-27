-- Model Cost Comparison Enhancement
-- Purpose: Add provider tracking and create views for cost comparison dashboard

-- ==================== ADD PROVIDER FIELD ====================

-- Add provider field to api_cost_tracking table
ALTER TABLE api_cost_tracking ADD COLUMN IF NOT EXISTS provider TEXT;

-- Create index for provider
CREATE INDEX IF NOT EXISTS idx_api_cost_tracking_provider ON api_cost_tracking(provider);

-- Update existing records to set provider based on model name
UPDATE api_cost_tracking
SET provider = CASE
  WHEN model LIKE 'gpt%' OR model LIKE 'dall-e%' OR model LIKE 'text-embedding%' OR model LIKE 'whisper%' THEN 'openai'
  WHEN model LIKE 'claude%' THEN 'anthropic'
  WHEN model LIKE 'assemblyai%' THEN 'assemblyai'
  WHEN model LIKE 'google%' OR model LIKE 'gmail%' OR model LIKE 'drive%' THEN 'google'
  ELSE 'other'
END
WHERE provider IS NULL;

-- Add comment
COMMENT ON COLUMN api_cost_tracking.provider IS 'AI provider: openai, anthropic, google, assemblyai, etc.';

-- ==================== ENHANCED VIEWS FOR COST COMPARISON ====================

-- View: Cost by provider (last 30 days)
CREATE OR REPLACE VIEW cost_by_provider AS
SELECT
  COALESCE(provider, 'unknown') as provider,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  MAX(timestamp) as last_used
FROM api_cost_tracking
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY provider
ORDER BY total_cost DESC;

-- View: Cost by provider and model (last 30 days)
CREATE OR REPLACE VIEW cost_by_provider_model AS
SELECT
  COALESCE(provider, 'unknown') as provider,
  model,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  MAX(timestamp) as last_used
FROM api_cost_tracking
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY provider, model
ORDER BY total_cost DESC;

-- View: Daily cost by provider
CREATE OR REPLACE VIEW daily_cost_by_provider AS
SELECT
  DATE(timestamp) as date,
  COALESCE(provider, 'unknown') as provider,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_call
FROM api_cost_tracking
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp), provider
ORDER BY date DESC, total_cost DESC;

-- View: Hourly cost trend (last 24 hours)
CREATE OR REPLACE VIEW hourly_cost_trend AS
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COALESCE(provider, 'unknown') as provider,
  COUNT(*) as total_calls,
  SUM(cost_usd) as total_cost
FROM api_cost_tracking
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), provider
ORDER BY hour DESC;

-- View: Most expensive conversations
CREATE OR REPLACE VIEW most_expensive_conversations AS
SELECT
  (metadata->>'conversation_id')::TEXT as conversation_id,
  COALESCE(provider, 'unknown') as provider,
  model,
  COUNT(*) as message_count,
  SUM(cost_usd) as total_cost,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  MIN(timestamp) as started_at,
  MAX(timestamp) as last_message_at
FROM api_cost_tracking
WHERE
  metadata->>'conversation_id' IS NOT NULL
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY (metadata->>'conversation_id')::TEXT, provider, model
HAVING SUM(cost_usd) > 0.001  -- Filter out negligible costs
ORDER BY total_cost DESC
LIMIT 100;

-- ==================== COST SAVINGS ANALYSIS ====================

-- Function: Calculate potential savings if using cheaper model
CREATE OR REPLACE FUNCTION calculate_potential_savings(
  expensive_model TEXT,
  cheap_model TEXT,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  actual_cost DECIMAL(10, 2),
  potential_cost DECIMAL(10, 2),
  savings DECIMAL(10, 2),
  calls_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  expensive_input_rate DECIMAL(10, 6);
  expensive_output_rate DECIMAL(10, 6);
  cheap_input_rate DECIMAL(10, 6);
  cheap_output_rate DECIMAL(10, 6);
BEGIN
  -- Get pricing rates (hardcoded for now, could be moved to config table)
  -- Example rates per 1M tokens
  CASE expensive_model
    WHEN 'gpt-4o' THEN
      expensive_input_rate := 2.50 / 1000000;
      expensive_output_rate := 10.00 / 1000000;
    WHEN 'claude-sonnet-4.5-20250929' THEN
      expensive_input_rate := 3.00 / 1000000;
      expensive_output_rate := 15.00 / 1000000;
    ELSE
      expensive_input_rate := 0;
      expensive_output_rate := 0;
  END CASE;

  CASE cheap_model
    WHEN 'gpt-4o-mini' THEN
      cheap_input_rate := 0.15 / 1000000;
      cheap_output_rate := 0.60 / 1000000;
    WHEN 'claude-3-haiku-20240307' THEN
      cheap_input_rate := 0.25 / 1000000;
      cheap_output_rate := 1.25 / 1000000;
    ELSE
      cheap_input_rate := 0;
      cheap_output_rate := 0;
  END CASE;

  RETURN QUERY
  SELECT
    SUM(cost_usd)::DECIMAL(10, 2) as actual_cost,
    SUM((input_tokens * cheap_input_rate) + (output_tokens * cheap_output_rate))::DECIMAL(10, 2) as potential_cost,
    (SUM(cost_usd) - SUM((input_tokens * cheap_input_rate) + (output_tokens * cheap_output_rate)))::DECIMAL(10, 2) as savings,
    COUNT(*)::INTEGER as calls_count
  FROM api_cost_tracking
  WHERE
    model = expensive_model
    AND timestamp >= NOW() - INTERVAL '1 day' * days_back;
END;
$$;

-- ==================== BUDGET ANALYTICS ====================

-- View: Monthly spending trend
CREATE OR REPLACE VIEW monthly_spending_trend AS
SELECT
  DATE_TRUNC('month', timestamp) as month,
  COALESCE(provider, 'unknown') as provider,
  SUM(cost_usd) as total_cost,
  COUNT(*) as total_calls,
  AVG(cost_usd) as avg_cost_per_call
FROM api_cost_tracking
WHERE timestamp >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', timestamp), provider
ORDER BY month DESC, total_cost DESC;

-- View: User spending leaderboard (last 30 days)
CREATE OR REPLACE VIEW user_spending_leaderboard AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(act.id) as total_calls,
  SUM(act.cost_usd) as total_cost,
  AVG(act.cost_usd) as avg_cost_per_call,
  MAX(act.timestamp) as last_api_call
FROM users u
LEFT JOIN api_cost_tracking act ON u.id = act.user_id
WHERE act.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email
ORDER BY total_cost DESC;

-- ==================== PERFORMANCE INDEXES ====================

-- Composite index for provider + timestamp queries
CREATE INDEX IF NOT EXISTS idx_api_cost_provider_time ON api_cost_tracking(provider, timestamp DESC);

-- Index for conversation-based queries
CREATE INDEX IF NOT EXISTS idx_api_cost_conversation ON api_cost_tracking((metadata->>'conversation_id'));

-- ==================== SAMPLE QUERIES ====================

-- Example: Compare OpenAI vs Anthropic costs this month
-- SELECT * FROM cost_by_provider;

-- Example: Show daily cost breakdown by provider
-- SELECT * FROM daily_cost_by_provider WHERE date >= CURRENT_DATE - 7;

-- Example: Calculate savings if using GPT-4o-mini instead of GPT-4o
-- SELECT * FROM calculate_potential_savings('gpt-4o', 'gpt-4o-mini', 30);

-- Example: Find most expensive conversations
-- SELECT * FROM most_expensive_conversations LIMIT 10;

-- Example: View hourly cost trends
-- SELECT * FROM hourly_cost_trend ORDER BY hour DESC LIMIT 24;
