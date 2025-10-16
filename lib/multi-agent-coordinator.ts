/**
 * Multi-Agent Coordination System
 * Enables agents to work together on complex tasks
 *
 * Features:
 * - Sequential agent chaining
 * - Parallel agent execution
 * - Dynamic agent routing
 * - Shared context and memory
 * - LangGraph-style workflows
 */

import { LangChainOrchestrator, AgentToolDefinition } from './langchain-orchestrator';
import { langSmith } from './langsmith-wrapper';
import { z } from 'z od';

export interface AgentTask {
  taskId: string;
  agentId: string;
  input: any;
  dependencies?: string[]; // Task IDs that must complete first
  timeout?: number;
}

export interface AgentWorkflow {
  workflowId: string;
  name: string;
  tasks: AgentTask[];
  mode: 'sequential' | 'parallel' | 'dynamic';
  sharedContext?: any;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  results: Map<string, any>;
  errors: Map<string, Error>;
  duration: number;
}

class MultiAgentCoordinator {
  private agents: Map<string, LangChainOrchestrator> = new Map();
  private activeWorkflows: Map<string, AgentWorkflow> = new Map();

  /**
   * Register an agent for coordination
   */
  registerAgent(agentId: string, agent: LangChainOrchestrator) {
    this.agents.set(agentId, agent);
    console.log(`[MultiAgent] Registered agent: ${agentId}`);
  }

  /**
   * Execute a workflow of multiple agents
   */
  async executeWorkflow(workflow: AgentWorkflow, userId: string): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results = new Map<string, any>();
    const errors = new Map<string, Error>();

    this.activeWorkflows.set(workflow.workflowId, workflow);

    // Start trace
    const traceId = await langSmith.startTrace(
      workflow.name,
      { workflow },
      { agentId: 'multi-agent-coordinator', userId }
    );

