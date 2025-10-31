-- ============================================================================
-- ARCHIE 2.0 - COMPLETE REBOOT WITH HUMAN OVERSIGHT
-- ============================================================================
-- This migration:
-- 1. Clears ALL old Archie 1.0 data (failed experiment)
-- 2. Creates new Archie 2.0 schema with approval gates
-- 3. Implements safety rails and monitoring
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: CLEAN OUT OLD ARCHIE 1.0 DATA
-- ============================================================================

-- Archive old data for reference (don't just delete - we might learn from failures)
CREATE TABLE IF NOT EXISTS archie_1_0_archive (
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  table_name TEXT,
  row_count INTEGER,
  data_sample JSONB
);

-- Save summary of what we're removing
INSERT INTO archie_1_0_archive (table_name, row_count, data_sample)
SELECT
  'agent_tasks' as table_name,
  COUNT(*) as row_count,
  jsonb_agg(row_to_json(t)::jsonb) FILTER (WHERE id IN (
    SELECT id FROM agent_tasks ORDER BY created_at DESC LIMIT 5
  )) as data_sample
FROM agent_tasks;

INSERT INTO archie_1_0_archive (table_name, row_count, data_sample)
SELECT
  'agent_findings' as table_name,
  COUNT(*) as row_count,
  jsonb_agg(row_to_json(t)::jsonb) FILTER (WHERE id IN (
    SELECT id FROM agent_findings ORDER BY detected_at DESC LIMIT 5
  )) as data_sample
FROM agent_findings;

-- Now clear all old data
TRUNCATE TABLE agent_logs CASCADE;
TRUNCATE TABLE agent_reports CASCADE;
TRUNCATE TABLE agent_findings CASCADE;
TRUNCATE TABLE agent_tasks CASCADE;
DELETE FROM agent_state;

-- ============================================================================
-- PART 2: NEW ARCHIE 2.0 SCHEMA - WITH APPROVAL GATES
-- ============================================================================

-- 🔴 CRITICAL: Run history tracking
CREATE TABLE IF NOT EXISTS archie_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What ran
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'code_health_analyzer',  -- Read-only scanner
    'proposal_generator',    -- Creates improvement proposals
    'executor',              -- Executes approved changes
    'validator'              -- Post-deployment validation
  )),

  -- When & Duration
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timeout')),

  -- What it found/did
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),  -- Overall code health
  findings_count INTEGER DEFAULT 0,
  proposals_created INTEGER DEFAULT 0,
  changes_made INTEGER DEFAULT 0,

  -- Detailed results
  summary TEXT,
  findings JSONB,  -- Array of specific issues found
  metadata JSONB,
  error_message TEXT,

  -- Cost tracking (SAFETY)
  api_calls_made INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,

  -- Metadata
  triggered_by TEXT DEFAULT 'cron',  -- 'cron', 'manual', 'deployment'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🟢 APPROVAL QUEUE: The heart of Archie 2.0
CREATE TABLE IF NOT EXISTS archie_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  created_by_run_id UUID REFERENCES archie_runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- What needs to be done
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'bug_fix',           -- Fix broken functionality
    'performance',       -- Improve speed/efficiency
    'security',          -- Address security issues
    'refactor',          -- Code quality improvement
    'dependency',        -- Update dependencies
    'test_coverage',     -- Add/improve tests
    'documentation',     -- Improve docs
    'code_cleanup'       -- Remove dead code, etc.
  )),

  -- Priority (auto-calculated)
  priority_score INTEGER CHECK (priority_score BETWEEN 0 AND 100),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  estimated_effort TEXT CHECK (estimated_effort IN ('small', 'medium', 'large')),
  estimated_hours DECIMAL(4,1),

  -- What will change
  files_affected TEXT[],
  functions_affected TEXT[],
  implementation_plan JSONB,  -- Step-by-step plan
  risks JSONB,  -- Known risks
  rollback_plan TEXT,

  -- Approval workflow (HUMAN GATE)
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed',      -- Waiting for review
    'approved',      -- Human approved, ready to execute
    'in_progress',   -- Currently being executed
    'completed',     -- Successfully implemented
    'rejected',      -- Human rejected
    'failed'         -- Execution failed
  )),

  -- Human interaction
  reviewed_by TEXT,  -- User ID/name who approved/rejected
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Execution tracking
  executed_by_run_id UUID REFERENCES archie_runs(id),
  executed_at TIMESTAMPTZ,
  execution_duration_ms INTEGER,

  -- Results after execution
  tests_passed BOOLEAN,
  deployment_successful BOOLEAN,
  health_score_before INTEGER,
  health_score_after INTEGER,
  health_improvement INTEGER,
  actual_effort_hours DECIMAL(4,1),
  results JSONB,

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🛡️ SAFETY: Limits & Cost Controls
CREATE TABLE IF NOT EXISTS archie_safety_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What's being limited
  agent_type TEXT NOT NULL,
  limit_type TEXT NOT NULL CHECK (limit_type IN (
    'max_runs_per_hour',
    'max_runs_per_day',
    'max_cost_per_day_cents',
    'max_cost_per_week_cents',
    'max_proposals_per_day'
  )),

  -- The limit
  limit_value INTEGER NOT NULL,

  -- Current usage (resets automatically)
  current_value INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  reset_interval TEXT DEFAULT 'hourly' CHECK (reset_interval IN ('hourly', 'daily', 'weekly')),

  -- Actions when exceeded
  action_when_exceeded TEXT DEFAULT 'block' CHECK (action_when_exceeded IN ('block', 'warn', 'notify')),

  -- Metadata
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_type, limit_type)
);

