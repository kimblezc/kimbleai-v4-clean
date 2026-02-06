/**
 * Data Tools - Database and analytics operations
 */

import type { Tool, ToolContext, ToolResult } from './index';

/**
 * Get user's cost analytics
 */
const getCostAnalytics: Tool = {
  name: 'get_cost_analytics',
  description: 'Get AI usage cost breakdown by model and provider.',
  category: 'data',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Number of days to analyze (default: 30)',
      },
    },
  },
  execute: async (args: { days?: number }, context: ToolContext): Promise<ToolResult> => {
    const { days = 30 } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabaseClient
        .from('api_cost_tracking')
        .select('model, cost_usd, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Aggregate by model
      const byModel: Record<string, { count: number; cost: number }> = {};
      let totalCost = 0;

      (data || []).forEach((row: any) => {
        const model = row.model || 'unknown';
        const cost = parseFloat(row.cost_usd || '0');

        if (!byModel[model]) {
          byModel[model] = { count: 0, cost: 0 };
        }
        byModel[model].count++;
        byModel[model].cost += cost;
        totalCost += cost;
      });

      const breakdown = Object.entries(byModel)
        .map(([model, stats]) => ({
          model,
          requests: stats.count,
          cost: `$${stats.cost.toFixed(4)}`,
          percentage: `${((stats.cost / totalCost) * 100).toFixed(1)}%`,
        }))
        .sort((a, b) => parseFloat(b.cost.slice(1)) - parseFloat(a.cost.slice(1)));

      return {
        success: true,
        data: {
          period: `${days} days`,
          totalRequests: data?.length || 0,
          totalCost: `$${totalCost.toFixed(4)}`,
          breakdown,
        },
        display: {
          type: 'json',
          content: {
            period: `${days} days`,
            totalCost: `$${totalCost.toFixed(4)}`,
            breakdown,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics',
      };
    }
  },
};

/**
 * Get user memories
 */
const getMemories: Tool = {
  name: 'get_memories',
  description: 'Get saved memories/facts about the user.',
  category: 'data',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by category: preference, fact, instruction, context',
      },
      limit: {
        type: 'number',
        description: 'Maximum memories to return (default: 20)',
      },
    },
  },
  execute: async (args: { category?: string; limit?: number }, context: ToolContext): Promise<ToolResult> => {
    const { category, limit = 20 } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      let query = supabaseClient
        .from('user_memories')
        .select('id, key, value, category, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        // Table might not exist yet
        if (error.message.includes('does not exist')) {
          return {
            success: true,
            data: [],
            display: {
              type: 'text',
              content: 'No memories saved yet. Tell me to "remember" something!',
            },
          };
        }
        throw error;
      }

      const memories = (data || []).map((m: any) => ({
        key: m.key,
        value: m.value,
        category: m.category,
        updatedAt: m.updated_at,
      }));

      return {
        success: true,
        data: memories,
        display: {
          type: 'table',
          content: memories,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memories',
      };
    }
  },
};

/**
 * Save a memory
 */
const saveMemory: Tool = {
  name: 'save_memory',
  description: 'Save a fact or preference about the user for future reference.',
  category: 'data',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The topic or key (e.g., "favorite_color", "work_schedule")',
      },
      value: {
        type: 'string',
        description: 'The information to remember',
      },
      category: {
        type: 'string',
        enum: ['preference', 'fact', 'instruction', 'context'],
        description: 'Category of memory (default: fact)',
      },
    },
    required: ['key', 'value'],
  },
  execute: async (
    args: { key: string; value: string; category?: string },
    context: ToolContext
  ): Promise<ToolResult> => {
    const { key, value, category = 'fact' } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      const { data, error } = await supabaseClient
        .from('user_memories')
        .upsert(
          {
            user_id: userId,
            key,
            value,
            category,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,key',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          key: data.key,
          value: data.value,
          category: data.category,
        },
        display: {
          type: 'text',
          content: `Saved: "${key}" = "${value}"`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save memory',
      };
    }
  },
};

/**
 * Get project list
 */
const listProjects: Tool = {
  name: 'list_projects',
  description: 'List user projects and their conversation counts.',
  category: 'data',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum projects to return (default: 20)',
      },
    },
  },
  execute: async (args: { limit?: number }, context: ToolContext): Promise<ToolResult> => {
    const { limit = 20 } = args;
    const { userId, supabaseClient } = context;

    if (!supabaseClient) {
      return { success: false, error: 'Database connection not available' };
    }

    try {
      const { data, error } = await supabaseClient
        .from('projects')
        .select('id, name, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const projects = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description?.substring(0, 100),
        createdAt: p.created_at,
      }));

      return {
        success: true,
        data: projects,
        display: {
          type: 'table',
          content: projects,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list projects',
      };
    }
  },
};

/**
 * Calculate expression
 */
const calculate: Tool = {
  name: 'calculate',
  description: 'Perform mathematical calculations safely.',
  category: 'data',
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Math expression to evaluate (e.g., "2 + 2 * 3", "Math.sqrt(16)")',
      },
    },
    required: ['expression'],
  },
  execute: async (args: { expression: string }): Promise<ToolResult> => {
    const { expression } = args;

    try {
      // Sanitize: only allow numbers, operators, Math functions, parentheses
      const sanitized = expression.replace(/[^0-9+\-*/.()%\s]|Math\.[a-z]+/gi, (match) => {
        if (match.startsWith('Math.')) return match;
        return '';
      });

      // Use Function constructor for safer eval (still sandboxed)
      const result = new Function(`'use strict'; return (${sanitized})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return { success: false, error: 'Invalid calculation result' };
      }

      return {
        success: true,
        data: {
          expression: sanitized,
          result,
        },
        display: {
          type: 'text',
          content: `${sanitized} = ${result}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid expression',
      };
    }
  },
};

export const dataTools: Tool[] = [getCostAnalytics, getMemories, saveMemory, listProjects, calculate];
