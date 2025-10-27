-- Model Performance Tracking Schema
-- Purpose: Track AI model performance metrics to recommend best model for each task type
-- Part of Phase 4: Performance Analytics & Model Optimization

-- ==================== MODEL PERFORMANCE METRICS TABLE ====================

CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model Information
  model TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'other')),

  -- Task Classification
  task_type TEXT NOT NULL CHECK (task_type IN (
    'general_chat', 'coding', 'analysis', 'reasoning',
    'creative', 'file_processing', 'function_calling', 'other'
  )),
  task_complexity TEXT CHECK (task_complexity IN ('simple', 'medium', 'complex')),

  -- Performance Metrics
  response_time_ms INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,

  -- Quality Metrics
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  user_rating INTEGER CHECK (user_rating >= -1 AND user_rating <= 1), -- -1 = thumbs down, 0 = no rating, 1 = thumbs up

  -- Context
  conversation_id TEXT,
  user_id UUID NOT NULL,
  message_id UUID,

  -- Additional Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign Key
  CONSTRAINT model_performance_metrics_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== INDEXES ====================

-- Primary query indexes
CREATE INDEX idx_model_perf_model ON model_performance_metrics(model);
CREATE INDEX idx_model_perf_provider ON model_performance_metrics(provider);
CREATE INDEX idx_model_perf_task_type ON model_performance_metrics(task_type);
CREATE INDEX idx_model_perf_timestamp ON model_performance_metrics(timestamp DESC);
CREATE INDEX idx_model_perf_user_id ON model_performance_metrics(user_id);

-- Composite indexes for common analytics queries
CREATE INDEX idx_model_perf_model_task ON model_performance_metrics(model, task_type);
CREATE INDEX idx_model_perf_model_time ON model_performance_metrics(model, timestamp DESC);
CREATE INDEX idx_model_perf_task_complexity ON model_performance_metrics(task_type, task_complexity);

-- Performance indexes
CREATE INDEX idx_model_perf_response_time ON model_performance_metrics(response_time_ms);
CREATE INDEX idx_model_perf_success ON model_performance_metrics(success) WHERE NOT success;
CREATE INDEX idx_model_perf_rating ON model_performance_metrics(user_rating) WHERE user_rating IS NOT NULL;

COMMENT ON TABLE model_performance_metrics IS 'Tracks AI model performance metrics for analytics and optimization';

-- ==================== ANALYTICS VIEWS ====================

-- View: Average response time by model
CREATE OR REPLACE VIEW model_avg_response_time AS
SELECT
  model,
  provider,
  COUNT(*) as total_calls,
  AVG(response_time_ms) as avg_response_ms,
  MIN(response_time_ms) as min_response_ms,
  MAX(response_time_ms) as max_response_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_response_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_ms
FROM model_performance_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND success = TRUE
GROUP BY model, provider
ORDER BY avg_response_ms ASC;

-- View: Success rate by model
CREATE OR REPLACE VIEW model_success_rate AS
SELECT
  model,
  provider,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_calls,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_percent
FROM model_performance_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY model, provider
ORDER BY success_rate_percent DESC;

-- View: User satisfaction by model
CREATE OR REPLACE VIEW model_user_satisfaction AS
SELECT
  model,
  provider,
  COUNT(*) FILTER (WHERE user_rating IS NOT NULL) as rated_calls,
  SUM(CASE WHEN user_rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
  SUM(CASE WHEN user_rating = -1 THEN 1 ELSE 0 END) as thumbs_down,
  ROUND(100.0 * SUM(CASE WHEN user_rating = 1 THEN 1 ELSE 0 END) /
    NULLIF(COUNT(*) FILTER (WHERE user_rating IS NOT NULL), 0), 2) as satisfaction_percent
FROM model_performance_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY model, provider
ORDER BY satisfaction_percent DESC NULLS LAST;

-- View: Best model by task type
CREATE OR REPLACE VIEW best_model_by_task AS
WITH ranked_models AS (
  SELECT
    task_type,
    model,
    provider,
    COUNT(*) as total_calls,
    AVG(response_time_ms) as avg_response_ms,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
    ROUND(100.0 * SUM(CASE WHEN user_rating = 1 THEN 1 ELSE 0 END) /
      NULLIF(COUNT(*) FILTER (WHERE user_rating IS NOT NULL), 0), 2) as satisfaction_rate,
    -- Composite score: 40% success rate + 40% satisfaction + 20% speed (inverted)
    (
      0.4 * (100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*)) +
      0.4 * COALESCE(
        100.0 * SUM(CASE WHEN user_rating = 1 THEN 1 ELSE 0 END) /
        NULLIF(COUNT(*) FILTER (WHERE user_rating IS NOT NULL), 0),
        50
      ) +
      0.2 * (100 - LEAST(100, AVG(response_time_ms) / 100))
    ) as composite_score,
    ROW_NUMBER() OVER (
      PARTITION BY task_type
      ORDER BY
        COUNT(*) DESC, -- Prefer models with more data
        (100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*)) DESC,
        AVG(response_time_ms) ASC
    ) as rank
  FROM model_performance_metrics
  WHERE timestamp >= NOW() - INTERVAL '30 days'
    AND success = TRUE
  GROUP BY task_type, model, provider
  HAVING COUNT(*) >= 5 -- Minimum 5 calls for statistical significance
)
SELECT
  task_type,
  model,
  provider,
  total_calls,
  avg_response_ms,
  success_rate,
  satisfaction_rate,
  ROUND(composite_score, 2) as quality_score
FROM ranked_models
WHERE rank = 1
ORDER BY task_type;