-- 📊 CODE HEALTH: Track overall codebase health over time
CREATE TABLE IF NOT EXISTS archie_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- When measured
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  run_id UUID REFERENCES archie_runs(id),

  -- Overall score (0-100)
  health_score INTEGER NOT NULL CHECK (health_score BETWEEN 0 AND 100),

  -- Component scores
  test_coverage_percent DECIMAL(5,2),
  performance_score INTEGER,
  security_score INTEGER,
  code_quality_score INTEGER,
  dependency_health_score INTEGER,

  -- Issue counts
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  medium_issues INTEGER DEFAULT 0,
  low_issues INTEGER DEFAULT 0,

  -- Detailed breakdown
  issues_by_category JSONB,
  metrics JSONB,

  -- Trends
  score_change_24h INTEGER,
  score_change_7d INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📝 ARCHIE STATE: Persistent state between runs
CREATE TABLE IF NOT EXISTS archie_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- ============================================================================
-- PART 3: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Runs
CREATE INDEX IF NOT EXISTS idx_archie_runs_agent_type ON archie_runs(agent_type);
CREATE INDEX IF NOT EXISTS idx_archie_runs_started_at ON archie_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_archie_runs_status ON archie_runs(status);
CREATE INDEX IF NOT EXISTS idx_archie_runs_cost ON archie_runs(cost_cents DESC);

-- Proposals
CREATE INDEX IF NOT EXISTS idx_archie_proposals_status ON archie_proposals(status);
CREATE INDEX IF NOT EXISTS idx_archie_proposals_priority ON archie_proposals(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_archie_proposals_category ON archie_proposals(category);
CREATE INDEX IF NOT EXISTS idx_archie_proposals_created_at ON archie_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archie_proposals_reviewed_by ON archie_proposals(reviewed_by);

-- Health History
CREATE INDEX IF NOT EXISTS idx_archie_health_measured_at ON archie_health_history(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_archie_health_score ON archie_health_history(health_score);

-- ============================================================================
-- PART 4: TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_archie_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archie_proposals_updated_at
  BEFORE UPDATE ON archie_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_archie_updated_at();

CREATE TRIGGER archie_safety_limits_updated_at
  BEFORE UPDATE ON archie_safety_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_archie_updated_at();

CREATE TRIGGER archie_state_updated_at
  BEFORE UPDATE ON archie_state
  FOR EACH ROW
  EXECUTE FUNCTION update_archie_updated_at();

-- Auto-calculate health improvement when proposal completes
CREATE OR REPLACE FUNCTION calculate_health_improvement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.health_score_before IS NOT NULL AND NEW.health_score_after IS NOT NULL THEN
    NEW.health_improvement = NEW.health_score_after - NEW.health_score_before;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archie_proposals_health_improvement
  BEFORE UPDATE ON archie_proposals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_health_improvement();

-- ============================================================================
-- PART 5: INITIAL SAFETY LIMITS (CONSERVATIVE)
-- ============================================================================

INSERT INTO archie_safety_limits (agent_type, limit_type, limit_value, reset_interval) VALUES
  -- Code Health Analyzer (runs every 30 min)
  ('code_health_analyzer', 'max_runs_per_hour', 2, 'hourly'),
  ('code_health_analyzer', 'max_cost_per_day_cents', 500, 'daily'),  -- $5/day max

  -- Proposal Generator (runs on-demand)
  ('proposal_generator', 'max_runs_per_day', 10, 'daily'),
  ('proposal_generator', 'max_proposals_per_day', 20, 'daily'),
  ('proposal_generator', 'max_cost_per_day_cents', 300, 'daily'),  -- $3/day max

  -- Executor (only runs when approved)
  ('executor', 'max_runs_per_day', 5, 'daily'),
  ('executor', 'max_cost_per_day_cents', 1000, 'daily'),  -- $10/day max

  -- Validator (runs after deployments)
  ('validator', 'max_runs_per_day', 10, 'daily'),
  ('validator', 'max_cost_per_day_cents', 200, 'daily')  -- $2/day max
ON CONFLICT (agent_type, limit_type) DO NOTHING;

-- ============================================================================
-- PART 6: INITIAL ARCHIE STATE
-- ============================================================================

INSERT INTO archie_state (key, value, description) VALUES
  ('archie_enabled', 'true', 'Master switch for all Archie agents'),
  ('archie_version', '"2.0"', 'Current Archie version'),
  ('last_health_check', to_jsonb(NOW()), 'Last time health was checked'),
  ('total_proposals_created', '0', 'Total proposals generated'),
  ('total_proposals_approved', '0', 'Total proposals approved by humans'),
  ('total_improvements_deployed', '0', 'Total successful improvements'),
  ('average_health_score', '0', 'Rolling average code health score'),
  ('emergency_stop', 'false', 'Emergency kill switch')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'archie%'
ORDER BY table_name;

-- Check safety limits configured
SELECT agent_type, limit_type, limit_value, current_value
FROM archie_safety_limits
ORDER BY agent_type, limit_type;

-- Check initial state
SELECT key, value, description
FROM archie_state
ORDER BY key;

-- Show archive of old data
SELECT table_name, row_count, archived_at
FROM archie_1_0_archive
ORDER BY table_name;
