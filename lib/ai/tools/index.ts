/**
 * Tool Framework - Agentic Tool Calling for KimbleAI
 *
 * Provides a unified interface for AI models to call tools.
 * Supports OpenAI function calling and Anthropic tool use.
 *
 * GPT-5.2 Best Practice: No sprawling system prompts needed -
 * models execute cleanly with simple tool definitions.
 */

import { webTools } from './web';
import { fileTools } from './files';
import { calendarTools } from './calendar';
import { dataTools } from './data';

export interface Tool {
  name: string;
  description: string;
  category: 'web' | 'files' | 'calendar' | 'email' | 'data' | 'code' | 'mcp';
  requiresConfirmation: boolean;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  conversationId?: string;
  projectId?: string;
  googleAccessToken?: string;
  supabaseClient?: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  display?: {
    type: 'text' | 'json' | 'table' | 'image' | 'link';
    content: any;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'pending' | 'confirmed' | 'executed' | 'rejected' | 'error';
  result?: ToolResult;
}

// Tool registry
const toolRegistry: Map<string, Tool> = new Map();

/**
 * Register a tool
 */
export function registerTool(tool: Tool): void {
  toolRegistry.set(tool.name, tool);
}

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name);
}

/**
 * Get all registered tools
 */
export function getAllTools(): Tool[] {
  return Array.from(toolRegistry.values());
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: Tool['category']): Tool[] {
  return getAllTools().filter((tool) => tool.category === category);
}

/**
 * Format tools for OpenAI function calling
 */
export function formatToolsForOpenAI(): any[] {
  return getAllTools().map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

/**
 * Format tools for Anthropic tool use
 */
export function formatToolsForAnthropic(): any[] {
  return getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

/**
 * Execute a tool call
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  const tool = getTool(toolName);

  if (!tool) {
    return {
      success: false,
      error: `Tool "${toolName}" not found`,
    };
  }

  try {
    console.log(`[Tools] Executing ${toolName} with args:`, args);
    const result = await tool.execute(args, context);
    console.log(`[Tools] ${toolName} result:`, result.success ? 'success' : result.error);
    return result;
  } catch (error) {
    console.error(`[Tools] Error executing ${toolName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a tool requires user confirmation
 */
export function requiresConfirmation(toolName: string): boolean {
  const tool = getTool(toolName);
  return tool?.requiresConfirmation ?? true;
}

/**
 * Initialize all tools
 */
export function initializeTools(): void {
  // Register web tools
  webTools.forEach(registerTool);

  // Register file tools
  fileTools.forEach(registerTool);

  // Register calendar tools
  calendarTools.forEach(registerTool);

  // Register data tools
  dataTools.forEach(registerTool);

  console.log(`[Tools] Initialized ${toolRegistry.size} tools`);
}

// Auto-initialize on import
initializeTools();

// Export tool arrays for direct access
export { webTools } from './web';
export { fileTools } from './files';
export { calendarTools } from './calendar';
export { dataTools } from './data';
