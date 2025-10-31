-- ============================================================================
-- ARCHIE 2.0: AUTO-APPROVAL RULES
-- ============================================================================
-- This defines what Archie can do automatically vs. what needs human approval
-- Philosophy: "Don't make me think about tiny stuff, but ask before big changes"
-- ============================================================================

-- Auto-approval rules configuration
CREATE TABLE IF NOT EXISTS archie_auto_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule definition
  rule_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,  -- Same categories as proposals
  enabled BOOLEAN DEFAULT true,

  -- Conditions for auto-approval
  conditions JSONB NOT NULL,  -- {max_files: 3, max_lines_changed: 50, etc.}

  -- Safety limits
  max_files_affected INTEGER,
  max_lines_changed INTEGER,
  requires_tests BOOLEAN DEFAULT true,
  requires_rollback_plan BOOLEAN DEFAULT false,

  -- Risk level this applies to
  max_severity TEXT DEFAULT 'low' CHECK (max_severity IN ('low', 'medium', 'high', 'critical')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- ============================================================================
-- AUTO-APPROVE: Common sense improvements (no human needed)
-- ============================================================================

INSERT INTO archie_auto_approval_rules (rule_name, description, category, conditions, max_files_affected, max_lines_changed) VALUES

-- CODE CLEANUP (obvious improvements)
('remove_dead_code', 'Remove unused imports, variables, functions', 'code_cleanup',
  '{"patterns": ["unused imports", "dead code", "commented out code"], "risk": "minimal"}', 5, 50),

('fix_linting_errors', 'Auto-fix ESLint/Prettier violations', 'code_cleanup',
  '{"patterns": ["linting errors", "formatting"], "risk": "none"}', 10, 100),

('update_comments', 'Fix typos in comments, improve JSDoc', 'documentation',
  '{"patterns": ["comment typos", "jsdoc"], "risk": "none"}', 5, 20),

-- DEPENDENCIES (safe updates only)
('patch_dependency_updates', 'Update dependencies with PATCH versions only (1.2.3 → 1.2.4)', 'dependency',
  '{"version_change": "patch", "has_tests": true, "risk": "low"}', 1, 5),

-- PERFORMANCE (safe optimizations)
('add_missing_indexes', 'Add database indexes based on query patterns', 'performance',
  '{"table_size": "small", "index_type": "btree", "risk": "low"}', 3, 10),

('memoization_simple', 'Add React.memo to pure components', 'performance',
  '{"component_complexity": "low", "props_count": "<= 5", "risk": "low"}', 3, 15),

-- BUG FIXES (obvious, safe fixes)
('fix_obvious_type_errors', 'Fix TypeScript errors with obvious solutions', 'bug_fix',
  '{"error_type": "type_mismatch", "fix_confidence": "> 95%", "risk": "low"}', 3, 20),

('fix_null_checks', 'Add null/undefined checks where obviously missing', 'bug_fix',
  '{"pattern": "optional chaining", "risk": "low"}', 5, 30),

-- SECURITY (low-risk hardening)
('add_input_validation', 'Add basic input validation to API endpoints', 'security',
  '{"validation_type": "simple", "breaking_change": false, "risk": "low"}', 3, 40),

('sanitize_user_input', 'Add HTML/SQL sanitization to user inputs', 'security',
  '{"sanitization_type": "standard", "risk": "low"}', 5, 50);

-- ============================================================================
-- REQUIRE APPROVAL: Big changes (human review needed)
-- ============================================================================

INSERT INTO archie_auto_approval_rules (rule_name, description, category, conditions, enabled) VALUES

-- Mark as DISABLED = requires human approval
('major_refactoring', 'Large code refactoring affecting multiple files', 'refactor',
  '{"files_affected": "> 10", "requires_approval": true}', false),

('api_contract_changes', 'Changes to API endpoints or database schema', 'refactor',
  '{"breaking_change": true, "requires_approval": true}', false),

('major_dependency_updates', 'MAJOR or MINOR dependency version updates', 'dependency',
  '{"version_change": "major|minor", "requires_approval": true}', false),

('security_critical_fixes', 'Critical security vulnerabilities', 'security',
  '{"severity": "critical|high", "requires_approval": true}', false),

('performance_architectural', 'Major performance changes (caching layers, CDN, etc.)', 'performance',
  '{"architectural_change": true, "requires_approval": true}', false),

('database_migrations', 'Database schema changes or data migrations', 'refactor',
  '{"affects_data": true, "requires_approval": true}', false);

-- ============================================================================
-- HELPER FUNCTION: Check if proposal should auto-approve
-- ============================================================================

CREATE OR REPLACE FUNCTION should_auto_approve_proposal(
  p_category TEXT,
  p_severity TEXT,
  p_files_affected INTEGER,
  p_lines_changed INTEGER,
  p_has_tests BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  matching_rule RECORD;
BEGIN
  -- Emergency stop check
  IF (SELECT value::text FROM archie_state WHERE key = 'emergency_stop') = 'true' THEN
    RETURN false;
  END IF;

  -- Find matching auto-approval rule
  SELECT *
  INTO matching_rule
  FROM archie_auto_approval_rules
  WHERE enabled = true
    AND category = p_category
    AND (max_severity IS NULL OR p_severity::TEXT <= max_severity::TEXT)
    AND (max_files_affected IS NULL OR p_files_affected <= max_files_affected)
    AND (max_lines_changed IS NULL OR p_lines_changed <= max_lines_changed)
    AND (NOT requires_tests OR p_has_tests = true)
  LIMIT 1;

  RETURN matching_rule IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTO-APPROVAL TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_approve_proposals()
RETURNS TRIGGER AS $$
DECLARE
  should_approve BOOLEAN;
  files_count INTEGER;
  lines_count INTEGER;
BEGIN
  -- Only auto-approve new proposals
  IF NEW.status != 'proposed' THEN
    RETURN NEW;
  END IF;

  -- Extract metrics
  files_count := array_length(NEW.files_affected, 1);
  lines_count := COALESCE((NEW.metadata->>'lines_changed')::INTEGER, 999);

  -- Check auto-approval rules
  should_approve := should_auto_approve_proposal(
    NEW.category,
    NEW.severity,
    files_count,
    lines_count,
    COALESCE((NEW.metadata->>'has_tests')::BOOLEAN, false)
  );

  IF should_approve THEN
    NEW.status := 'approved';
    NEW.reviewed_by := 'archie-auto-approval';
    NEW.reviewed_at := NOW();
    NEW.metadata := jsonb_set(
      COALESCE(NEW.metadata, '{}'::jsonb),
      '{auto_approved}',
      'true'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_approve_on_insert
  BEFORE INSERT ON archie_proposals
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_proposals();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all auto-approval rules
SELECT
  rule_name,
  category,
  enabled,
  max_files_affected,
  max_lines_changed,
  description
FROM archie_auto_approval_rules
ORDER BY category, enabled DESC, rule_name;

-- Test the auto-approval function
SELECT should_auto_approve_proposal(
  'code_cleanup',  -- category
  'low',           -- severity
  3,               -- files affected
  30,              -- lines changed
  true             -- has tests
) as should_auto_approve;
