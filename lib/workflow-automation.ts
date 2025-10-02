/**
 * Workflow Automation Agent
 * Main engine for creating, managing, and executing automated workflows
 */

import { createClient } from '@supabase/supabase-js';
import { AutomationEngine, AutomationRule } from './automation-engine';
import { PatternRecognitionEngine, UserBehaviorPattern } from './pattern-recognition';
import { GoogleWorkspaceOrchestrator } from './google-orchestration';
import { AIContentAnalyzer } from './ai-content-analyzer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Core workflow interfaces
export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  version: number;

  // Workflow definition
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];

  // Configuration
  settings: WorkflowSettings;
  metadata: WorkflowMetadata;

  // Status and lifecycle
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  lastExecuted?: string;

  // Performance metrics
  executionCount: number;
  successCount: number;
  averageExecutionTime: number;
  errorRate: number;

  // Learning and optimization
  learningEnabled: boolean;
  optimizationScore: number;
  adaptations: WorkflowAdaptation[];
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'disabled' | 'archived';

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  conditions: TriggerCondition[];
  enabled: boolean;
  priority: number;
}

export type TriggerType =
  | 'manual'           // User manually triggers
  | 'scheduled'        // Time-based trigger
  | 'event'           // Event-driven trigger
  | 'pattern'         // Pattern recognition trigger
  | 'webhook'         // External webhook
  | 'condition'       // Condition-based trigger
  | 'chain'           // Triggered by another workflow
  | 'ai_suggestion';  // AI-suggested trigger

export interface TriggerConfig {
  // Schedule configuration (for scheduled triggers)
  schedule?: {
    cron?: string;
    timezone?: string;
    recurring?: boolean;
  };

  // Event configuration (for event triggers)
  event?: {
    source: string;
    eventType: string;
    filters: Record<string, any>;
  };

  // Pattern configuration (for pattern triggers)
  pattern?: {
    patternId: string;
    confidence: number;
    context: Record<string, any>;
  };

  // Webhook configuration
  webhook?: {
    url: string;
    secret?: string;
    headers?: Record<string, string>;
  };

  // AI suggestion configuration
  aiSuggestion?: {
    modelType: string;
    confidenceThreshold: number;
    contextWindow: string;
  };
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches';
  value: any;
  required: boolean;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  description?: string;

  // Step configuration
  config: StepConfig;
  inputs: StepInput[];
  outputs: StepOutput[];

  // Control flow
  order: number;
  parallel: boolean;
  optional: boolean;
  retryPolicy: RetryPolicy;

  // Conditional execution
  conditions?: StepCondition[];
  onSuccess?: string[];  // Next step IDs
  onFailure?: string[];  // Next step IDs
  onSkip?: string[];     // Next step IDs

  // Performance and monitoring
  timeout: number;
  errorHandling: ErrorHandling;
  logging: LoggingConfig;
}

export type StepType =
  | 'action'          // Execute an action
  | 'condition'       // Evaluate a condition
  | 'loop'           // Loop over items
  | 'parallel'       // Execute steps in parallel
  | 'delay'          // Add a delay
  | 'approval'       // Request human approval
  | 'notification'   // Send notification
  | 'transform'      // Transform data
  | 'api_call'       // Make API call
  | 'ai_analysis'    // AI analysis step
  | 'integration';   // Service integration

export interface StepConfig {
  // Action configuration
  action?: {
    service: string;
    operation: string;
    parameters: Record<string, any>;
  };

  // Condition configuration
  condition?: {
    expression: string;
    variables: Record<string, any>;
  };

  // Loop configuration
  loop?: {
    items: string; // Variable containing items to loop over
    maxIterations?: number;
    parallel?: boolean;
  };

  // Delay configuration
  delay?: {
    duration: number; // milliseconds
    dynamic?: boolean; // Calculate delay dynamically
  };

  // Approval configuration
  approval?: {
    approvers: string[];
    timeout: number;
    autoApprove?: boolean;
    escalation?: string[];
  };

  // Notification configuration
  notification?: {
    recipients: string[];
    template: string;
    channels: ('email' | 'in_app' | 'sms')[];
  };

  // Transform configuration
  transform?: {
    script: string;
    language: 'javascript' | 'python' | 'formula';
    inputVariables: string[];
    outputVariables: string[];
  };

  // API call configuration
  apiCall?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    authentication?: {
      type: 'bearer' | 'api_key' | 'oauth';
      credentials: Record<string, string>;
    };
  };

  // AI analysis configuration
  aiAnalysis?: {
    analysisType: string;
    model: string;
    prompt?: string;
    inputData: string;
    outputFormat: string;
  };
}

export interface StepInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  source: 'trigger' | 'previous_step' | 'variable' | 'constant';
  value?: any;
  required: boolean;
}

export interface StepOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  backoffDelay: number;
  retryConditions: string[];
}

export interface ErrorHandling {
  strategy: 'stop' | 'continue' | 'retry' | 'skip';
  fallbackStep?: string;
  notifyOnError: boolean;
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'none' | 'basic' | 'detailed' | 'debug';
  includeInputs: boolean;
  includeOutputs: boolean;
  retentionDays: number;
}

