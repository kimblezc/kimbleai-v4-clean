/**
 * LangSmith Observability Wrapper
 * Provides deep observability into agent execution and performance
 *
 * Features:
 * - Trace all agent executions
 * - Log tool calls and intermediate steps
 * - Track performance metrics
 * - Error monitoring and debugging
 * - Cost attribution
 */

import { Client } from 'langsmith';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TraceMetadata {
  agentId: string;
  userId: string;
  projectId?: string;
  sessionId?: string;
  tags?: string[];
}

export interface AgentTrace {
  traceId: string;
  name: string;
  input: any;
  output?: any;
  error?: any;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metadata: TraceMetadata;
  steps: TraceStep[];
  metrics: {
    tokensUsed?: number;
    cost?: number;
    toolCallsCount: number;
  };
}

export interface TraceStep {
  stepId: string;
  name: string;
  type: 'llm' | 'tool' | 'chain' | 'agent';
  input: any;
  output: any;
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: string;
}

class LangSmithWrapper {
  private client: Client | null = null;
  private enabled: boolean = false;
  private traces: Map<string, AgentTrace> = new Map();

  constructor() {
    // Initialize LangSmith client if API key is available
    const apiKey = process.env.LANGCHAIN_API_KEY;

    if (apiKey) {
      this.client = new Client({
        apiKey,
        apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'
      });
      this.enabled = true;
      console.log('[LangSmith] Observability enabled');
    } else {
      console.log('[LangSmith] Not configured - using local logging only');
    }
  }

  /**
   * Start a new trace
   */
  async startTrace(
    name: string,
    input: any,
    metadata: TraceMetadata
  ): Promise<string> {
    const traceId = this.generateTraceId();

    const trace: AgentTrace = {
      traceId,
      name,
      input,
      startTime: new Date(),
      metadata,
      steps: [],
      metrics: {
        toolCallsCount: 0
      }
    };

    this.traces.set(traceId, trace);

    // Send to LangSmith if enabled
    if (this.enabled && this.client) {
      try {
        await this.client.createRun({
          name,
          run_type: 'chain',
          inputs: { input },
          tags: metadata.tags || [],
          extra: {
            metadata: {
              agentId: metadata.agentId,
              userId: metadata.userId,
              projectId: metadata.projectId
            }
          }
        });
      } catch (error) {
        console.error('[LangSmith] Failed to create run:', error);
      }
    }

    return traceId;
  }

