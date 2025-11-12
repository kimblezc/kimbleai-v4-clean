/**
 * TypeScript type definitions for Archie Enhanced Tracking System
 */

// ============================================================================
// Core Types
// ============================================================================

export type IssueType = 'lint' | 'dead_code' | 'type_error' | 'dependency' | 'optimization' | 'security' | 'performance';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'pending' | 'fixing' | 'fixed' | 'failed' | 'skipped';
export type RunStatus = 'running' | 'completed' | 'failed';
export type TriggerType = 'manual' | 'cron' | 'api';
export type FixStrategy = 'minimal' | 'aggressive' | 'last_resort' | 'specialized' | 'learned';

// ============================================================================
// Database Models
// ============================================================================

export interface ArchieRun {
  id: string;
  started_at: Date;
  completed_at?: Date;
  status: RunStatus;
  trigger_type: TriggerType;

  // Stats
  tasks_found: number;
  tasks_completed: number;
  tasks_skipped: number;
  tasks_failed: number;

  // Cost tracking
  total_cost_usd: number;
  ai_model_used?: string;

  // Git info
  commit_hash?: string;
  commit_message?: string;

  // Summary
  summary: string;
  errors: string[];

  // Metadata
  version?: string;
  duration_seconds?: number;

  created_at: Date;
  updated_at: Date;
}

export interface ArchieIssue {
  id: string;
  run_id: string;

  // Issue identification
  fingerprint: string;
  type: IssueType;
  severity: IssueSeverity;
  priority: number;

  // Issue details
  file_path: string;
  line_number?: number;
  column_number?: number;
  issue_description: string;
  context?: string;

  // Fix tracking
  status: IssueStatus;
  fix_applied?: string;
  fix_strategy?: string;

  // Metadata
  first_seen_at: Date;
  last_seen_at: Date;
  times_seen: number;

  created_at: Date;
  updated_at: Date;
}

export interface ArchieFixAttempt {
  id: string;
  issue_id: string;
  run_id: string;

  // Attempt details
  attempt_number: number;
  strategy: FixStrategy;
  ai_model_used?: string;

  // Results
  success: boolean;
  error_message?: string;

  // AI details
  prompt_used?: string;
  ai_reasoning?: string;
  tokens_used?: number;
  cost_usd?: number;

  // Code changes
  original_code?: string;
  fixed_code?: string;
  diff?: string;

  // Testing
  test_passed?: boolean;
  test_output?: string;

  // Timing
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;

  created_at: Date;
}

export interface ArchieMetrics {
  id: string;
  date: Date;

  // Run stats
  total_runs: number;
  successful_runs: number;
  failed_runs: number;

  // Issue stats
  total_issues_found: number;
  total_issues_fixed: number;
  total_issues_failed: number;

  // By type
  lint_fixed: number;
  dead_code_fixed: number;
  type_errors_fixed: number;
  dependencies_fixed: number;
  optimizations_fixed: number;
  security_fixed: number;

  // Cost tracking
  total_cost_usd: number;
  avg_cost_per_fix_usd?: number;

  // Success rates
  fix_success_rate?: number;
  avg_attempts_per_fix?: number;

  // Timing
  avg_duration_seconds?: number;
  total_time_saved_hours?: number;

  created_at: Date;
  updated_at: Date;
}

export interface ArchieLearning {
  id: string;

  // Pattern identification
  issue_pattern: string;
  file_pattern?: string;

  // What works
  successful_strategy: string;
  success_count: number;
  failure_count: number;
  success_rate?: number;

  // Recommendations
  recommended_model?: string;
  recommended_prompt_template?: string;
  avoid_strategies?: string[];

  // Examples
  example_issue_id?: string;
  example_fix_attempt_id?: string;

