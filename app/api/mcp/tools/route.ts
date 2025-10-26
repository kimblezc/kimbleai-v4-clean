/**
 * MCP Tools API
 *
 * Discover and invoke tools from MCP servers.
 *
 * @route GET /api/mcp/tools - List all available tools
 * @route POST /api/mcp/tools - Invoke a tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToolExecutor } from '@/lib/mcp/mcp-tool-executor';
import { getMCPServerManager } from '@/lib/mcp/mcp-server-manager';

/**
 * GET /api/mcp/tools
 * List all available tools across all MCP servers
 *
 * Query parameters:
 * - serverId: Filter by specific server ID
 * - search: Search tools by name or description
 * - category: Filter by category/tag
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const executor = getToolExecutor();

    let tools;

    if (serverId) {
      // Get tools from specific server
      tools = await executor.getToolsFromServer(serverId);
    } else if (search) {
      // Search tools by keyword
      tools = await executor.searchTools(search);
    } else if (category) {
      // Filter tools by category
      tools = await executor.getToolsByCategory(category);
    } else {
      // Get all tools
      tools = await executor.getAllTools();
    }

    // Get tool discovery results for context
    const discoveryResults = await executor.discoverTools();

    // Group tools by server
    const toolsByServer = discoveryResults.map((result) => ({
      serverId: result.serverId,
      serverName: result.serverName,
      tools: result.tools,
      toolCount: result.tools.length,
    }));

    // Get statistics
    const stats = await executor.getInvocationStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tools,
      totalTools: tools.length,
      toolsByServer,
      serversWithTools: discoveryResults.length,
      statistics: stats,
    });
  } catch (error: any) {
    console.error('Error fetching tools:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tools',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/tools
 * Invoke a tool on an MCP server
 *
 * Request body:
 * {
 *   toolName: string,
 *   arguments: Record<string, any>,
 *   serverId?: string (optional - will auto-discover if not provided),
 *   userId?: string,
 *   conversationId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolName, arguments: toolArguments, serverId, userId, conversationId } = body;

    // Validate required fields
    if (!toolName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tool name is required',
        },
        { status: 400 }
      );
    }

    if (!toolArguments || typeof toolArguments !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Tool arguments must be an object',
        },
        { status: 400 }
      );
    }

    // Invoke tool
    const executor = getToolExecutor();
    const result = await executor.invokeTool({
      toolName,
      arguments: toolArguments,
      serverId,
      userId,
      conversationId,
    });

    // Return result
    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      result: {
        serverId: result.serverId,
        toolName: result.toolName,
        content: result.content,
        structuredContent: result.structuredContent,
        error: result.error,
        errorCode: result.errorCode,
        executionTime: result.executionTime,
        executedAt: result.timestamp,
      },
    }, {
      status: result.success ? 200 : 500,
    });
  } catch (error: any) {
    console.error('Error invoking tool:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invoke tool',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mcp/tools/batch
 * Invoke multiple tools in parallel
 *
 * Request body:
 * {
 *   tools: Array<{
 *     toolName: string,
 *     arguments: Record<string, any>,
 *     serverId?: string,
 *     userId?: string,
 *     conversationId?: string
 *   }>
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { tools } = body;

    if (!Array.isArray(tools) || tools.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tools array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Validate each tool request
    for (const tool of tools) {
      if (!tool.toolName) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each tool must have a toolName',
          },
          { status: 400 }
        );
      }

      if (!tool.arguments || typeof tool.arguments !== 'object') {
        return NextResponse.json(
          {
            success: false,
            error: `Tool ${tool.toolName} must have arguments object`,
          },
          { status: 400 }
        );
      }
    }

    // Invoke tools in batch
    const executor = getToolExecutor();
    const results = await executor.invokeToolsBatch(tools);

    // Calculate statistics
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const totalExecutionTime = results.reduce(
      (sum, r) => sum + r.executionTime,
      0
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: results.map((result) => ({
        serverId: result.serverId,
        toolName: result.toolName,
        success: result.success,
        content: result.content,
        structuredContent: result.structuredContent,
        error: result.error,
        errorCode: result.errorCode,
        executionTime: result.executionTime,
        executedAt: result.timestamp,
      })),
      statistics: {
        totalTools: results.length,
        successCount,
        failureCount,
        successRate: (successCount / results.length) * 100,
        totalExecutionTime,
        averageExecutionTime: totalExecutionTime / results.length,
      },
    });
  } catch (error: any) {
    console.error('Error invoking tools batch:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invoke tools batch',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