export interface StepCondition {
  expression: string;
  variables: Record<string, any>;
}

export interface WorkflowCondition {
  id: string;
  name: string;
  expression: string;
  description?: string;
  enabled: boolean;
}

export interface WorkflowSettings {
  // Execution settings
  maxConcurrentExecutions: number;
  executionTimeout: number;
  errorBehavior: 'stop' | 'continue' | 'notify';

  // Security settings
  requireApproval: boolean;
  approvalRequired: string[];
  restrictedOperations: string[];

  // Performance settings
  optimizeExecution: boolean;
  cachingEnabled: boolean;
  parallelismEnabled: boolean;

  // Monitoring settings
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
  loggingLevel: 'none' | 'basic' | 'detailed' | 'debug';

  // Learning settings
  learningEnabled: boolean;
  adaptationEnabled: boolean;
  feedbackCollectionEnabled: boolean;
}

export interface WorkflowMetadata {
  tags: string[];
  category: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedExecutionTime: number;
  dependencies: string[];
  integrations: string[];
  version: string;
  author: string;
  documentation?: string;
}

export interface WorkflowAdaptation {
  id: string;
  timestamp: string;
  type: 'optimization' | 'correction' | 'enhancement';
  description: string;
  changes: Record<string, any>;
  impact: string;
  confidence: number;
}

// Execution interfaces
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;

  // Execution details
  status: ExecutionStatus;
  startTime: string;
  endTime?: string;
  duration?: number;

  // Trigger information
  triggerId: string;
  triggerData: any;
  context: ExecutionContext;

  // Step execution details
  steps: StepExecution[];
  currentStep?: string;

  // Results and outputs
  outputs: Record<string, any>;
  errors: ExecutionError[];
  warnings: ExecutionWarning[];

  // Performance metrics
  performanceMetrics: ExecutionMetrics;

  // Approval tracking
  approvals: ApprovalRequest[];
}

export type ExecutionStatus =
  | 'pending'      // Waiting to start
  | 'running'      // Currently executing
  | 'waiting'      // Waiting for approval/condition
  | 'paused'       // Manually paused
  | 'completed'    // Successfully completed
  | 'failed'       // Failed with error
  | 'cancelled'    // Manually cancelled
  | 'timeout';     // Execution timeout

export interface ExecutionContext {
  userId: string;
  timestamp: string;
  environment: Record<string, any>;
  variables: Record<string, any>;
  previousExecutions: string[];
}

export interface StepExecution {
  stepId: string;
  status: ExecutionStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: ExecutionError;
  retryCount: number;
  logs: ExecutionLog[];
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: any;
  stepId?: string;
  timestamp: string;
  recoverable: boolean;
}

export interface ExecutionWarning {
  code: string;
  message: string;
  stepId?: string;
  timestamp: string;
}

export interface ExecutionMetrics {
  totalDuration: number;
  stepDurations: Record<string, number>;
  resourceUsage: Record<string, number>;
  apiCalls: number;
  dataProcessed: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface ApprovalRequest {
  id: string;
  workflowExecutionId: string;
  stepId: string;
  requestedAt: string;
  requiredBy?: string;
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  response?: ApprovalResponse;
}

export interface ApprovalResponse {
  approverId: string;
  decision: 'approve' | 'reject';
  timestamp: string;
  comments?: string;
  conditions?: Record<string, any>;
}

// Template and suggestion interfaces
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: number;
  template: Partial<Workflow>;
  usageCount: number;
  rating: number;
  author: string;
  documentation: string;
  prerequisites: string[];
}

export interface AutomationSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  category: 'time_saving' | 'efficiency' | 'accuracy' | 'consistency';
  expectedBenefit: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedSetupTime: number;
  suggestedWorkflow: Partial<Workflow>;
  basedOnPattern?: string;
  prerequisites: string[];
  riskFactors: string[];
}

/**
 * Main Workflow Automation Agent Class
 */
export class WorkflowAutomationAgent {
  private userId: string;
  private automationEngine: AutomationEngine;
  private patternEngine: PatternRecognitionEngine;
  private aiAnalyzer: AIContentAnalyzer;
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private templates: WorkflowTemplate[] = [];

  constructor(userId: string) {
    this.userId = userId;
    this.automationEngine = new AutomationEngine(userId);
    this.patternEngine = new PatternRecognitionEngine(userId);
    this.aiAnalyzer = new AIContentAnalyzer(userId);
    this.initialize();
  }