  // Metadata
  last_successful_fix_at?: Date;
  confidence_score?: number;

  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Runtime Types (not in database)
// ============================================================================

export interface ImprovementTask {
  type: IssueType;
  file: string;
  issue: string;
  fix?: string;
  priority: number;
  severity?: IssueSeverity;
  lineNumber?: number;
  columnNumber?: number;
  context?: string;
  fingerprint?: string;
}

export interface EnhancedArchieRun {
  timestamp: Date;
  runId: string;
  tasksFound: number;
  tasksCompleted: number;
  tasksSkipped: number;
  tasksFailed: number;
  improvements: ImprovementTask[];
  fixAttempts: FixAttemptResult[];
  errors: string[];
  commitHash?: string;
  summary: string;
  totalCost: number;
  duration: number;
}

export interface FixAttemptResult {
  issueId: string;
  attemptNumber: number;
  strategy: FixStrategy;
  model?: string;
  success: boolean;
  reasoning?: string;
  cost?: number;
  duration?: number;
  error?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ArchieRunResponse {
  success: boolean;
  run?: ArchieRun;
  issues?: ArchieIssue[];
  fixAttempts?: ArchieFixAttempt[];
  error?: string;
}

export interface ArchieIssuesResponse {
  success: boolean;
  issues: ArchieIssue[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArchieMetricsResponse {
  success: boolean;
  metrics: ArchieMetrics[];
  summary: {
    totalRuns: number;
    totalIssuesFixed: number;
    totalCost: number;
    avgSuccessRate: number;
    topIssueTypes: Array<{ type: string; count: number }>;
  };
}

export interface ArchieDashboardData {
  recentRuns: ArchieRun[];
  topIssues: Array<ArchieIssue & { attempts: ArchieFixAttempt[] }>;
  metrics: ArchieMetrics;
  learnings: ArchieLearning[];
  costBreakdown: {
    byModel: Record<string, number>;
    byIssueType: Record<string, number>;
    total: number;
  };
  successRates: {
    byType: Record<string, number>;
    byStrategy: Record<string, number>;
    overall: number;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ArchieConfig {
  // Limits
  maxTasksPerRun: number;
  maxRetries: number;
  maxAICost: number;

  // AI Models
  models: {
    cheap: string;      // For simple fixes
    standard: string;   // For complex fixes
    premium: string;    // For last resort
  };

  // Cost tracking
  pricing: Record<string, { input: number; output: number }>;

  // Issue classification
  severityRules: Array<{
    type: IssueType;
    pattern?: RegExp;
    severity: IssueSeverity;
    priority: number;
  }>;

  // Specialized fixers
  enableSpecializedFixers: boolean;
  enableLearning: boolean;
  enableCostOptimization: boolean;
}

// ============================================================================
// Specialized Fixer Types
// ============================================================================

export interface SpecializedFixer {
  name: string;
  canFix: (issue: ImprovementTask) => boolean;
  fix: (issue: ImprovementTask) => Promise<FixResult>;
  priority: number;
}

export interface FixResult {
  success: boolean;
  fixedCode?: string;
  reasoning?: string;
  cost?: number;
  model?: string;
  error?: string;
}

// ============================================================================
// Learning System Types
// ============================================================================

export interface IssuePattern {
  pattern: string;
  regex?: RegExp;
  filePattern?: string;
  exampleIssues: string[];
}

export interface LearnedStrategy {
  pattern: IssuePattern;
  strategy: FixStrategy;
  model: string;
  promptTemplate: string;
  successRate: number;
  examples: Array<{
    issueId: string;
    attemptId: string;
    before: string;
    after: string;
  }>;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface ArchieAnalytics {
  timeRange: {
    start: Date;
    end: Date;
  };
  overview: {
    totalRuns: number;
    totalIssuesFixed: number;
    totalCost: number;
    avgFixTime: number;
    successRate: number;
  };
  trends: Array<{
    date: Date;
    issuesFound: number;
    issuesFixed: number;
    cost: number;
  }>;
  breakdown: {
    byType: Record<IssueType, { count: number; successRate: number; avgCost: number }>;
    bySeverity: Record<IssueSeverity, { count: number; avgPriority: number }>;
    byFile: Array<{ file: string; issues: number; fixes: number }>;
  };
  topIssues: Array<{
    fingerprint: string;
    description: string;
    occurrences: number;
    lastSeen: Date;
  }>;
  costAnalysis: {
    byModel: Record<string, { calls: number; cost: number }>;
    byStrategy: Record<FixStrategy, { attempts: number; cost: number }>;
    savingsFromLearning: number;
  };
}
