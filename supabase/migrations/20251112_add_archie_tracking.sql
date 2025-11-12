-- Archie Enhanced Tracking System
-- Comprehensive database schema for tracking Archie runs, issues, and fixes

-- Table: archie_runs
-- Stores information about each Archie maintenance run
CREATE TABLE IF NOT EXISTS archie_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'cron', 'api')),

  -- Stats
  tasks_found INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_skipped INTEGER NOT NULL DEFAULT 0,
  tasks_failed INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  total_cost_usd DECIMAL(10, 6) DEFAULT 0.00,
  ai_model_used TEXT,

  -- Git info
  commit_hash TEXT,
  commit_message TEXT,

  -- Summary
  summary TEXT,
  errors JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  version TEXT,
  duration_seconds INTEGER,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: archie_issues
-- Stores each issue found during scans
CREATE TABLE IF NOT EXISTS archie_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES archie_runs(id) ON DELETE CASCADE,

  -- Issue identification
  fingerprint TEXT NOT NULL, -- Hash of file + issue type + description for deduplication
  type TEXT NOT NULL CHECK (type IN ('lint', 'dead_code', 'type_error', 'dependency', 'optimization', 'security', 'performance')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority INTEGER NOT NULL DEFAULT 5,

  -- Issue details
  file_path TEXT NOT NULL,
  line_number INTEGER,
  column_number INTEGER,
  issue_description TEXT NOT NULL,
  context TEXT, -- Code snippet around the issue

  -- Fix tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'fixing', 'fixed', 'failed', 'skipped')),
  fix_applied TEXT,
  fix_strategy TEXT, -- Which fixer was used

  -- Metadata
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  times_seen INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: archie_fix_attempts
-- Stores each attempt to fix an issue (for learning)
CREATE TABLE IF NOT EXISTS archie_fix_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES archie_issues(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES archie_runs(id) ON DELETE CASCADE,

  -- Attempt details
  attempt_number INTEGER NOT NULL DEFAULT 1,
  strategy TEXT NOT NULL, -- minimal, aggressive, last_resort, etc.
  ai_model_used TEXT,

  -- Results
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- AI details
  prompt_used TEXT,
  ai_reasoning TEXT, -- AI's explanation of what it tried to do
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),

  -- Code changes
  original_code TEXT,
  fixed_code TEXT,
  diff TEXT,

  -- Testing
  test_passed BOOLEAN,
  test_output TEXT,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: archie_metrics
-- Aggregate metrics for analytics dashboard
CREATE TABLE IF NOT EXISTS archie_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  -- Run stats
  total_runs INTEGER NOT NULL DEFAULT 0,
  successful_runs INTEGER NOT NULL DEFAULT 0,
  failed_runs INTEGER NOT NULL DEFAULT 0,

  -- Issue stats
  total_issues_found INTEGER NOT NULL DEFAULT 0,
  total_issues_fixed INTEGER NOT NULL DEFAULT 0,
  total_issues_failed INTEGER NOT NULL DEFAULT 0,

  -- By type
  lint_fixed INTEGER NOT NULL DEFAULT 0,
  dead_code_fixed INTEGER NOT NULL DEFAULT 0,
  type_errors_fixed INTEGER NOT NULL DEFAULT 0,
  dependencies_fixed INTEGER NOT NULL DEFAULT 0,
  optimizations_fixed INTEGER NOT NULL DEFAULT 0,
  security_fixed INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  total_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.00,
  avg_cost_per_fix_usd DECIMAL(10, 6),

  -- Success rates
  fix_success_rate DECIMAL(5, 2),
  avg_attempts_per_fix DECIMAL(5, 2),

  -- Timing
  avg_duration_seconds INTEGER,
  total_time_saved_hours DECIMAL(10, 2), -- Estimated developer time saved

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  UNIQUE(date)
);

-- Table: archie_learning
-- Stores patterns learned from successful/failed fixes
CREATE TABLE IF NOT EXISTS archie_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern identification
  issue_pattern TEXT NOT NULL, -- Regex or description of issue type
  file_pattern TEXT, -- Which files this applies to

  -- What works
  successful_strategy TEXT,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5, 2),

  -- Recommendations
  recommended_model TEXT,
  recommended_prompt_template TEXT,
  avoid_strategies TEXT[], -- Strategies that don't work for this pattern

  -- Examples
  example_issue_id UUID REFERENCES archie_issues(id),
  example_fix_attempt_id UUID REFERENCES archie_fix_attempts(id),

  -- Metadata
  last_successful_fix_at TIMESTAMP WITH TIME ZONE,
  confidence_score DECIMAL(5, 2), -- How confident we are in this learning

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  UNIQUE(issue_pattern, file_pattern)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_archie_runs_started_at ON archie_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_archie_runs_status ON archie_runs(status);
CREATE INDEX IF NOT EXISTS idx_archie_runs_trigger_type ON archie_runs(trigger_type);

CREATE INDEX IF NOT EXISTS idx_archie_issues_run_id ON archie_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_archie_issues_fingerprint ON archie_issues(fingerprint);
CREATE INDEX IF NOT EXISTS idx_archie_issues_type ON archie_issues(type);
CREATE INDEX IF NOT EXISTS idx_archie_issues_status ON archie_issues(status);
CREATE INDEX IF NOT EXISTS idx_archie_issues_severity ON archie_issues(severity);
CREATE INDEX IF NOT EXISTS idx_archie_issues_first_seen ON archie_issues(first_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_archie_fix_attempts_issue_id ON archie_fix_attempts(issue_id);
CREATE INDEX IF NOT EXISTS idx_archie_fix_attempts_run_id ON archie_fix_attempts(run_id);
CREATE INDEX IF NOT EXISTS idx_archie_fix_attempts_success ON archie_fix_attempts(success);

CREATE INDEX IF NOT EXISTS idx_archie_metrics_date ON archie_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_archie_learning_pattern ON archie_learning(issue_pattern);
CREATE INDEX IF NOT EXISTS idx_archie_learning_success_rate ON archie_learning(success_rate DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_archie_runs_updated_at BEFORE UPDATE ON archie_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archie_issues_updated_at BEFORE UPDATE ON archie_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archie_metrics_updated_at BEFORE UPDATE ON archie_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archie_learning_updated_at BEFORE UPDATE ON archie_learning
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE archie_runs IS 'Tracks each Archie maintenance run with stats and results';
COMMENT ON TABLE archie_issues IS 'Stores every issue found, with deduplication via fingerprint';
COMMENT ON TABLE archie_fix_attempts IS 'Logs each attempt to fix an issue for learning and debugging';
COMMENT ON TABLE archie_metrics IS 'Daily aggregate metrics for analytics dashboard';
COMMENT ON TABLE archie_learning IS 'Machine learning table - patterns discovered from successful fixes';
