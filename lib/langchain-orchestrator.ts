/**
 * LangChain Agent Orchestration System
 * Provides modern agent framework integration for KimbleAI
 *
 * Features:
 * - LangChain-based agent coordination
 * - Tool calling with function schemas
 * - Memory management
 * - LangSmith observability integration
 * - Multi-step reasoning
 */

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { BufferMemory } from 'langchain/memory';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Enable LangSmith tracing if configured
const tracingEnabled = process.env.LANGCHAIN_TRACING_V2 === 'true';

export interface AgentToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (input: any) => Promise<any>;
}

export interface LangChainAgentConfig {
  agentId: string;
  userId: string;
  projectId?: string;
  model?: string;
  temperature?: number;
  maxIterations?: number;
  tools: AgentToolDefinition[];
  systemPrompt: string;
}

export class LangChainOrchestrator {
  private model: ChatOpenAI;
  private memory: BufferMemory;
  private tools: DynamicStructuredTool[];
  private agent: AgentExecutor | null = null;
  private config: LangChainAgentConfig;

  constructor(config: LangChainAgentConfig) {
    this.config = config;

    // Initialize LangChain model with optional LangSmith tracing
    this.model = new ChatOpenAI({
      modelName: config.model || 'gpt-4o',
      temperature: config.temperature || 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      configuration: {
        // Enable LangSmith if configured
        ...(tracingEnabled && {
          callbacks: [{
            handleLLMStart: async (llm, prompts) => {
              console.log(`[LangSmith] LLM Start: ${config.agentId}`);
            },
            handleLLMEnd: async (output) => {
              console.log(`[LangSmith] LLM End: ${config.agentId}`);
            },
            handleLLMError: async (err) => {
              console.error(`[LangSmith] LLM Error: ${config.agentId}`, err);
            }
          }]
        })
      }
    });

    // Initialize memory for conversation context
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'chat_history',
      inputKey: 'input',
      outputKey: 'output'
    });

    // Convert tool definitions to LangChain tools
    this.tools = config.tools.map(toolDef =>
      new DynamicStructuredTool({
        name: toolDef.name,
        description: toolDef.description,
        schema: toolDef.schema,
        func: async (input) => {
          try {
            const result = await toolDef.execute(input);
            return JSON.stringify(result);
          } catch (error: any) {
            console.error(`[LangChain] Tool ${toolDef.name} error:`, error);
            return JSON.stringify({ error: error.message });
          }
        }
      })
    );

    this.initializeAgent();
  }

  private async initializeAgent() {
    // Create prompt template with system message and tool calling
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', this.config.systemPrompt],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad')
    ]);

    // Create OpenAI Functions Agent
    const agent = await createOpenAIFunctionsAgent({
      llm: this.model,
      tools: this.tools,
      prompt
    });

    // Create agent executor with memory
    this.agent = new AgentExecutor({
      agent,
      tools: this.tools,
      memory: this.memory,
      maxIterations: this.config.maxIterations || 10,
      verbose: true, // Enable for debugging
      returnIntermediateSteps: true
    });
  }

  /**
   * Execute agent with input and return result
   */
  async execute(input: string): Promise<{
    output: string;
    intermediateSteps: any[];
    metadata: {
      agentId: string;
      userId: string;
      toolsUsed: string[];
      iterations: number;
      tokensUsed?: number;
    };
  }> {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    const startTime = Date.now();

    try {
      // Execute agent
      const result = await this.agent.invoke({
        input
      });

      const toolsUsed = result.intermediateSteps?.map((step: any) =>
        step.action?.tool || 'unknown'
      ) || [];

      const metadata = {
        agentId: this.config.agentId,
        userId: this.config.userId,
        toolsUsed: [...new Set(toolsUsed)],
        iterations: result.intermediateSteps?.length || 0,
        executionTime: Date.now() - startTime
      };

      // Log execution for observability
      await this.logExecution(input, result.output, metadata);

      return {
        output: result.output,
        intermediateSteps: result.intermediateSteps || [],
        metadata
      };

    } catch (error: any) {
      console.error('[LangChain] Agent execution error:', error);

      // Log error
      await this.logError(input, error);

      throw error;
    }
  }

  /**
   * Log execution for observability
   */
  private async logExecution(input: string, output: string, metadata: any) {
    try {
      await supabase.from('agent_execution_logs').insert({
        agent_id: this.config.agentId,
        user_id: this.config.userId,
        project_id: this.config.projectId,
        input,
        output,
        tools_used: metadata.toolsUsed,
        iterations: metadata.iterations,
        execution_time_ms: metadata.executionTime,
        timestamp: new Date().toISOString(),
        metadata: {
          model: this.config.model || 'gpt-4o',
          temperature: this.config.temperature || 0.7
        }
      });
    } catch (error) {
      console.error('[LangChain] Failed to log execution:', error);
    }
  }

  /**
   * Log error for debugging
   */
  private async logError(input: string, error: Error) {
    try {
      await supabase.from('agent_execution_logs').insert({
        agent_id: this.config.agentId,
        user_id: this.config.userId,
        project_id: this.config.projectId,
        input,
        output: null,
        error: error.message,
        error_stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('[LangChain] Failed to log error:', logError);
    }
  }

  /**
   * Clear memory
   */
  async clearMemory() {
    await this.memory.clear();
  }

  /**
   * Get conversation history
   */
  async getHistory() {
    return await this.memory.loadMemoryVariables({});
  }
}

/**
 * Create a search tool for agents
 */
export function createSearchTool(): AgentToolDefinition {
  return {
    name: 'web_search',
    description: 'Search the web for current information. Use this when you need up-to-date information or need to research a topic.',
    schema: z.object({
      query: z.string().describe('The search query')
    }),
    execute: async ({ query }) => {
      // This will be implemented with Tavily or other search API
      // For now, return a placeholder
      return {
        results: [],
        message: 'Search tool not yet configured with API key'
      };
    }
  };
}

/**
 * Create a knowledge base search tool
 */
export function createKnowledgeBaseTool(userId: string): AgentToolDefinition {
  return {
    name: 'search_knowledge_base',
    description: 'Search the user\'s knowledge base for relevant information from past conversations and documents.',
    schema: z.object({
      query: z.string().describe('The search query'),
      limit: z.number().optional().describe('Number of results to return (default 5)')
    }),
    execute: async ({ query, limit = 5 }) => {
      try {
        const { data, error } = await supabase
          .from('knowledge_base')
          .select('*')
          .eq('user_id', userId)
          .textSearch('content', query)
          .limit(limit);

        if (error) throw error;

        return {
          results: data || [],
          count: data?.length || 0
        };
      } catch (error: any) {
        return {
          error: error.message,
          results: []
        };
      }
    }
  };
}

/**
 * Create a file access tool
 */
export function createFileAccessTool(userId: string): AgentToolDefinition {
  return {
    name: 'access_file',
    description: 'Access a file from the user\'s storage by filename or ID.',
    schema: z.object({
      filename: z.string().optional().describe('The filename to search for'),
      fileId: z.string().optional().describe('The file ID if known')
    }),
    execute: async ({ filename, fileId }) => {
      try {
        let query = supabase
          .from('files')
          .select('*')
          .eq('user_id', userId);

        if (fileId) {
          query = query.eq('id', fileId);
        } else if (filename) {
          query = query.ilike('filename', `%${filename}%`);
        }

        const { data, error } = await query.limit(5);

        if (error) throw error;

        return {
          files: data || [],
          count: data?.length || 0
        };
      } catch (error: any) {
        return {
          error: error.message,
          files: []
        };
      }
    }
  };
}

/**
 * Create calculator tool for math operations
 */
export function createCalculatorTool(): AgentToolDefinition {
  return {
    name: 'calculator',
    description: 'Perform mathematical calculations. Input should be a valid mathematical expression.',
    schema: z.object({
      expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2" or "sqrt(16)")')
    }),
    execute: async ({ expression }) => {
      try {
        // Safe eval using Function constructor
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
        const result = Function(`"use strict"; return (${sanitized})`)();

        return {
          expression,
          result,
          success: true
        };
      } catch (error: any) {
        return {
          expression,
          error: error.message,
          success: false
        };
      }
    }
  };
}

/**
 * Example: Create a research agent with LangChain
 */
export async function createResearchAgent(userId: string, projectId?: string) {
  const tools = [
    createSearchTool(),
    createKnowledgeBaseTool(userId),
    createFileAccessTool(userId)
  ];

  const orchestrator = new LangChainOrchestrator({
    agentId: 'research-agent',
    userId,
    projectId,
    model: 'gpt-4o',
    temperature: 0.7,
    maxIterations: 10,
    tools,
    systemPrompt: `You are a research assistant with access to web search and the user's knowledge base.

Your goal is to:
1. Understand the user's research question
2. Search for relevant information using available tools
3. Synthesize findings into a comprehensive answer
4. Cite your sources

Always be thorough, accurate, and cite where you found information.`
  });

  return orchestrator;
}
