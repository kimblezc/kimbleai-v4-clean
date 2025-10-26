/**
 * MCP Chat Integration
 *
 * Helper functions for integrating MCP tools into chat conversations.
 * Allows GPT-4 to discover and invoke MCP tools dynamically.
 */

import { getToolExecutor } from './mcp-tool-executor';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Get all available MCP tools formatted for OpenAI function calling
 */
export async function getMCPToolsForChat(): Promise<any[]> {
  try {
    const executor = getToolExecutor();
    const discoveryResults = await executor.discoverTools();

    const tools: any[] = [];

    for (const result of discoveryResults) {
      for (const tool of result.tools) {
        // Convert MCP tool to OpenAI function format
        tools.push({
          type: 'function',
          function: {
            name: `mcp_${result.serverName}_${tool.name}`,
            description: `[${result.serverName}] ${tool.description || tool.name}`,
            parameters: tool.inputSchema || {
              type: 'object',
              properties: {},
            },
          },
        });
      }
    }

    return tools;
  } catch (error: any) {
    console.error('Error fetching MCP tools for chat:', error);
    return [];
  }
}

/**
 * Invoke an MCP tool from chat
 * @param functionName - OpenAI function name (format: mcp_servername_toolname)
 * @param args - Tool arguments
 * @param userId - User ID for tracking
 * @param conversationId - Conversation ID for tracking
 */
export async function invokeMCPToolFromChat(
  functionName: string,
  args: Record<string, any>,
  userId?: string,
  conversationId?: string
): Promise<string> {
  try {
    // Parse function name: mcp_servername_toolname
    const parts = functionName.split('_');
    if (parts[0] !== 'mcp' || parts.length < 3) {
      return `Error: Invalid MCP function name format: ${functionName}`;
    }

    const serverName = parts[1];
    const toolName = parts.slice(2).join('_');

    console.log(`🔮 Invoking MCP tool: ${toolName} on server ${serverName}`);

    const executor = getToolExecutor();
    const result = await executor.invokeTool({
      toolName,
      arguments: args,
      userId,
      conversationId,
      // serverId will be auto-discovered based on toolName
    });

    if (result.success) {
      // Format result content
      if (Array.isArray(result.content)) {
        const textContent = result.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\\n\\n');

        return textContent || JSON.stringify(result.content);
      }

      return JSON.stringify(result.content);
    } else {
      return `Error invoking ${toolName}: ${result.error}`;
    }
  } catch (error: any) {
    console.error('Error invoking MCP tool from chat:', error);
    return `Error: ${error.message}`;
  }
}

/**
 * Get MCP tool calling instructions for the system prompt
 */
export function getMCPSystemPrompt(): string {
  return `
You have access to Model Context Protocol (MCP) tools through connected servers.

Available tool categories:
- GitHub: Repository access, code search, issue management
- Filesystem: Secure local file operations
- Memory: Persistent knowledge storage
- Slack: Channel messaging and management
- Notion: Page and database access
- PostgreSQL: Direct database queries
- Brave Search: Privacy-focused web search
- Puppeteer: Browser automation

When you need to:
- Search code or repositories → use GitHub tools
- Read/write local files → use Filesystem tools
- Remember information across conversations → use Memory tools
- Send messages or check Slack → use Slack tools
- Access Notion pages or databases → use Notion tools
- Query databases → use PostgreSQL tools
- Search the web → use Brave Search tools
- Automate browsers → use Puppeteer tools

Always explain what you're doing when calling MCP tools, and present results clearly to the user.
`.trim();
}

/**
 * Check if MCP tools are available
 */
export async function areMCPToolsAvailable(): Promise<boolean> {
  try {
    const tools = await getMCPToolsForChat();
    return tools.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get MCP tools summary for display
 */
export async function getMCPToolsSummary(): Promise<{
  available: boolean;
  totalTools: number;
  byServer: Record<string, number>;
}> {
  try {
    const executor = getToolExecutor();
    const discoveryResults = await executor.discoverTools();

    const byServer: Record<string, number> = {};
    let totalTools = 0;

    for (const result of discoveryResults) {
      byServer[result.serverName] = result.tools.length;
      totalTools += result.tools.length;
    }

    return {
      available: totalTools > 0,
      totalTools,
      byServer,
    };
  } catch (error) {
    return {
      available: false,
      totalTools: 0,
      byServer: {},
    };
  }
}
