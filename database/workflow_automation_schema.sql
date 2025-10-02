-- Workflow Automation Database Schema
-- Complete schema for pattern recognition, workflow automation, and execution tracking

-- ===========================================
-- User Behavior Patterns and Learning
-- ===========================================

-- Table for storing user behavior patterns detected by the pattern recognition engine
CREATE TABLE user_behavior_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'sequential_actions', 'temporal_routine', 'conditional_behavior',
    'context_triggered', 'repetitive_task', 'workflow_sequence',
    'preference_pattern', 'efficiency_pattern', 'collaboration_pattern',
    'adaptive_behavior'
  )),
  name TEXT NOT NULL,
  description TEXT,

  -- Pattern triggers and actions (stored as JSONB for flexibility)
  triggers JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  context JSONB NOT NULL DEFAULT '{}',

  -- Learning metrics
  confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  frequency INTEGER NOT NULL DEFAULT 0,
  last_observed TIMESTAMP WITH TIME ZONE,
  first_observed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 0,

  -- Automation potential
  automation_score REAL NOT NULL DEFAULT 0.0 CHECK (automation_score >= 0.0 AND automation_score <= 1.0),
  automation_complexity TEXT NOT NULL DEFAULT 'medium' CHECK (automation_complexity IN ('low', 'medium', 'high')),
  automation_risk TEXT NOT NULL DEFAULT 'medium' CHECK (automation_risk IN ('low', 'medium', 'high')),

  -- Temporal patterns
  temporal_signature JSONB NOT NULL DEFAULT '{}',

  -- Associated patterns
  related_patterns TEXT[] DEFAULT '{}',
  predecessor_patterns TEXT[] DEFAULT '{}',
  successor_patterns TEXT[] DEFAULT '{}',

  -- Metadata and timestamps
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for pattern queries
CREATE INDEX idx_user_behavior_patterns_user_id ON user_behavior_patterns(user_id);
CREATE INDEX idx_user_behavior_patterns_type ON user_behavior_patterns(pattern_type);
CREATE INDEX idx_user_behavior_patterns_automation_score ON user_behavior_patterns(automation_score);
CREATE INDEX idx_user_behavior_patterns_confidence ON user_behavior_patterns(confidence);
CREATE INDEX idx_user_behavior_patterns_last_observed ON user_behavior_patterns(last_observed);
CREATE INDEX idx_user_behavior_patterns_triggers_gin ON user_behavior_patterns USING GIN(triggers);
CREATE INDEX idx_user_behavior_patterns_context_gin ON user_behavior_patterns USING GIN(context);

-- Table for storing individual user interactions for pattern learning
CREATE TABLE user_interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Interaction details
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  parameters JSONB NOT NULL DEFAULT '{}',

  -- Environment
  device TEXT,
  location TEXT,
  time_of_day TIME,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- Outcomes
  success BOOLEAN NOT NULL DEFAULT true,
  duration INTEGER, -- milliseconds
  next_action_id TEXT REFERENCES user_interactions(id),

  -- User state
  user_state JSONB DEFAULT '{}',

  -- Metadata
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for interaction queries
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_timestamp ON user_interactions(timestamp);
CREATE INDEX idx_user_interactions_service ON user_interactions(service);
CREATE INDEX idx_user_interactions_action ON user_interactions(action);
CREATE INDEX idx_user_interactions_day_of_week ON user_interactions(day_of_week);
CREATE INDEX idx_user_interactions_context_gin ON user_interactions USING GIN(context);
CREATE INDEX idx_user_interactions_session_id ON user_interactions(session_id);

-- ===========================================
-- Workflow Definitions and Templates
-- ===========================================

-- Main workflows table
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,

  -- Workflow definition
  triggers JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  conditions JSONB NOT NULL DEFAULT '[]',

  -- Configuration
  settings JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Status and lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'disabled', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_executed TIMESTAMP WITH TIME ZONE,

  -- Performance metrics
  execution_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  average_execution_time INTEGER NOT NULL DEFAULT 0,
  error_rate REAL NOT NULL DEFAULT 0.0,

  -- Learning and optimization
  learning_enabled BOOLEAN NOT NULL DEFAULT true,
  optimization_score REAL NOT NULL DEFAULT 0.0,
  adaptations JSONB NOT NULL DEFAULT '[]'
);

