-- Autonomous Agent System Schema
-- Self-healing, self-optimizing agent that runs 24/7 in the cloud

-- Table: agent_tasks
-- Stores tasks the agent should work on
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Task details
  task_type TEXT NOT NULL CHECK (task_type IN (
    'monitor_errors',
    'optimize_performance',
    'fix_bugs',
    'run_tests',
    'analyze_logs',
    'security_scan',
    'dependency_update',
    'code_cleanup',
    'documentation_update'
  )),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),

  -- Task context
  title TEXT NOT NULL,
  description TEXT,
  file_paths TEXT[], -- Files to work on
  metadata JSONB DEFAULT '{}',

  -- Execution tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Results
  result TEXT,
  changes_made TEXT[],
  tests_passed BOOLEAN,
  error_message TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  recurrence TEXT, -- 'hourly', 'daily', 'weekly', etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'autonomous-agent'
);

-- Table: agent_findings
-- Issues, optimizations, and insights discovered by the agent
CREATE TABLE IF NOT EXISTS agent_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Finding details
  finding_type TEXT NOT NULL CHECK (finding_type IN (
    'error',
    'warning',
    'optimization',
    'security',
    'performance',
    'bug',
    'improvement',
    'insight'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),

  -- What was found
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT, -- File path or URL where found
  line_numbers INTEGER[],

  -- Context
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  detection_method TEXT, -- 'log_analysis', 'error_monitoring', 'code_scan', etc.
  evidence JSONB, -- Supporting data

  -- Resolution
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'fixed', 'wont_fix', 'false_positive')),
  resolution TEXT,
  fixed_at TIMESTAMPTZ,
  fixed_by TEXT,
  related_task_id UUID REFERENCES agent_tasks(id),

  -- Impact
  impact_score DECIMAL(3,2), -- 0.00 to 10.00
  affected_users INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: agent_logs
-- Technical logs with full details
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Log details
  log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
  category TEXT NOT NULL, -- 'monitoring', 'optimization', 'testing', 'deployment', etc.

  -- Content
  message TEXT NOT NULL,
  details JSONB,
  stack_trace TEXT,

  -- Context
  task_id UUID REFERENCES agent_tasks(id),
  finding_id UUID REFERENCES agent_findings(id),
  session_id TEXT, -- Group related logs

  -- Metadata
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'autonomous-agent',
  environment TEXT DEFAULT 'production'
);

-- Table: agent_reports
-- Executive summaries for humans
CREATE TABLE IF NOT EXISTS agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN (
    'daily_summary',
    'weekly_summary',
    'incident_report',
    'optimization_report',
    'health_check'
  )),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Summary statistics
  tasks_completed INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  tests_run INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,

  -- Key insights
  executive_summary TEXT NOT NULL,
  key_accomplishments TEXT[],
  critical_issues TEXT[],
  recommendations TEXT[],

  -- Detailed content
  full_report TEXT,
  metrics JSONB,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT DEFAULT 'autonomous-agent'
);

-- Table: agent_state
-- Persistent state for the agent
CREATE TABLE IF NOT EXISTS agent_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduled ON agent_tasks(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type ON agent_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_agent_findings_status ON agent_findings(status);
CREATE INDEX IF NOT EXISTS idx_agent_findings_severity ON agent_findings(severity);
CREATE INDEX IF NOT EXISTS idx_agent_findings_type ON agent_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_agent_findings_detected ON agent_findings(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_agent_logs_task ON agent_logs(task_id);

CREATE INDEX IF NOT EXISTS idx_agent_reports_generated ON agent_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_reports_type ON agent_reports(report_type);

-- Triggers
CREATE OR REPLACE FUNCTION update_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_updated_at();

CREATE TRIGGER agent_findings_updated_at
  BEFORE UPDATE ON agent_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_updated_at();

CREATE TRIGGER agent_state_updated_at
  BEFORE UPDATE ON agent_state
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_updated_at();

-- Initial state
INSERT INTO agent_state (key, value) VALUES
  ('agent_enabled', 'true'),
  ('last_health_check', to_jsonb(NOW())),
  ('total_tasks_completed', '0'),
  ('total_issues_fixed', '0')
ON CONFLICT (key) DO NOTHING;