  /**
   * Initialize the workflow automation agent
   */
  private async initialize(): Promise<void> {
    await this.loadWorkflows();
    await this.loadTemplates();
    await this.loadActiveExecutions();
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
    const workflow: Workflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.userId,
      name: workflowData.name || 'New Workflow',
      description: workflowData.description || '',
      version: 1,

      triggers: workflowData.triggers || [],
      steps: workflowData.steps || [],
      conditions: workflowData.conditions || [],

      settings: {
        maxConcurrentExecutions: 5,
        executionTimeout: 3600000, // 1 hour
        errorBehavior: 'stop',
        requireApproval: false,
        approvalRequired: [],
        restrictedOperations: [],
        optimizeExecution: true,
        cachingEnabled: true,
        parallelismEnabled: true,
        monitoringEnabled: true,
        alertingEnabled: true,
        loggingLevel: 'basic',
        learningEnabled: true,
        adaptationEnabled: true,
        feedbackCollectionEnabled: true,
        ...workflowData.settings
      },

      metadata: {
        tags: [],
        category: 'general',
        complexity: 'medium',
        estimatedExecutionTime: 60000, // 1 minute
        dependencies: [],
        integrations: [],
        version: '1.0.0',
        author: this.userId,
        ...workflowData.metadata
      },

      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      executionCount: 0,
      successCount: 0,
      averageExecutionTime: 0,
      errorRate: 0,

      learningEnabled: true,
      optimizationScore: 0,
      adaptations: []
    };