-- Indexes for workflow queries
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);
CREATE INDEX idx_workflows_last_executed ON workflows(last_executed);
CREATE INDEX idx_workflows_triggers_gin ON workflows USING GIN(triggers);
CREATE INDEX idx_workflows_steps_gin ON workflows USING GIN(steps);

-- Workflow templates for reusable workflow patterns
CREATE TABLE workflow_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  complexity TEXT NOT NULL DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
  estimated_time INTEGER NOT NULL DEFAULT 0, -- seconds

  -- Template definition
  template JSONB NOT NULL,

  -- Usage and rating
  usage_count INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),

  -- Metadata
  author TEXT NOT NULL,
  documentation TEXT,
  prerequisites TEXT[] DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for template queries
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_complexity ON workflow_templates(complexity);
CREATE INDEX idx_workflow_templates_rating ON workflow_templates(rating);
CREATE INDEX idx_workflow_templates_usage_count ON workflow_templates(usage_count);
CREATE INDEX idx_workflow_templates_tags_gin ON workflow_templates USING GIN(tags);

-- ===========================================
-- Workflow Execution and Runtime
-- ===========================================

-- Workflow executions table
CREATE TABLE workflow_executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Execution details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'waiting', 'paused', 'completed', 'failed', 'cancelled', 'timeout'
  )),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- milliseconds

  -- Trigger information
  trigger_id TEXT NOT NULL,
  trigger_data JSONB NOT NULL DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{}',

  -- Step execution details
  steps JSONB NOT NULL DEFAULT '[]',
  current_step TEXT,

  -- Results and outputs
  outputs JSONB NOT NULL DEFAULT '{}',
  errors JSONB NOT NULL DEFAULT '[]',
  warnings JSONB NOT NULL DEFAULT '[]',

  -- Performance metrics
  performance_metrics JSONB NOT NULL DEFAULT '{}',

  -- Approval tracking
  approvals JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for execution queries
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_start_time ON workflow_executions(start_time);
CREATE INDEX idx_workflow_executions_trigger_id ON workflow_executions(trigger_id);
CREATE INDEX idx_workflow_executions_current_step ON workflow_executions(current_step);

-- Individual step executions for detailed tracking
CREATE TABLE step_executions (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,

  -- Step execution details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'skipped', 'timeout'
  )),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- milliseconds

  -- Input/output data
  inputs JSONB NOT NULL DEFAULT '{}',
  outputs JSONB NOT NULL DEFAULT '{}',

  -- Error handling
  error JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Logs
  logs JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for step execution queries
CREATE INDEX idx_step_executions_execution_id ON step_executions(execution_id);
CREATE INDEX idx_step_executions_step_id ON step_executions(step_id);
CREATE INDEX idx_step_executions_status ON step_executions(status);
CREATE INDEX idx_step_executions_start_time ON step_executions(start_time);

-- ===========================================
-- Approval and Safety Systems
-- ===========================================

-- Approval requests for workflows requiring human approval
CREATE TABLE approval_requests (
  id TEXT PRIMARY KEY,
  workflow_execution_id TEXT NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,

  -- Request details
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  required_by TIMESTAMP WITH TIME ZONE,
  approvers TEXT[] NOT NULL,

  -- Status and response
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'timeout')),
  response JSONB,

  -- Request data
  approval_type TEXT NOT NULL DEFAULT 'manual',
  request_data JSONB NOT NULL DEFAULT '{}',
  approval_context JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for approval queries