  /**
   * Log a step in the trace
   */
  async logStep(
    traceId: string,
    step: Omit<TraceStep, 'stepId' | 'duration'>
  ): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`[LangSmith] Trace ${traceId} not found`);
      return;
    }

    const stepId = this.generateStepId();
    const duration = step.endTime.getTime() - step.startTime.getTime();

    const fullStep: TraceStep = {
      stepId,
      ...step,
      duration
    };

    trace.steps.push(fullStep);

    // Count tool calls
    if (step.type === 'tool') {
      trace.metrics.toolCallsCount++;
    }

    // Log to LangSmith if enabled
    if (this.enabled && this.client) {
      try {
        await this.client.createRun({
          name: step.name,
          run_type: step.type,
          inputs: step.input,
          outputs: step.output,
          error: step.error,
          start_time: step.startTime.getTime(),
          end_time: step.endTime.getTime(),
          extra: {
            metadata: {
              traceId,
              stepId,
              agentId: trace.metadata.agentId
            }
          }
        });
      } catch (error) {
        console.error('[LangSmith] Failed to log step:', error);
      }
    }
  }

  /**
   * End a trace
   */
  async endTrace(
    traceId: string,
    output: any,
    metrics?: {
      tokensUsed?: number;
      cost?: number;
    }
  ): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`[LangSmith] Trace ${traceId} not found`);
      return;
    }

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.output = output;
    trace.metrics = {
      ...trace.metrics,
      ...metrics
    };

    // Save to database
    await this.saveTrace(trace);

    // Send to LangSmith if enabled
    if (this.enabled && this.client) {
      try {
        await this.client.createRun({
          name: trace.name,
          run_type: 'chain',
          inputs: { input: trace.input },
          outputs: { output },
          start_time: trace.startTime.getTime(),
          end_time: trace.endTime.getTime(),
          extra: {
            metadata: {
              ...trace.metadata,
              metrics: trace.metrics,
              stepsCount: trace.steps.length
            }
          }
        });
      } catch (error) {
        console.error('[LangSmith] Failed to end trace:', error);
      }
    }

    // Clean up
    this.traces.delete(traceId);
  }

  /**
   * Log an error in the trace
   */
  async logError(traceId: string, error: Error): Promise<void> {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`[LangSmith] Trace ${traceId} not found`);
      return;
    }

    trace.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();

    // Save to database
    await this.saveTrace(trace);

    // Send to LangSmith if enabled
    if (this.enabled && this.client) {
      try {
        await this.client.createRun({
          name: trace.name,
          run_type: 'chain',
          inputs: { input: trace.input },
          error: error.message,
          start_time: trace.startTime.getTime(),
          end_time: trace.endTime!.getTime(),
          extra: {
            metadata: {
              ...trace.metadata,
              errorStack: error.stack
            }
          }
        });
      } catch (langsmithError) {
        console.error('[LangSmith] Failed to log error:', langsmithError);
      }
    }

    // Clean up
    this.traces.delete(traceId);
  }

  /**
   * Save trace to database for local storage and analysis
   */
  private async saveTrace(trace: AgentTrace): Promise<void> {
    try {
      await supabase.from('agent_traces').insert({
        trace_id: trace.traceId,
        agent_id: trace.metadata.agentId,
        user_id: trace.metadata.userId,
        project_id: trace.metadata.projectId,
        name: trace.name,
        input: trace.input,
        output: trace.output,
        error: trace.error,
        start_time: trace.startTime.toISOString(),
        end_time: trace.endTime?.toISOString(),
        duration_ms: trace.duration,
        steps: trace.steps,
        metrics: trace.metrics,
        tags: trace.metadata.tags || [],
        session_id: trace.metadata.sessionId
      });
    } catch (error) {
      console.error('[LangSmith] Failed to save trace to database:', error);
    }
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string): Promise<AgentTrace | null> {
    try {
      const { data, error } = await supabase
        .from('agent_traces')
        .select('*')
        .eq('trace_id', traceId)
        .single();

      if (error) throw error;

      return data as any as AgentTrace;
    } catch (error) {
      console.error('[LangSmith] Failed to get trace:', error);
      return null;
    }
  }

  /**
   * Get traces for a user
   */
  async getUserTraces(
    userId: string,
    options?: {
      agentId?: string;
      projectId?: string;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<AgentTrace[]> {
    try {
      let query = supabase
        .from('agent_traces')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (options?.agentId) {
        query = query.eq('agent_id', options.agentId);
      }

      if (options?.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options?.startDate) {
        query = query.gte('start_time', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('start_time', options.endDate.toISOString());
      }

      query = query.limit(options?.limit || 100);

      const { data, error } = await query;

      if (error) throw error;

      return data as any as AgentTrace[];
    } catch (error) {
      console.error('[LangSmith] Failed to get user traces:', error);
      return [];
    }
  }

  /**
   * Get performance metrics for an agent
   */
  async getAgentMetrics(
    agentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    averageCost: number;
    totalTokensUsed: number;
    totalCost: number;
    errorRate: number;
    topErrors: Array<{ error: string; count: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('agent_traces')
        .select('*')
        .eq('agent_id', agentId)
        .gte('start_time', timeRange.start.toISOString())
        .lte('start_time', timeRange.end.toISOString());

      if (error) throw error;

      const traces = data as any as AgentTrace[];
      const totalExecutions = traces.length;
      const successfulTraces = traces.filter(t => !t.error);
      const errorTraces = traces.filter(t => t.error);

      const averageDuration = traces.reduce((sum, t) => sum + (t.duration || 0), 0) / totalExecutions;
      const totalTokensUsed = traces.reduce((sum, t) => sum + (t.metrics.tokensUsed || 0), 0);
      const totalCost = traces.reduce((sum, t) => sum + (t.metrics.cost || 0), 0);
      const averageCost = totalCost / totalExecutions;

      // Count errors
      const errorCounts = new Map<string, number>();
      errorTraces.forEach(trace => {
        const errorMsg = trace.error?.message || 'Unknown error';
        errorCounts.set(errorMsg, (errorCounts.get(errorMsg) || 0) + 1);
      });

      const topErrors = Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalExecutions,
        successRate: (successfulTraces.length / totalExecutions) * 100,
        averageDuration,
        averageCost,
        totalTokensUsed,
        totalCost,
        errorRate: (errorTraces.length / totalExecutions) * 100,
        topErrors
      };
    } catch (error) {
      console.error('[LangSmith] Failed to get agent metrics:', error);
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        averageCost: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        errorRate: 0,
        topErrors: []
      };
    }
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if LangSmith is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const langSmith = new LangSmithWrapper();

// Helper function to wrap agent execution with tracing
export async function traceAgentExecution<T>(
  name: string,
  metadata: TraceMetadata,
  input: any,
  execute: () => Promise<T>
): Promise<T> {
  const traceId = await langSmith.startTrace(name, input, metadata);

  try {
    const output = await execute();
    await langSmith.endTrace(traceId, output);
    return output;
  } catch (error: any) {
    await langSmith.logError(traceId, error);
    throw error;
  }
}