-- View: Token efficiency by model
CREATE OR REPLACE VIEW model_token_efficiency AS
SELECT
  model,
  provider,
  COUNT(*) as total_calls,
  AVG(tokens_used) as avg_tokens,
  AVG(CASE WHEN output_tokens > 0 THEN output_tokens::FLOAT / NULLIF(input_tokens, 0) ELSE NULL END) as avg_output_input_ratio,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens
FROM model_performance_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND success = TRUE
GROUP BY model, provider
ORDER BY avg_tokens ASC;

-- View: Performance trends over time (daily)
CREATE OR REPLACE VIEW model_performance_trends AS
SELECT
  DATE(timestamp) as date,
  model,
  provider,
  task_type,
  COUNT(*) as total_calls,
  AVG(response_time_ms) as avg_response_ms,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM model_performance_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp), model, provider, task_type
ORDER BY date DESC, model, task_type;

-- ==================== ANALYTICS FUNCTIONS ====================

-- Function: Get best model for task type
CREATE OR REPLACE FUNCTION get_best_model_for_task(
  p_task_type TEXT,
  p_priority TEXT DEFAULT 'balanced' -- 'speed', 'quality', 'cost', 'balanced'
)
RETURNS TABLE (
  model TEXT,
  provider TEXT,
  avg_response_ms NUMERIC,
  success_rate NUMERIC,
  satisfaction_rate NUMERIC,
  recommendation_reason TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH model_stats AS (
    SELECT
      mpm.model,
      mpm.provider,
      COUNT(*) as total_calls,
      AVG(mpm.response_time_ms) as avg_response_ms,
      ROUND(100.0 * SUM(CASE WHEN mpm.success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
      ROUND(100.0 * SUM(CASE WHEN mpm.user_rating = 1 THEN 1 ELSE 0 END) /
        NULLIF(COUNT(*) FILTER (WHERE mpm.user_rating IS NOT NULL), 0), 2) as satisfaction_rate
    FROM model_performance_metrics mpm
    WHERE mpm.task_type = p_task_type
      AND mpm.timestamp >= NOW() - INTERVAL '30 days'
      AND mpm.success = TRUE
    GROUP BY mpm.model, mpm.provider
    HAVING COUNT(*) >= 3
  )
  SELECT
    ms.model,
    ms.provider,
    ms.avg_response_ms,
    ms.success_rate,
    ms.satisfaction_rate,
    CASE
      WHEN p_priority = 'speed' THEN 'Fastest average response time'
      WHEN p_priority = 'quality' THEN 'Highest success and satisfaction rates'
      WHEN p_priority = 'balanced' THEN 'Best overall balance of speed, quality, and reliability'
      ELSE 'Recommended based on performance data'
    END as recommendation_reason
  FROM model_stats ms
  ORDER BY
    CASE
      WHEN p_priority = 'speed' THEN ms.avg_response_ms
      ELSE 999999
    END ASC,
    CASE
      WHEN p_priority = 'quality' THEN ms.success_rate
      WHEN p_priority = 'balanced' THEN (ms.success_rate * 0.4 + COALESCE(ms.satisfaction_rate, 50) * 0.4 + (100 - LEAST(100, ms.avg_response_ms / 100)) * 0.2)
      ELSE ms.success_rate
    END DESC
  LIMIT 1;
END;
$$;

-- Function: Get model performance summary
CREATE OR REPLACE FUNCTION get_model_performance_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  model TEXT,
  provider TEXT,
  total_calls BIGINT,
  avg_response_ms NUMERIC,
  success_rate NUMERIC,
  satisfaction_rate NUMERIC,
  avg_tokens NUMERIC,
  quality_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mpm.model,
    mpm.provider,
    COUNT(*) as total_calls,
    ROUND(AVG(mpm.response_time_ms), 2) as avg_response_ms,
    ROUND(100.0 * SUM(CASE WHEN mpm.success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
    ROUND(100.0 * SUM(CASE WHEN mpm.user_rating = 1 THEN 1 ELSE 0 END) /
      NULLIF(COUNT(*) FILTER (WHERE mpm.user_rating IS NOT NULL), 0), 2) as satisfaction_rate,
    ROUND(AVG(mpm.tokens_used), 2) as avg_tokens,
    ROUND(
      0.4 * (100.0 * SUM(CASE WHEN mpm.success THEN 1 ELSE 0 END) / COUNT(*)) +
      0.4 * COALESCE(
        100.0 * SUM(CASE WHEN mpm.user_rating = 1 THEN 1 ELSE 0 END) /
        NULLIF(COUNT(*) FILTER (WHERE mpm.user_rating IS NOT NULL), 0),
        50
      ) +
      0.2 * (100 - LEAST(100, AVG(mpm.response_time_ms) / 100))
    , 2) as quality_score
  FROM model_performance_metrics mpm
  WHERE mpm.timestamp >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY mpm.model, mpm.provider
  ORDER BY quality_score DESC;
END;
$$;

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE model_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own metrics and admins can see all
CREATE POLICY model_performance_metrics_user_policy ON model_performance_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');

-- Policy: System can insert metrics
CREATE POLICY model_performance_metrics_insert_policy ON model_performance_metrics
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Users can update their own ratings
CREATE POLICY model_performance_metrics_update_policy ON model_performance_metrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==================== CLEANUP ====================

-- Function: Clean up old performance data (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM model_performance_metrics
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION cleanup_old_performance_data IS 'Deletes performance metrics older than 90 days';

-- ==================== SAMPLE QUERIES ====================

-- Example: Get best model for coding tasks
-- SELECT * FROM get_best_model_for_task('coding', 'quality');

-- Example: Get performance summary
-- SELECT * FROM get_model_performance_summary(30);

-- Example: View all analytics
-- SELECT * FROM model_avg_response_time;
-- SELECT * FROM model_success_rate;
-- SELECT * FROM model_user_satisfaction;
-- SELECT * FROM best_model_by_task;