CREATE INDEX idx_approval_requests_execution_id ON approval_requests(workflow_execution_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_approvers_gin ON approval_requests USING GIN(approvers);
CREATE INDEX idx_approval_requests_requested_at ON approval_requests(requested_at);

-- Individual approval responses
CREATE TABLE approval_responses (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,

  -- Response details
  approver_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  comments TEXT,
  conditions JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for approval response queries
CREATE INDEX idx_approval_responses_request_id ON approval_responses(approval_request_id);
CREATE INDEX idx_approval_responses_approver_id ON approval_responses(approver_id);
CREATE INDEX idx_approval_responses_decision ON approval_responses(decision);

-- Safety rules and constraints
CREATE TABLE safety_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Rule configuration
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'operation_limit', 'approval_required', 'time_restriction',
    'resource_limit', 'data_protection', 'custom'
  )),
  conditions JSONB NOT NULL DEFAULT '{}',
  constraints JSONB NOT NULL DEFAULT '{}',

  -- Status and priority
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 5,

  -- Enforcement
  enforcement_level TEXT NOT NULL DEFAULT 'strict' CHECK (enforcement_level IN ('advisory', 'strict', 'blocking')),
  violation_action TEXT NOT NULL DEFAULT 'block' CHECK (violation_action IN ('log', 'warn', 'block', 'escalate')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for safety rules
CREATE INDEX idx_safety_rules_user_id ON safety_rules(user_id);
CREATE INDEX idx_safety_rules_enabled ON safety_rules(enabled);
CREATE INDEX idx_safety_rules_rule_type ON safety_rules(rule_type);
CREATE INDEX idx_safety_rules_priority ON safety_rules(priority);

-- Safety rule violations log
CREATE TABLE safety_violations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rule_id TEXT NOT NULL REFERENCES safety_rules(id),
  execution_id TEXT REFERENCES workflow_executions(id),

  -- Violation details
  violation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Context
  violation_context JSONB NOT NULL DEFAULT '{}',
  attempted_action JSONB NOT NULL DEFAULT '{}',

  -- Resolution
  action_taken TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for violations
CREATE INDEX idx_safety_violations_user_id ON safety_violations(user_id);
CREATE INDEX idx_safety_violations_rule_id ON safety_violations(rule_id);
CREATE INDEX idx_safety_violations_severity ON safety_violations(severity);
CREATE INDEX idx_safety_violations_resolved ON safety_violations(resolved);
CREATE INDEX idx_safety_violations_created_at ON safety_violations(created_at);

-- ===========================================
-- Automation Suggestions and Recommendations
-- ===========================================

-- AI-generated automation suggestions
CREATE TABLE automation_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Suggestion details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  category TEXT NOT NULL CHECK (category IN ('time_saving', 'efficiency', 'accuracy', 'consistency')),

  -- Benefits and complexity
  expected_benefit TEXT NOT NULL,
  complexity TEXT NOT NULL CHECK (complexity IN ('low', 'medium', 'high')),
  estimated_setup_time INTEGER NOT NULL DEFAULT 0, -- seconds

  -- Suggested workflow
  suggested_workflow JSONB NOT NULL,
  based_on_pattern TEXT REFERENCES user_behavior_patterns(id),

  -- Requirements and risks
  prerequisites TEXT[] DEFAULT '{}',
  risk_factors TEXT[] DEFAULT '{}',

  -- Status and feedback
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
  user_feedback JSONB DEFAULT '{}',
  implementation_id TEXT REFERENCES workflows(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for suggestions
CREATE INDEX idx_automation_suggestions_user_id ON automation_suggestions(user_id);
CREATE INDEX idx_automation_suggestions_confidence ON automation_suggestions(confidence);
CREATE INDEX idx_automation_suggestions_category ON automation_suggestions(category);
CREATE INDEX idx_automation_suggestions_status ON automation_suggestions(status);
CREATE INDEX idx_automation_suggestions_based_on_pattern ON automation_suggestions(based_on_pattern);

-- ===========================================
-- Integration and Service Connections
-- ===========================================

-- Service integration configurations
CREATE TABLE service_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service_name TEXT NOT NULL,

  -- Integration details
  integration_type TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  credentials JSONB NOT NULL DEFAULT '{}', -- Encrypted credentials

  -- Status and health
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'disconnected')),
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status JSONB DEFAULT '{}',

  -- Usage tracking
  api_calls_today INTEGER NOT NULL DEFAULT 0,
  api_calls_month INTEGER NOT NULL DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,

  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for integrations