    // Validate workflow
    const validation = await this.validateWorkflow(workflow);
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Save workflow
    await this.saveWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);

    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggerData?: any,
    context?: Partial<ExecutionContext>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active (status: ${workflow.status})`);
    }

    // Create execution record
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      userId: this.userId,

      status: 'pending',
      startTime: new Date().toISOString(),

      triggerId: 'manual', // TODO: Determine actual trigger
      triggerData: triggerData || {},
      context: {
        userId: this.userId,
        timestamp: new Date().toISOString(),
        environment: {},
        variables: {},
        previousExecutions: [],
        ...context
      },

      steps: [],
      outputs: {},
      errors: [],
      warnings: [],

      performanceMetrics: {
        totalDuration: 0,
        stepDurations: {},
        resourceUsage: {},
        apiCalls: 0,
        dataProcessed: 0,
        cacheHits: 0,
        cacheMisses: 0
      },

      approvals: []
    };

    // Save execution record
    this.executions.set(execution.id, execution);
    await this.saveExecution(execution);

    // Start execution in background
    this.executeWorkflowSteps(execution).catch(error => {
      console.error('Workflow execution error:', error);
      this.handleExecutionError(execution, error);
    });

    return execution;
  }

  /**
   * Validate a workflow configuration
   */
  async validateWorkflow(workflow: Partial<Workflow>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    complexityScore: number;
    estimatedExecutionTime: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!workflow.name?.trim()) {
      errors.push('Workflow name is required');
    }

    if (!workflow.steps?.length) {
      errors.push('Workflow must have at least one step');
    }

    if (!workflow.triggers?.length) {
      warnings.push('Workflow has no triggers - it can only be executed manually');
    }

    // Step validation
    if (workflow.steps) {
      for (const step of workflow.steps) {
        const stepValidation = this.validateStep(step);
        errors.push(...stepValidation.errors);
        warnings.push(...stepValidation.warnings);
      }

      // Check for circular dependencies
      const cycles = this.detectCircularDependencies(workflow.steps);
      if (cycles.length > 0) {
        errors.push(`Circular dependencies detected: ${cycles.join(', ')}`);
      }

      // Check for unreachable steps
      const unreachable = this.findUnreachableSteps(workflow.steps);
      if (unreachable.length > 0) {
        warnings.push(`Unreachable steps detected: ${unreachable.join(', ')}`);
      }
    }

    // Calculate complexity and estimated time
    const complexityScore = this.calculateWorkflowComplexity(workflow);
    const estimatedExecutionTime = this.estimateExecutionTime(workflow);

    // Generate suggestions
    if (complexityScore > 0.8) {
      suggestions.push('Consider breaking this workflow into smaller, simpler workflows');
    }

    if (estimatedExecutionTime > 1800000) { // 30 minutes
      suggestions.push('This workflow may take a long time to execute - consider adding checkpoints');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      complexityScore,
      estimatedExecutionTime
    };
  }

  /**
   * Test a workflow execution safely
   */
  async testWorkflow(
    workflowId: string,
    testData: any,
    options: { mode?: 'safe' | 'dry_run' | 'sandbox' } = {}
  ): Promise<{
    passed: boolean;
    executionTime: number;
    stepsExecuted: number;
    results: Record<string, any>;
    errors: ExecutionError[];
    warnings: ExecutionWarning[];
  }> {
    const { mode = 'safe' } = options;
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const startTime = Date.now();
    const errors: ExecutionError[] = [];
    const warnings: ExecutionWarning[] = [];
    const results: Record<string, any> = {};
    let stepsExecuted = 0;

    try {
      // Create test execution context
      const testExecution: WorkflowExecution = {
        id: `test_${Date.now()}`,
        workflowId,
        userId: this.userId,
        status: 'running',
        startTime: new Date().toISOString(),
        triggerId: 'test',
        triggerData: testData,
        context: {
          userId: this.userId,
          timestamp: new Date().toISOString(),
          environment: { test_mode: mode },
          variables: {},
          previousExecutions: []
        },
        steps: [],
        outputs: {},
        errors: [],
        warnings: [],
        performanceMetrics: {
          totalDuration: 0,
          stepDurations: {},
          resourceUsage: {},
          apiCalls: 0,
          dataProcessed: 0,
          cacheHits: 0,
          cacheMisses: 0
        },
        approvals: []
      };

      // Execute steps in test mode
      for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
        try {
          const stepResult = await this.executeStepInTestMode(step, testExecution, mode);
          results[step.id] = stepResult;
          stepsExecuted++;
        } catch (error: any) {
          errors.push({
            code: 'STEP_EXECUTION_ERROR',
            message: error.message,
            stepId: step.id,
            timestamp: new Date().toISOString(),
            recoverable: false
          });

          if (step.errorHandling.strategy === 'stop') {
            break;
          }
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        passed: errors.length === 0,
        executionTime,
        stepsExecuted,
        results,
        errors,
        warnings
      };

    } catch (error: any) {
      return {
        passed: false,
        executionTime: Date.now() - startTime,
        stepsExecuted,
        results,
        errors: [{
          code: 'TEST_EXECUTION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString(),
          recoverable: false
        }],
        warnings
      };
    }
  }

  /**
   * Generate automation suggestions based on patterns
   */
  async generateAutomationSuggestions(options: {
    patterns: UserBehaviorPattern[];
    context?: Record<string, any>;
    userBehavior?: any;
    preferences?: Record<string, any>;
  }): Promise<{
    highConfidence: AutomationSuggestion[];
    mediumConfidence: AutomationSuggestion[];
    experimental: AutomationSuggestion[];
    workflowTemplates: WorkflowTemplate[];
  }> {
    const { patterns, context = {}, preferences = {} } = options;

    const suggestions: AutomationSuggestion[] = [];

    // Analyze patterns for automation opportunities
    for (const pattern of patterns) {
      if (pattern.automationScore >= 0.8) {
        const suggestion = await this.createSuggestionFromPattern(pattern, 'high');
        suggestions.push(suggestion);
      } else if (pattern.automationScore >= 0.6) {
        const suggestion = await this.createSuggestionFromPattern(pattern, 'medium');
        suggestions.push(suggestion);
      } else if (pattern.automationScore >= 0.4) {
        const suggestion = await this.createSuggestionFromPattern(pattern, 'experimental');
        suggestions.push(suggestion);
      }
    }

    // Get relevant workflow templates
    const relevantTemplates = await this.getRelevantTemplates(patterns, context);

    // Categorize suggestions by confidence
    const highConfidence = suggestions.filter(s => s.confidence >= 0.8);
    const mediumConfidence = suggestions.filter(s => s.confidence >= 0.6 && s.confidence < 0.8);
    const experimental = suggestions.filter(s => s.confidence < 0.6);

    return {
      highConfidence,
      mediumConfidence,
      experimental,
      workflowTemplates: relevantTemplates
    };
  }

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(): Promise<{
    categories: Record<string, WorkflowTemplate[]>;
    popular: WorkflowTemplate[];
    recommended: WorkflowTemplate[];
    custom: WorkflowTemplate[];
  }> {
    await this.loadTemplates();

    // Categorize templates
    const categories: Record<string, WorkflowTemplate[]> = {};
    for (const template of this.templates) {
      if (!categories[template.category]) {
        categories[template.category] = [];
      }
      categories[template.category].push(template);
    }

    // Get popular templates (by usage count)
    const popular = [...this.templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    // Get recommended templates (by rating)
    const recommended = [...this.templates]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    // Get custom templates (created by user)
    const custom = this.templates.filter(t => t.author === this.userId);

    return {
      categories,
      popular,
      recommended,
      custom
    };
  }

  /**
   * Get automation suggestions based on current patterns
   */
  async getAutomationSuggestions(options: {
    patterns: UserBehaviorPattern[];
    context?: Record<string, any>;
    includeAdvanced?: boolean;
  }): Promise<{
    immediate: AutomationSuggestion[];
    scheduled: AutomationSuggestion[];
    conditional: AutomationSuggestion[];
    learningBased: AutomationSuggestion[];
  }> {
    const { patterns, context = {}, includeAdvanced = false } = options;

    const immediate: AutomationSuggestion[] = [];
    const scheduled: AutomationSuggestion[] = [];
    const conditional: AutomationSuggestion[] = [];
    const learningBased: AutomationSuggestion[] = [];

    for (const pattern of patterns) {
      const suggestions = await this.generateSuggestionsFromPattern(pattern, includeAdvanced);

      immediate.push(...suggestions.filter(s => s.category === 'time_saving'));
      scheduled.push(...suggestions.filter(s =>
        s.suggestedWorkflow.triggers?.some((t: any) => t.type === 'scheduled')
      ));
      conditional.push(...suggestions.filter(s =>
        s.suggestedWorkflow.triggers?.some((t: any) => t.type === 'condition')
      ));
      learningBased.push(...suggestions.filter(s =>
        s.suggestedWorkflow.settings?.learningEnabled
      ));
    }

    return {
      immediate,
      scheduled,
      conditional,
      learningBased
    };
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const updatedWorkflow: Workflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: workflow.version + 1
    };

    // Validate updated workflow
    const validation = await this.validateWorkflow(updatedWorkflow);
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Save updated workflow
    await this.saveWorkflow(updatedWorkflow);
    this.workflows.set(workflowId, updatedWorkflow);

    return updatedWorkflow;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string, options: { force?: boolean } = {}): Promise<{
    deleted: boolean;
    cleanupActions: string[];
  }> {
    const { force = false } = options;
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const cleanupActions: string[] = [];

    // Check for active executions
    const activeExecutions = Array.from(this.executions.values())
      .filter(exec => exec.workflowId === workflowId && exec.status === 'running');

    if (activeExecutions.length > 0 && !force) {
      throw new Error(`Cannot delete workflow with ${activeExecutions.length} active executions. Use force=true to override.`);
    }

    if (activeExecutions.length > 0) {
      // Cancel active executions
      for (const execution of activeExecutions) {
        await this.cancelExecution(execution.id);
        cleanupActions.push(`Cancelled execution ${execution.id}`);
      }
    }

    // Remove from database
    await supabase.from('workflows').delete().eq('id', workflowId);
    cleanupActions.push('Removed from database');

    // Remove from memory
    this.workflows.delete(workflowId);
    cleanupActions.push('Removed from memory');

    return {
      deleted: true,
      cleanupActions
    };
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(workflowId: string, options: { timeRange?: string } = {}): Promise<{
    executionStats: Record<string, number>;
    performanceMetrics: Record<string, number>;
    errorAnalysis: Record<string, any>;
    optimizationOpportunities: string[];
  }> {
    const { timeRange = '30d' } = options;

    // Get execution history for the workflow
    const executions = await this.getWorkflowExecutions(workflowId, timeRange);

    // Calculate execution statistics
    const executionStats = {
      total_executions: executions.length,
      successful_executions: executions.filter(e => e.status === 'completed').length,
      failed_executions: executions.filter(e => e.status === 'failed').length,
      average_duration: this.calculateAverageDuration(executions),
      success_rate: executions.length > 0 ?
        executions.filter(e => e.status === 'completed').length / executions.length : 0
    };

    // Calculate performance metrics
    const performanceMetrics = {
      avg_execution_time: executionStats.average_duration,
      min_execution_time: Math.min(...executions.map(e => e.duration || 0)),
      max_execution_time: Math.max(...executions.map(e => e.duration || 0)),
      total_api_calls: executions.reduce((sum, e) => sum + e.performanceMetrics.apiCalls, 0),
      cache_hit_rate: this.calculateCacheHitRate(executions)
    };

    // Analyze errors
    const errorAnalysis = this.analyzeExecutionErrors(executions);

    // Identify optimization opportunities
    const optimizationOpportunities = this.identifyOptimizationOpportunities(executions);

    return {
      executionStats,
      performanceMetrics,
      errorAnalysis,
      optimizationOpportunities
    };
  }

  // Private helper methods

  private async loadWorkflows(): Promise<void> {
    const { data: workflows } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', this.userId);

    if (workflows) {
      workflows.forEach(workflow => {
        this.workflows.set(workflow.id, workflow);
      });
    }
  }

  private async loadTemplates(): Promise<void> {
    const { data: templates } = await supabase
      .from('workflow_templates')
      .select('*')
      .order('rating', { ascending: false });

    if (templates) {
      this.templates = templates;
    }
  }

  private async loadActiveExecutions(): Promise<void> {
    const { data: executions } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('user_id', this.userId)
      .in('status', ['pending', 'running', 'waiting']);

    if (executions) {
      executions.forEach(execution => {
        this.executions.set(execution.id, execution);
      });
    }
  }

  private async saveWorkflow(workflow: Workflow): Promise<void> {
    await supabase.from('workflows').upsert(workflow);
  }

  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    await supabase.from('workflow_executions').upsert(execution);
  }

  private async executeWorkflowSteps(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${execution.workflowId} not found`);
    }

    execution.status = 'running';
    await this.saveExecution(execution);

    try {
      // Execute steps in order
      const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order);

      for (const step of sortedSteps) {
        const stepExecution = await this.executeStep(step, execution);
        execution.steps.push(stepExecution);

        if (stepExecution.status === 'failed' && step.errorHandling.strategy === 'stop') {
          execution.status = 'failed';
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
        workflow.successCount++;
      } else {
        // Execution failed
      }

      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();

      // Update workflow metrics
      workflow.executionCount++;
      workflow.averageExecutionTime = (workflow.averageExecutionTime + execution.duration) / 2;
      workflow.errorRate = (workflow.executionCount - workflow.successCount) / workflow.executionCount;
      workflow.lastExecuted = execution.endTime;

      await this.saveWorkflow(workflow);
      await this.saveExecution(execution);

    } catch (error: any) {
      execution.status = 'failed';
      execution.errors.push({
        code: 'WORKFLOW_EXECUTION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
        recoverable: false
      });

      await this.saveExecution(execution);
      throw error;
    }
  }

  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<StepExecution> {
    const stepExecution: StepExecution = {
      stepId: step.id,
      status: 'running',
      startTime: new Date().toISOString(),
      inputs: {},
      outputs: {},
      retryCount: 0,
      logs: []
    };

    try {
      // Prepare step inputs
      stepExecution.inputs = await this.prepareStepInputs(step, execution);

      // Execute step based on type
      switch (step.type) {
        case 'action':
          stepExecution.outputs = await this.executeActionStep(step, stepExecution.inputs, execution);
          break;
        case 'condition':
          stepExecution.outputs = await this.executeConditionStep(step, stepExecution.inputs, execution);
          break;
        case 'approval':
          stepExecution.outputs = await this.executeApprovalStep(step, stepExecution.inputs, execution);
          break;
        case 'delay':
          stepExecution.outputs = await this.executeDelayStep(step, stepExecution.inputs, execution);
          break;
        case 'notification':
          stepExecution.outputs = await this.executeNotificationStep(step, stepExecution.inputs, execution);
          break;
        case 'api_call':
          stepExecution.outputs = await this.executeApiCallStep(step, stepExecution.inputs, execution);
          break;
        case 'ai_analysis':
          stepExecution.outputs = await this.executeAiAnalysisStep(step, stepExecution.inputs, execution);
          break;
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      stepExecution.status = 'completed';

    } catch (error: any) {
      stepExecution.status = 'failed';
      stepExecution.error = {
        code: 'STEP_EXECUTION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
        recoverable: true
      };

      // Handle retry logic
      if (step.retryPolicy.enabled && stepExecution.retryCount < step.retryPolicy.maxAttempts) {
        stepExecution.retryCount++;
        // TODO: Implement retry with backoff
      }
    }

    stepExecution.endTime = new Date().toISOString();
    stepExecution.duration = new Date(stepExecution.endTime).getTime() - new Date(stepExecution.startTime).getTime();

    return stepExecution;
  }

  // Step execution methods (simplified implementations)

  private async executeActionStep(step: WorkflowStep, inputs: any, execution: WorkflowExecution): Promise<any> {
    const { action } = step.config;
    if (!action) throw new Error('Action configuration missing');

    // Execute action based on service
    switch (action.service) {
      case 'gmail':
        return await this.executeGmailAction(action, inputs, execution);
      case 'drive':
        return await this.executeDriveAction(action, inputs, execution);
      case 'calendar':
        return await this.executeCalendarAction(action, inputs, execution);
      default:
        throw new Error(`Unsupported action service: ${action.service}`);
    }
  }

  private async executeConditionStep(step: WorkflowStep, inputs: any, execution: WorkflowExecution): Promise<any> {
    const { condition } = step.config;
    if (!condition) throw new Error('Condition configuration missing');

    // Evaluate condition expression
    const result = this.evaluateExpression(condition.expression, {
      ...inputs,
      ...condition.variables,
      ...execution.context.variables
    });

    return { result, expression: condition.expression };
  }

  private async executeApprovalStep(step: WorkflowStep, inputs: any, execution: WorkflowExecution): Promise<any> {
    const { approval } = step.config;
    if (!approval) throw new Error('Approval configuration missing');

    // Create approval request
    const approvalRequest: ApprovalRequest = {
      id: `approval_${Date.now()}`,
      workflowExecutionId: execution.id,
      stepId: step.id,
      requestedAt: new Date().toISOString(),
      approvers: approval.approvers,
      status: 'pending'
    };

    execution.approvals.push(approvalRequest);
    await this.saveExecution(execution);

    // In a real implementation, this would wait for approval
    // For now, we'll simulate auto-approval if configured
    if (approval.autoApprove) {
      approvalRequest.status = 'approved';
      approvalRequest.response = {
        approverId: 'system',
        decision: 'approve',
        timestamp: new Date().toISOString(),
        comments: 'Auto-approved'
      };
    }

    return { approvalId: approvalRequest.id, status: approvalRequest.status };
  }

  private async executeDelayStep(step: WorkflowStep, inputs: any, execution: WorkflowExecution): Promise<any> {
    const { delay } = step.config;
    if (!delay) throw new Error('Delay configuration missing');

    const duration = delay.dynamic ?
      this.calculateDynamicDelay(inputs, execution) :
      delay.duration;

    // In a real implementation, this would actually wait
    // For now, we'll just record the delay
    return { duration, delayed: true };
  }

  private async executeNotificationStep(step: WorkflowStep, inputs: any, execution: WorkflowExecution): Promise<any> {
    const { notification } = step.config;
    if (!notification) throw new Error('Notification configuration missing');

    // Send notifications (simplified)
    const sent = [];
    for (const recipient of notification.recipients) {
      // In a real implementation, this would send actual notifications
      sent.push({
        recipient,
        channels: notification.channels,
        sent: true,
        timestamp: new Date().toISOString()
      });
    }

    return { notifications_sent: sent.length, details: sent };
  }

  private async executeApiCallStep(step: WorkflowStep, inputs: any, execution: WorkflowExecution): Promise<any> {
    const { apiCall } = step.config;
    if (!apiCall) throw new Error('API call configuration missing');

    // Make HTTP request (simplified)
    const response = {
      status: 200,
      data: { success: true, message: 'API call simulated' },
      timestamp: new Date().toISOString()
    };

    execution.performanceMetrics.apiCalls++;

    return response;
  }

  private async executeAiAnalysisStep(step: WorkflowStep, inputs: any, execution: WorkflowExecution): Promise<any> {
    const { aiAnalysis } = step.config;
    if (!aiAnalysis) throw new Error('AI analysis configuration missing');

    // Perform AI analysis using the AI content analyzer
    const analysis = await this.aiAnalyzer.analyzeContent({
      content: inputs[aiAnalysis.inputData],
      contentType: 'mixed',
      analysisTypes: [aiAnalysis.analysisType],
      context: execution.context
    });

    return {
      analysis_type: aiAnalysis.analysisType,
      results: analysis,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString()
    };
  }

  // Additional helper methods (simplified implementations)

  private async prepareStepInputs(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const inputs: any = {};

    for (const input of step.inputs) {
      switch (input.source) {
        case 'trigger':
          inputs[input.name] = execution.triggerData[input.name];
          break;
        case 'previous_step':
          // Find output from previous step
          const previousStep = execution.steps.find(s => s.outputs[input.name] !== undefined);
          inputs[input.name] = previousStep?.outputs[input.name];
          break;
        case 'variable':
          inputs[input.name] = execution.context.variables[input.name];
          break;
        case 'constant':
          inputs[input.name] = input.value;
          break;
      }
    }

    return inputs;
  }

  private evaluateExpression(expression: string, variables: Record<string, any>): boolean {
    // Simplified expression evaluation
    // In a real implementation, this would use a proper expression parser
    try {
      // Replace variables in expression
      let evaluatedExpression = expression;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluatedExpression = evaluatedExpression.replace(regex, JSON.stringify(value));
      }

      // Use Function constructor for safe evaluation (simplified)
      return Boolean(Function(`"use strict"; return (${evaluatedExpression})`)());
    } catch (error) {
      return false;
    }
  }

  private calculateDynamicDelay(inputs: any, execution: WorkflowExecution): number {
    // Calculate delay based on inputs and execution context
    return 1000; // Default 1 second
  }

  // Service-specific action executors (placeholders)
  private async executeGmailAction(action: any, inputs: any, execution: WorkflowExecution): Promise<any> {
    return { service: 'gmail', action: action.operation, success: true };
  }

  private async executeDriveAction(action: any, inputs: any, execution: WorkflowExecution): Promise<any> {
    return { service: 'drive', action: action.operation, success: true };
  }

  private async executeCalendarAction(action: any, inputs: any, execution: WorkflowExecution): Promise<any> {
    return { service: 'calendar', action: action.operation, success: true };
  }

  // Validation helper methods
  private validateStep(step: WorkflowStep): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!step.name?.trim()) {
      errors.push(`Step ${step.id}: Name is required`);
    }

    if (!step.type) {
      errors.push(`Step ${step.id}: Type is required`);
    }

    if (step.timeout <= 0) {
      warnings.push(`Step ${step.id}: Timeout should be positive`);
    }

    return { errors, warnings };
  }

  private detectCircularDependencies(steps: WorkflowStep[]): string[] {
    // Simplified cycle detection
    // In a real implementation, this would use proper graph algorithms
    return [];
  }

  private findUnreachableSteps(steps: WorkflowStep[]): string[] {
    // Simplified unreachable step detection
    return [];
  }

  private calculateWorkflowComplexity(workflow: Partial<Workflow>): number {
    const stepCount = workflow.steps?.length || 0;
    const conditionCount = workflow.conditions?.length || 0;
    const triggerCount = workflow.triggers?.length || 0;

    // Simple complexity calculation
    return Math.min(1, (stepCount * 0.1) + (conditionCount * 0.2) + (triggerCount * 0.1));
  }

  private estimateExecutionTime(workflow: Partial<Workflow>): number {
    const stepCount = workflow.steps?.length || 0;
    return stepCount * 5000; // 5 seconds per step (rough estimate)
  }

  // Additional methods for testing, suggestions, analytics, etc.
  private async executeStepInTestMode(step: WorkflowStep, execution: WorkflowExecution, mode: string): Promise<any> {
    // Execute step in test mode (safe execution)
    return { test_mode: mode, step_id: step.id, simulated: true };
  }

  private async createSuggestionFromPattern(pattern: UserBehaviorPattern, confidence: string): Promise<AutomationSuggestion> {
    return {
      id: `suggestion_${pattern.id}`,
      title: `Automate ${pattern.name}`,
      description: pattern.description,
      confidence: pattern.confidence,
      category: 'efficiency',
      expectedBenefit: `Save time on repetitive ${pattern.name} tasks`,
      complexity: pattern.automationComplexity,
      estimatedSetupTime: 300000, // 5 minutes
      suggestedWorkflow: this.createWorkflowFromPattern(pattern),
      basedOnPattern: pattern.id,
      prerequisites: [],
      riskFactors: []
    };
  }

  private createWorkflowFromPattern(pattern: UserBehaviorPattern): Partial<Workflow> {
    return {
      name: `Auto ${pattern.name}`,
      description: `Automated workflow based on ${pattern.name} pattern`,
      triggers: pattern.triggers.map(trigger => ({
        id: `trigger_${trigger.type}`,
        type: trigger.type as TriggerType,
        config: trigger.data,
        conditions: [],
        enabled: true,
        priority: 1
      })),
      steps: pattern.actions.map((action, index) => ({
        id: `step_${index}`,
        type: 'action' as StepType,
        name: action.action,
        config: {
          action: {
            service: action.service,
            operation: action.action,
            parameters: action.parameters
          }
        },
        inputs: [],
        outputs: [],
        order: action.sequence,
        parallel: false,
        optional: false,
        retryPolicy: {
          enabled: true,
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          backoffDelay: 1000,
          retryConditions: ['network_error', 'timeout']
        },
        timeout: 30000,
        errorHandling: {
          strategy: 'retry',
          notifyOnError: true,
          logLevel: 'error'
        },
        logging: {
          enabled: true,
          level: 'basic',
          includeInputs: false,
          includeOutputs: false,
          retentionDays: 30
        }
      }))
    };
  }

  private async getRelevantTemplates(patterns: UserBehaviorPattern[], context: Record<string, any>): Promise<WorkflowTemplate[]> {
    // Find templates relevant to the patterns and context
    return this.templates.filter(template => {
      // Simple relevance check based on category and tags
      return patterns.some(pattern =>
        template.tags.some(tag =>
          pattern.metadata.category?.includes(tag.toLowerCase())
        )
      );
    }).slice(0, 5);
  }

  private async generateSuggestionsFromPattern(pattern: UserBehaviorPattern, includeAdvanced: boolean): Promise<AutomationSuggestion[]> {
    const suggestions: AutomationSuggestion[] = [];

    // Generate basic suggestion
    suggestions.push(await this.createSuggestionFromPattern(pattern, 'medium'));

    if (includeAdvanced) {
      // Generate advanced suggestions with more complex logic
      // This would include conditional workflows, multi-step automations, etc.
    }

    return suggestions;
  }

  private async getWorkflowExecutions(workflowId: string, timeRange: string): Promise<WorkflowExecution[]> {
    const days = parseInt(timeRange.replace('d', ''));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return Array.from(this.executions.values()).filter(execution =>
      execution.workflowId === workflowId &&
      new Date(execution.startTime) >= cutoffDate
    );
  }

  private calculateAverageDuration(executions: WorkflowExecution[]): number {
    const completedExecutions = executions.filter(e => e.duration);
    if (completedExecutions.length === 0) return 0;

    return completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length;
  }

  private calculateCacheHitRate(executions: WorkflowExecution[]): number {
    const totalRequests = executions.reduce((sum, e) =>
      sum + e.performanceMetrics.cacheHits + e.performanceMetrics.cacheMisses, 0);

    if (totalRequests === 0) return 0;

    const totalHits = executions.reduce((sum, e) => sum + e.performanceMetrics.cacheHits, 0);
    return totalHits / totalRequests;
  }

  private analyzeExecutionErrors(executions: WorkflowExecution[]): Record<string, any> {
    const errors = executions.flatMap(e => e.errors);
    const errorsByCode = new Map<string, number>();

    for (const error of errors) {
      errorsByCode.set(error.code, (errorsByCode.get(error.code) || 0) + 1);
    }

    return {
      total_errors: errors.length,
      error_types: Object.fromEntries(errorsByCode),
      most_common_error: errors.length > 0 ?
        Array.from(errorsByCode.entries()).sort((a, b) => b[1] - a[1])[0] : null
    };
  }

  private identifyOptimizationOpportunities(executions: WorkflowExecution[]): string[] {
    const opportunities: string[] = [];

    // Identify slow steps
    const avgStepDurations = new Map<string, number>();
    for (const execution of executions) {
      for (const step of execution.steps) {
        const stepId = step.stepId;
        const currentAvg = avgStepDurations.get(stepId) || 0;
        const duration = step.duration || 0;
        avgStepDurations.set(stepId, (currentAvg + duration) / 2);
      }
    }

    for (const [stepId, avgDuration] of avgStepDurations) {
      if (avgDuration > 30000) { // 30 seconds
        opportunities.push(`Step ${stepId} is slow (avg: ${Math.round(avgDuration/1000)}s) - consider optimization`);
      }
    }

    // Identify high error rates
    const errorRates = new Map<string, number>();
    for (const execution of executions) {
      for (const step of execution.steps) {
        if (step.error) {
          const stepId = step.stepId;
          errorRates.set(stepId, (errorRates.get(stepId) || 0) + 1);
        }
      }
    }

    for (const [stepId, errorCount] of errorRates) {
      const errorRate = errorCount / executions.length;
      if (errorRate > 0.1) { // 10% error rate
        opportunities.push(`Step ${stepId} has high error rate (${Math.round(errorRate*100)}%) - review implementation`);
      }
    }

    return opportunities;
  }

  private async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.endTime = new Date().toISOString();
      await this.saveExecution(execution);
    }
  }

  private async handleExecutionError(execution: WorkflowExecution, error: Error): Promise<void> {
    execution.status = 'failed';
    execution.errors.push({
      code: 'WORKFLOW_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      recoverable: false
    });
    await this.saveExecution(execution);
  }
}

export default WorkflowAutomationAgent;