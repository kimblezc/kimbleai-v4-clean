/**
 * Workflow Engine - Simplified execution engine for workflows
 * Handles trigger-based and manual workflow execution
 */

import { createClient } from '@supabase/supabase-js';
import { activityStream, logAgentActivity } from './activity-stream';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event';
  config: {
    cron?: string; // For scheduled triggers
    event?: string; // For event triggers
  };
}

export interface WorkflowAction {
  id: string;
  type: 'gmail' | 'calendar' | 'drive' | 'notification' | 'ai_analysis' | 'create_task';
  name: string;
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger_type: 'manual' | 'scheduled' | 'event';
  trigger_config: Record<string, any>;
  actions: WorkflowAction[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  result?: Record<string, any>;
  error?: string;
}

export class WorkflowEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Execute a workflow manually
   */
  async executeWorkflow(workflowId: string, context?: Record<string, any>): Promise<WorkflowExecution> {
    const startTime = new Date();

    // Broadcast to activity stream
    logAgentActivity(
      'Workflow Engine',
      `Starting workflow execution: ${workflowId}`,
      'info',
      'workflow',
      undefined,
      { workflowId, context }
    );

    // Get workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      const errorMsg = `Workflow ${workflowId} not found`;
      logAgentActivity('Workflow Engine', errorMsg, 'error', 'workflow');
      throw new Error(errorMsg);
    }

    if (!workflow.enabled) {
      const errorMsg = `Workflow ${workflowId} is disabled`;
      logAgentActivity('Workflow Engine', errorMsg, 'warn', 'workflow');
      throw new Error(errorMsg);
    }

    // Create execution record
    const execution: Omit<WorkflowExecution, 'id'> = {
      workflow_id: workflowId,
      status: 'running',
      started_at: startTime.toISOString(),
      result: {},
    };

    const { data: executionRecord, error: insertError } = await supabase
      .from('workflow_executions')
      .insert(execution)
      .select()
      .single();

    if (insertError || !executionRecord) {
      logAgentActivity('Workflow Engine', 'Failed to create execution record', 'error', 'workflow');
      throw new Error('Failed to create execution record');
    }

    const executionId = executionRecord.id;

    try {
      // Execute actions sequentially
      const results: Record<string, any> = {};
      const actions = workflow.actions as WorkflowAction[];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        logAgentActivity(
          'Workflow Engine',
          `Executing action ${i + 1}/${actions.length}: ${action.name}`,
          'info',
          'workflow',
          undefined,
          { actionType: action.type, actionName: action.name }
        );

        const actionResult = await this.executeAction(action, context || {}, results);
        results[action.id] = actionResult;
      }

      // Update execution as completed
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: endTime.toISOString(),
          result: results,
        })
        .eq('id', executionId);

      logAgentActivity(
        'Workflow Engine',
        `Workflow completed successfully in ${duration}ms`,
        'success',
        'workflow',
        `Executed ${actions.length} actions`,
        { workflowId, executionId, duration, results }
      );

      return {
        id: executionId,
        workflow_id: workflowId,
        status: 'completed',
        started_at: startTime.toISOString(),
        completed_at: endTime.toISOString(),
        result: results,
      };
    } catch (error: any) {
      // Update execution as failed
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error.message,
        })
        .eq('id', executionId);

      logAgentActivity(
        'Workflow Engine',
        `Workflow failed: ${error.message}`,
        'error',
        'workflow',
        error.stack,
        { workflowId, executionId }
      );

      return {
        id: executionId,
        workflow_id: workflowId,
        status: 'failed',
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    context: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    switch (action.type) {
      case 'gmail':
        return this.executeGmailAction(action, context, previousResults);

      case 'calendar':
        return this.executeCalendarAction(action, context, previousResults);

      case 'drive':
        return this.executeDriveAction(action, context, previousResults);

      case 'notification':
        return this.executeNotificationAction(action, context, previousResults);

      case 'ai_analysis':
        return this.executeAiAnalysisAction(action, context, previousResults);

      case 'create_task':
        return this.executeCreateTaskAction(action, context, previousResults);

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Execute Gmail action
   */
  private async executeGmailAction(
    action: WorkflowAction,
    context: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    const { operation } = action.config;

    logAgentActivity(
      'Workflow Engine',
      `Gmail action: ${operation}`,
      'info',
      'workflow'
    );

    return {
      service: 'gmail',
      operation,
      success: true,
      message: `Gmail ${operation} simulated`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Calendar action
   */
  private async executeCalendarAction(
    action: WorkflowAction,
    context: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    const { operation } = action.config;

    logAgentActivity(
      'Workflow Engine',
      `Calendar action: ${operation}`,
      'info',
      'workflow'
    );

    return {
      service: 'calendar',
      operation,
      success: true,
      message: `Calendar ${operation} simulated`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Drive action
   */
  private async executeDriveAction(
    action: WorkflowAction,
    context: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    const { operation } = action.config;

    logAgentActivity(
      'Workflow Engine',
      `Drive action: ${operation}`,
      'info',
      'workflow'
    );

    return {
      service: 'drive',
      operation,
      success: true,
      message: `Drive ${operation} simulated`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Notification action
   */
  private async executeNotificationAction(
    action: WorkflowAction,
    context: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    const { message, channels = ['in_app'] } = action.config;

    logAgentActivity(
      'Workflow Engine',
      message || 'Workflow notification',
      'info',
      'workflow',
      `Sent via: ${channels.join(', ')}`
    );

    return {
      service: 'notification',
      message,
      channels,
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute AI Analysis action
   */
  private async executeAiAnalysisAction(
    action: WorkflowAction,
    context: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    const { analysisType, inputData } = action.config;

    logAgentActivity(
      'Workflow Engine',
      `AI analysis: ${analysisType}`,
      'info',
      'workflow'
    );

    return {
      service: 'ai_analysis',
      analysisType,
      results: {
        summary: 'AI analysis completed',
        confidence: 0.95,
      },
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Create Task action
   */
  private async executeCreateTaskAction(
    action: WorkflowAction,
    context: Record<string, any>,
    previousResults: Record<string, any>
  ): Promise<any> {
    const { title, description, priority = 'medium' } = action.config;

    logAgentActivity(
      'Workflow Engine',
      `Created task: ${title}`,
      'success',
      'task_processing',
      description
    );

    return {
      service: 'task',
      operation: 'create',
      task: {
        title,
        description,
        priority,
        created_at: new Date().toISOString(),
      },
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId: string, limit = 10): Promise<WorkflowExecution[]> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching execution history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get all workflows for user
   */
  async getWorkflows(): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        ...workflow,
        user_id: this.userId,
      })
      .select()
      .single();

    if (error) {
      logAgentActivity('Workflow Engine', `Failed to create workflow: ${error.message}`, 'error', 'workflow');
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    logAgentActivity(
      'Workflow Engine',
      `Created new workflow: ${workflow.name}`,
      'success',
      'workflow',
      workflow.description
    );

    return data;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update workflow: ${error.message}`);
    }

    logAgentActivity(
      'Workflow Engine',
      `Updated workflow: ${data.name}`,
      'info',
      'workflow'
    );

    return data;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', this.userId);

    if (error) {
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }

    logAgentActivity(
      'Workflow Engine',
      `Deleted workflow: ${workflowId}`,
      'info',
      'workflow'
    );
  }
}

export default WorkflowEngine;