CREATE INDEX idx_service_integrations_user_id ON service_integrations(user_id);
CREATE INDEX idx_service_integrations_service_name ON service_integrations(service_name);
CREATE INDEX idx_service_integrations_status ON service_integrations(status);

-- ===========================================
-- Analytics and Performance Tracking
-- ===========================================

-- Workflow performance analytics
CREATE TABLE workflow_analytics (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Execution statistics
  total_executions INTEGER NOT NULL DEFAULT 0,
  successful_executions INTEGER NOT NULL DEFAULT 0,
  failed_executions INTEGER NOT NULL DEFAULT 0,
  average_duration INTEGER NOT NULL DEFAULT 0, -- milliseconds

  -- Performance metrics
  success_rate REAL NOT NULL DEFAULT 0.0,
  efficiency_score REAL NOT NULL DEFAULT 0.0,
  optimization_opportunities TEXT[] DEFAULT '{}',

  -- Resource usage
  api_calls_made INTEGER NOT NULL DEFAULT 0,
  data_processed INTEGER NOT NULL DEFAULT 0, -- bytes
  compute_time INTEGER NOT NULL DEFAULT 0, -- milliseconds

  -- User satisfaction
  user_feedback_score REAL DEFAULT 0.0,
  adoption_score REAL DEFAULT 0.0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_workflow_analytics_workflow_id ON workflow_analytics(workflow_id);
CREATE INDEX idx_workflow_analytics_user_id ON workflow_analytics(user_id);
CREATE INDEX idx_workflow_analytics_period ON workflow_analytics(period_start, period_end);

-- System-wide automation metrics
CREATE TABLE automation_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Overall automation statistics
  total_workflows INTEGER NOT NULL DEFAULT 0,
  active_workflows INTEGER NOT NULL DEFAULT 0,
  total_executions INTEGER NOT NULL DEFAULT 0,
  time_saved INTEGER NOT NULL DEFAULT 0, -- seconds

  -- Pattern recognition metrics
  patterns_detected INTEGER NOT NULL DEFAULT 0,
  automation_opportunities INTEGER NOT NULL DEFAULT 0,
  suggestions_accepted INTEGER NOT NULL DEFAULT 0,

  -- Learning effectiveness
  pattern_accuracy REAL DEFAULT 0.0,
  prediction_accuracy REAL DEFAULT 0.0,
  adaptation_rate REAL DEFAULT 0.0,

  -- User engagement
  daily_active_workflows REAL DEFAULT 0.0,
  user_satisfaction_score REAL DEFAULT 0.0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for automation metrics
CREATE INDEX idx_automation_metrics_user_id ON automation_metrics(user_id);
CREATE INDEX idx_automation_metrics_period ON automation_metrics(period_start, period_end);

-- ===========================================
-- Triggers and Functions
-- ===========================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_user_behavior_patterns_updated_at BEFORE UPDATE ON user_behavior_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON workflow_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_rules_updated_at BEFORE UPDATE ON safety_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_suggestions_updated_at BEFORE UPDATE ON automation_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_integrations_updated_at BEFORE UPDATE ON service_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old execution data
CREATE OR REPLACE FUNCTION cleanup_old_executions()
RETURNS void AS $$
BEGIN
    -- Delete executions older than 90 days
    DELETE FROM workflow_executions
    WHERE start_time < NOW() - INTERVAL '90 days'
    AND status IN ('completed', 'failed', 'cancelled');

    -- Delete old interactions older than 6 months
    DELETE FROM user_interactions
    WHERE timestamp < NOW() - INTERVAL '6 months';

    -- Delete resolved violations older than 1 year
    DELETE FROM safety_violations
    WHERE resolved = true
    AND resolved_at < NOW() - INTERVAL '1 year';
END;
$$ language 'plpgsql';

-- ===========================================
-- Views for Common Queries
-- ===========================================

-- View for active workflows with recent execution data
CREATE VIEW active_workflows_summary AS
SELECT
    w.id,
    w.user_id,
    w.name,
    w.description,
    w.status,
    w.execution_count,
    w.success_count,
    w.error_rate,
    w.last_executed,
    COUNT(we.id) FILTER (WHERE we.start_time > NOW() - INTERVAL '30 days') as executions_last_30_days,
    AVG(we.duration) FILTER (WHERE we.start_time > NOW() - INTERVAL '30 days') as avg_duration_last_30_days
FROM workflows w
LEFT JOIN workflow_executions we ON w.id = we.workflow_id
WHERE w.status = 'active'
GROUP BY w.id, w.user_id, w.name, w.description, w.status, w.execution_count, w.success_count, w.error_rate, w.last_executed;

-- View for automation opportunities based on patterns
CREATE VIEW automation_opportunities AS
SELECT
    p.id,
    p.user_id,
    p.name,
    p.pattern_type,
    p.automation_score,
    p.automation_complexity,
    p.confidence,
    p.frequency,
    CASE
        WHEN p.automation_score >= 0.8 AND p.confidence >= 0.8 THEN 'high'
        WHEN p.automation_score >= 0.6 AND p.confidence >= 0.6 THEN 'medium'
        ELSE 'low'
    END as opportunity_level,
    p.last_observed
FROM user_behavior_patterns p
WHERE p.automation_score > 0.4
AND p.frequency >= 3
ORDER BY p.automation_score DESC, p.confidence DESC;

-- View for workflow execution summary
CREATE VIEW workflow_execution_summary AS
SELECT
    we.workflow_id,
    w.name as workflow_name,
    we.user_id,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE we.status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE we.status = 'failed') as failed_executions,
    AVG(we.duration) as avg_duration,
    MAX(we.start_time) as last_execution,
    COUNT(*) FILTER (WHERE we.start_time > NOW() - INTERVAL '7 days') as executions_last_week