    try {
      switch (workflow.mode) {
        case 'sequential':
          await this.executeSequential(workflow, results, errors, userId);
          break;
        case 'parallel':
          await this.executeParallel(workflow, results, errors, userId);
          break;
        case 'dynamic':
          await this.executeDynamic(workflow, results, errors, userId);
          break;
      }

      const duration = Date.now() - startTime;

      // End trace
      await langSmith.endTrace(traceId, {
        results: Array.from(results.entries()),
        errors: Array.from(errors.entries())
      });

      return {
        workflowId: workflow.workflowId,
        success: errors.size === 0,
        results,
        errors,
        duration
      };

    } catch (error: any) {
      await langSmith.logError(traceId, error);
      throw error;
    } finally {
      this.activeWorkflows.delete(workflow.workflowId);
    }
  }

  /**
   * Execute agents sequentially (one after another)
   */
  private async executeSequential(
    workflow: AgentWorkflow,
    results: Map<string, any>,
    errors: Map<string, Error>,
    userId: string
  ): Promise<void> {
    for (const task of workflow.tasks) {
      try {
        console.log(`[MultiAgent] Executing task ${task.taskId} with agent ${task.agentId}`);

        const agent = this.agents.get(task.agentId);
        if (!agent) {
          throw new Error(`Agent ${task.agentId} not found`);
        }

        // Merge shared context with task input
        const input = {
          ...workflow.sharedContext,
          ...task.input,
          previousResults: Object.fromEntries(results)
        };

        // Execute agent
        const result = await agent.execute(JSON.stringify(input));

        results.set(task.taskId, result.output);

      } catch (error: any) {
        console.error(`[MultiAgent] Task ${task.taskId} failed:`, error);
        errors.set(task.taskId, error);

        // Stop workflow on error in sequential mode
        break;
      }
    }
  }

  /**
   * Execute agents in parallel (all at once)
   */
  private async executeParallel(
    workflow: AgentWorkflow,
    results: Map<string, any>,
    errors: Map<string, Error>,
    userId: string
  ): Promise<void> {
    const promises = workflow.tasks.map(async (task) => {
      try {
        console.log(`[MultiAgent] Executing task ${task.taskId} with agent ${task.agentId}`);

        const agent = this.agents.get(task.agentId);
        if (!agent) {
          throw new Error(`Agent ${task.agentId} not found`);
        }

        // Merge shared context with task input
        const input = {
          ...workflow.sharedContext,
          ...task.input
        };

        // Execute agent with timeout
        const result = await Promise.race([
          agent.execute(JSON.stringify(input)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Task timeout')), task.timeout || 60000)
          )
        ]) as any;

        results.set(task.taskId, result.output);

      } catch (error: any) {
        console.error(`[MultiAgent] Task ${task.taskId} failed:`, error);
        errors.set(task.taskId, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Execute agents dynamically based on results
   */
  private async executeDynamic(
    workflow: AgentWorkflow,
    results: Map<string, any>,
    errors: Map<string, Error>,
    userId: string
  ): Promise<void> {
    const completed = new Set<string>();
    const pending = new Set(workflow.tasks.map(t => t.taskId));

    while (pending.size > 0) {
      // Find tasks whose dependencies are met
      const readyTasks = workflow.tasks.filter(task => {
        if (completed.has(task.taskId)) return false;
        if (!pending.has(task.taskId)) return false;

        const depsmet = !task.dependencies || task.dependencies.every(dep => completed.has(dep));
        return depsmet;
      });

      if (readyTasks.length === 0) {
        console.error('[MultiAgent] No tasks ready - possible circular dependency');
        break;
      }

      // Execute ready tasks in parallel
      const promises = readyTasks.map(async (task) => {
        try {
          console.log(`[MultiAgent] Executing task ${task.taskId} with agent ${task.agentId}`);

          const agent = this.agents.get(task.agentId);
          if (!agent) {
            throw new Error(`Agent ${task.agentId} not found`);
          }

          // Merge shared context with task input and dependency results
          const dependencyResults: any = {};
          if (task.dependencies) {
            for (const depId of task.dependencies) {
              dependencyResults[depId] = results.get(depId);
            }
          }

          const input = {
            ...workflow.sharedContext,
            ...task.input,
            dependencies: dependencyResults
          };

          // Execute agent
          const result = await agent.execute(JSON.stringify(input));

          results.set(task.taskId, result.output);
          completed.add(task.taskId);
          pending.delete(task.taskId);

        } catch (error: any) {
          console.error(`[MultiAgent] Task ${task.taskId} failed:`, error);
          errors.set(task.taskId, error);
          completed.add(task.taskId);
          pending.delete(task.taskId);
        }
      });

      await Promise.allSettled(promises);
    }
  }

  /**
   * Create a research workflow (example)
   */
  createResearchWorkflow(query: string, userId: string): AgentWorkflow {
    return {
      workflowId: `research_${Date.now()}`,
      name: 'Multi-Agent Research Workflow',
      mode: 'sequential',
      tasks: [
        {
          taskId: 'search',
          agentId: 'research-agent',
          input: {
            action: 'search',
            query
          }
        },
        {
          taskId: 'analyze',
          agentId: 'analysis-agent',
          input: {
            action: 'analyze'
          },
          dependencies: ['search']
        },
        {
          taskId: 'summarize',
          agentId: 'summary-agent',
          input: {
            action: 'summarize'
          },
          dependencies: ['analyze']
        }
      ],
      sharedContext: {
        userId,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a parallel processing workflow (example)
   */
  createParallelWorkflow(tasks: string[], userId: string): AgentWorkflow {
    return {
      workflowId: `parallel_${Date.now()}`,
      name: 'Parallel Processing Workflow',
      mode: 'parallel',
      tasks: tasks.map((task, idx) => ({
        taskId: `task_${idx}`,
        agentId: 'worker-agent',
        input: { task },
        timeout: 30000
      })),
      sharedContext: {
        userId,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Route a request to the appropriate agent
   */
  async routeToAgent(
    input: string,
    userId: string,
    projectId?: string
  ): Promise<{
    agentId: string;
    result: any;
  }> {
    // Use an LLM to determine which agent should handle the request
    const router = await this.createRouter(userId, projectId);

    const result = await router.execute(input);

    // Parse routing decision
    const decision = this.parseRoutingDecision(result.output);

    // Execute with selected agent
    const selectedAgent = this.agents.get(decision.agentId);
    if (!selectedAgent) {
      throw new Error(`Agent ${decision.agentId} not found`);
    }

    const finalResult = await selectedAgent.execute(decision.modifiedInput || input);

    return {
      agentId: decision.agentId,
      result: finalResult
    };
  }

  /**
   * Create a router agent
   */
  private async createRouter(userId: string, projectId?: string): Promise<LangChainOrchestrator> {
    const routingTool: AgentToolDefinition = {
      name: 'route_to_agent',
      description: 'Route the user request to the most appropriate agent',
      schema: z.object({
        agentId: z.string().describe('The ID of the agent to route to'),
        reasoning: z.string().describe('Why this agent was selected'),
        modifiedInput: z.string().optional().describe('Modified input for the selected agent')
      }),
      execute: async (input) => input
    };

    return new LangChainOrchestrator({
      agentId: 'router',
      userId,
      projectId,
      model: 'gpt-4o-mini',
      temperature: 0.3,
      tools: [routingTool],
      systemPrompt: `You are a router agent. Analyze the user's request and determine which agent should handle it.

Available agents:
- research-agent: For web searches and research tasks
- audio-agent: For audio transcription and analysis
- drive-agent: For Google Drive file operations
- vision-agent: For image analysis
- email-agent: For email operations
- calendar-agent: For calendar operations

Select the most appropriate agent and provide reasoning.`
    });
  }

  private parseRoutingDecision(output: string): {
    agentId: string;
    reasoning: string;
    modifiedInput?: string;
  } {
    try {
      return JSON.parse(output);
    } catch {
      return {
        agentId: 'research-agent',
        reasoning: 'Failed to parse routing decision, defaulting to research agent'
      };
    }
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(): AgentWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(workflowId: string): Promise<boolean> {
    return this.activeWorkflows.delete(workflowId);
  }
}

// Export singleton instance
export const multiAgentCoordinator = new MultiAgentCoordinator();

/**
 * Helper function to create a simple sequential workflow
 */
export function createSequentialWorkflow(
  name: string,
  tasks: Array<{ agentId: string; input: any }>,
  sharedContext?: any
): AgentWorkflow {
  return {
    workflowId: `workflow_${Date.now()}`,
    name,
    mode: 'sequential',
    tasks: tasks.map((task, idx) => ({
      taskId: `task_${idx}`,
      agentId: task.agentId,
      input: task.input
    })),
    sharedContext
  };
}