FROM workflow_executions we
JOIN workflows w ON we.workflow_id = w.id
WHERE we.start_time > NOW() - INTERVAL '90 days'
GROUP BY we.workflow_id, w.name, we.user_id;

-- ===========================================
-- Initial Data and Templates
-- ===========================================

-- Insert default workflow templates
INSERT INTO workflow_templates (id, name, description, category, tags, complexity, template, author, documentation) VALUES
('template_email_filing', 'Email Auto-Filing', 'Automatically file emails based on sender and content', 'email', ARRAY['gmail', 'organization', 'automation'], 'low',
 '{"triggers": [{"type": "email", "config": {"filters": {}}}], "steps": [{"type": "action", "config": {"service": "gmail", "operation": "add_label"}}]}',
 'system', 'Automatically files incoming emails into appropriate labels based on sender and content analysis'),

('template_meeting_prep', 'Meeting Preparation', 'Automatically prepare for upcoming meetings', 'productivity', ARRAY['calendar', 'drive', 'preparation'], 'medium',
 '{"triggers": [{"type": "schedule", "config": {"cron": "0 8 * * 1-5"}}], "steps": [{"type": "action", "config": {"service": "calendar", "operation": "get_events"}}, {"type": "action", "config": {"service": "drive", "operation": "find_related_files"}}]}',
 'system', 'Gathers relevant files and information for upcoming meetings'),

('template_daily_summary', 'Daily Activity Summary', 'Generate daily summary of activities and tasks', 'reporting', ARRAY['analytics', 'summary', 'daily'], 'low',
 '{"triggers": [{"type": "schedule", "config": {"cron": "0 18 * * 1-5"}}], "steps": [{"type": "ai_analysis", "config": {"analysisType": "summary"}}, {"type": "notification", "config": {"channels": ["email"]}}]}',
 'system', 'Creates a daily summary of activities, completed tasks, and upcoming priorities');

-- Insert default safety rules
INSERT INTO safety_rules (id, user_id, name, description, rule_type, conditions, constraints, enforcement_level) VALUES
('safety_no_delete_important', 'system', 'Prevent Important File Deletion', 'Require approval for deleting important files', 'approval_required',
 '{"operations": ["delete"], "file_types": ["document", "spreadsheet", "presentation"]}',
 '{"approval_required": true, "approvers": ["user"]}', 'strict'),

('safety_rate_limit_api', 'system', 'API Rate Limiting', 'Limit API calls per hour', 'operation_limit',
 '{"operation_type": "api_call"}',
 '{"max_calls_per_hour": 100, "max_calls_per_day": 1000}', 'strict'),

('safety_work_hours_only', 'system', 'Work Hours Only', 'Restrict certain operations to work hours', 'time_restriction',
 '{"operations": ["send_email", "create_meeting"]}',
 '{"allowed_hours": "09:00-17:00", "allowed_days": [1,2,3,4,5]}', 'advisory');

-- Create function to generate sample data for testing
CREATE OR REPLACE FUNCTION generate_sample_workflow_data(sample_user_id TEXT)
RETURNS void AS $$
BEGIN
    -- Insert sample workflow
    INSERT INTO workflows (id, user_id, name, description, triggers, steps, status) VALUES
    ('sample_workflow_1', sample_user_id, 'Email Notification Workflow', 'Send notifications for important emails',
     '[{"type": "email", "config": {"filters": {"subject_contains": "urgent"}}}]',
     '[{"type": "notification", "config": {"message": "Urgent email received", "channels": ["in_app"]}}]',
     'active');

    -- Insert sample pattern
    INSERT INTO user_behavior_patterns (id, user_id, pattern_type, name, description, confidence, automation_score) VALUES
    ('sample_pattern_1', sample_user_id, 'repetitive_task', 'Daily Email Check', 'User checks email every morning at 9 AM',
     0.85, 0.7);

    -- Insert sample interaction
    INSERT INTO user_interactions (id, user_id, service, action, day_of_week) VALUES
    ('sample_interaction_1', sample_user_id, 'gmail', 'check_inbox', 1);
END;
$$ language 'plpgsql';

-- Comments for documentation
COMMENT ON TABLE user_behavior_patterns IS 'Stores detected user behavior patterns for automation opportunities';
COMMENT ON TABLE workflows IS 'Main workflow definitions with steps and configuration';
COMMENT ON TABLE workflow_executions IS 'Runtime execution instances of workflows';
COMMENT ON TABLE approval_requests IS 'Human approval requests for sensitive workflow actions';
COMMENT ON TABLE safety_rules IS 'Safety constraints and rules for workflow execution';
COMMENT ON TABLE automation_suggestions IS 'AI-generated suggestions for workflow automation';

-- Create a maintenance procedure
CREATE OR REPLACE FUNCTION maintain_workflow_automation_system()
RETURNS void AS $$
BEGIN
    -- Clean up old data
    PERFORM cleanup_old_executions();

    -- Update workflow statistics
    UPDATE workflows
    SET error_rate = (
        SELECT COALESCE(
            COUNT(*) FILTER (WHERE status = 'failed')::REAL / NULLIF(COUNT(*)::REAL, 0),
            0
        )
        FROM workflow_executions
        WHERE workflow_id = workflows.id
        AND start_time > NOW() - INTERVAL '30 days'
    );

    -- Reset daily API call counters (run this daily)
    UPDATE service_integrations
    SET api_calls_today = 0
    WHERE DATE(updated_at) < CURRENT_DATE;

    -- Archive old completed executions
    UPDATE workflow_executions
    SET status = 'archived'
    WHERE status = 'completed'
    AND start_time < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- Schedule maintenance (this would typically be done via cron or a job scheduler)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-workflow-data', '0 2 * * *', 'SELECT maintain_workflow_automation_system();');