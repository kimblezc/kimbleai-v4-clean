/**
 * MCP Tool Executor
 *
 * High-level interface for discovering and invoking tools across
 * all connected MCP servers. Provides intelligent routing, metrics
 * tracking, and error handling.
 *
 * @module lib/mcp/mcp-tool-executor
 * @version 1.0.0
 */

import { getMCPServerManager } from './mcp-server-manager';
import { broadcastActivity } from '../activity-stream';
import type {
  ToolInvocationRequest,
  ToolInvocationResult,
  ToolDiscoveryResult,
  MCPServerInstance,
} from './types';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool Executor Configuration
 */
export interface ToolExecutorConfig {
  /** Enable caching of tool results (default: false) */
  enableCaching?: boolean;

  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;

  /** Maximum retry attempts for failed invocations (default: 2) */
  maxRetries?: number;

  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;

  /** Broadcast activity to activity stream (default: true) */
  broadcastActivity?: boolean;
}

/**
 * Cached tool result
 */
interface CachedToolResult {
  result: ToolInvocationResult;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * MCP Tool Executor
 * Manages tool discovery and invocation across all MCP servers
 */
export class MCPToolExecutor {
  private config: Required<ToolExecutorConfig>;
  private resultCache: Map<string, CachedToolResult> = new Map();

  constructor(config: ToolExecutorConfig = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? false,
      cacheTTL: config.cacheTTL ?? 5 * 60 * 1000, // 5 minutes
      maxRetries: config.maxRetries ?? 2,
      retryDelay: config.retryDelay ?? 1000,
      broadcastActivity: config.broadcastActivity ?? true,
    };
  }

  /**
   * Discover all available tools across all connected servers
   */
  async discoverTools(): Promise<ToolDiscoveryResult[]> {
    const manager = getMCPServerManager();
    const connectedServers = manager.getConnectedServers();

    const results: ToolDiscoveryResult[] = [];

    for (const server of connectedServers) {
      if (server.availableTools && server.availableTools.length > 0) {
        results.push({
          serverId: server.id,
          serverName: server.config.name,
          tools: server.availableTools,
        });
      }
    }

    // Broadcast discovery activity
    if (this.config.broadcastActivity) {
      const totalTools = results.reduce(
        (sum, result) => sum + result.tools.length,
        0
      );

      await broadcastActivity({
        category: 'system',
        level: 'info',
        message: `Discovered ${totalTools} tools across ${results.length} MCP servers`,
        context: {
          serversWithTools: results.length,
          totalTools,
        },
      });
    }

    return results;
  }

  /**
   * Get all available tools as a flat array
   */
  async getAllTools(): Promise<Tool[]> {
    const discoveryResults = await this.discoverTools();
    return discoveryResults.flatMap((result) => result.tools);
  }

  /**
   * Find a tool by name across all servers
   * Returns the server ID where the tool is available
   */
  async findTool(toolName: string): Promise<{
    serverId: string;
    serverName: string;
    tool: Tool;
  } | null> {
    const manager = getMCPServerManager();
    const connectedServers = manager.getConnectedServers();

    for (const server of connectedServers) {
      if (server.availableTools) {
        const tool = server.availableTools.find((t) => t.name === toolName);
        if (tool) {
          return {
            serverId: server.id,
            serverName: server.config.name,
            tool,
          };
        }
      }
    }

    return null;
  }

  /**
   * Find all servers that provide a specific tool
   */
  async findAllServersWithTool(toolName: string): Promise<
    Array<{
      serverId: string;
      serverName: string;
      tool: Tool;
    }>
  > {
    const manager = getMCPServerManager();
    const connectedServers = manager.getConnectedServers();

    const results: Array<{
      serverId: string;
      serverName: string;
      tool: Tool;
    }> = [];

    for (const server of connectedServers) {
      if (server.availableTools) {
        const tool = server.availableTools.find((t) => t.name === toolName);
        if (tool) {
          results.push({
            serverId: server.id,
            serverName: server.config.name,
            tool,
          });
        }
      }
    }

    return results;
  }

  /**
   * Invoke a tool with automatic server discovery
   * If serverId is not specified, will find the first server that provides the tool
   */
  async invokeTool(
    request: Omit<ToolInvocationRequest, 'serverId'> & { serverId?: string }
  ): Promise<ToolInvocationResult> {
    let serverId = request.serverId;

    // Find server if not specified
    if (!serverId) {
      const toolLocation = await this.findTool(request.toolName);
      if (!toolLocation) {
        const error: ToolInvocationResult = {
          success: false,
          serverId: 'unknown',
          toolName: request.toolName,
          error: `Tool '${request.toolName}' not found on any connected server`,
          errorCode: 'TOOL_NOT_FOUND',
          executionTime: 0,
          timestamp: new Date(),
        };

        // Broadcast error
        if (this.config.broadcastActivity) {
          await broadcastActivity({
            category: 'system',
            level: 'error',
            message: `Tool not found: ${request.toolName}`,
            context: {
              toolName: request.toolName,
            },
          });
        }

        return error;
      }

      serverId = toolLocation.serverId;
    }

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.getCachedResult(serverId, request.toolName, request.arguments);
      if (cached) {
        return cached;
      }
    }

    // Broadcast invocation start
    if (this.config.broadcastActivity) {
      await broadcastActivity({
        category: 'task_processing',
        level: 'info',
        message: `Invoking MCP tool: ${request.toolName}`,
        context: {
          toolName: request.toolName,
          serverId,
        },
      });
    }

    // Invoke with retries
    const result = await this.invokeWithRetries({
      ...request,
      serverId,
    } as ToolInvocationRequest);

    // Cache successful results
    if (this.config.enableCaching && result.success) {
      this.cacheResult(serverId, request.toolName, request.arguments, result);
    }

    // Broadcast result
    if (this.config.broadcastActivity) {
      await broadcastActivity({
        category: 'task_processing',
        level: result.success ? 'info' : 'error',
        message: result.success
          ? `Tool invocation completed: ${request.toolName}`
          : `Tool invocation failed: ${request.toolName}`,
        context: {
          toolName: request.toolName,
          serverId,
          success: result.success,
          executionTime: result.executionTime,
          error: result.error,
        },
      });
    }

    return result;
  }

  /**
   * Invoke tool with retry logic
   * @private
   */
  private async invokeWithRetries(
    request: ToolInvocationRequest,
    attempt: number = 0
  ): Promise<ToolInvocationResult> {
    const manager = getMCPServerManager();

    try {
      return await manager.invokeTool(request);
    } catch (error: any) {
      // Check if we should retry
      if (attempt < this.config.maxRetries) {
        console.log(
          `Retry attempt ${attempt + 1}/${this.config.maxRetries} for tool ${request.toolName}`
        );

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay)
        );

        // Retry
        return this.invokeWithRetries(request, attempt + 1);
      }

      // Max retries reached, return error result
      return {
        success: false,
        serverId: request.serverId,
        toolName: request.toolName,
        error: error.message || 'Unknown error',
        errorCode: error.code || 'INVOCATION_ERROR',
        executionTime: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Invoke multiple tools in parallel
   */
  async invokeToolsBatch(
    requests: Array<Omit<ToolInvocationRequest, 'serverId'> & { serverId?: string }>
  ): Promise<ToolInvocationResult[]> {
    const promises = requests.map((request) => this.invokeTool(request));
    return Promise.all(promises);
  }

  /**
   * Get tools by category/tag
   */
  async getToolsByCategory(category: string): Promise<Tool[]> {
    const allTools = await this.getAllTools();

    // Filter tools that have the category in their description or name
    return allTools.filter(
      (tool) =>
        tool.description?.toLowerCase().includes(category.toLowerCase()) ||
        tool.name.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Get tools from a specific server
   */
  async getToolsFromServer(serverId: string): Promise<Tool[]> {
    const manager = getMCPServerManager();
    const server = manager.getServer(serverId);

    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return server.availableTools || [];
  }

  /**
   * Search tools by keyword
   */
  async searchTools(keyword: string): Promise<Tool[]> {
    const allTools = await this.getAllTools();
    const lowerKeyword = keyword.toLowerCase();

    return allTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerKeyword) ||
        tool.description?.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get cache key for a tool invocation
   * @private
   */
  private getCacheKey(
    serverId: string,
    toolName: string,
    args: Record<string, any>
  ): string {
    return `${serverId}:${toolName}:${JSON.stringify(args)}`;
  }

  /**
   * Get cached result if available and not expired
   * @private
   */
  private getCachedResult(
    serverId: string,
    toolName: string,
    args: Record<string, any>
  ): ToolInvocationResult | null {
    const key = this.getCacheKey(serverId, toolName, args);
    const cached = this.resultCache.get(key);

    if (!cached) return null;

    // Check if expired
    if (cached.expiresAt < new Date()) {
      this.resultCache.delete(key);
      return null;
    }

    console.log(`📦 Cache hit for ${toolName}`);
    return cached.result;
  }

  /**
   * Cache a tool result
   * @private
   */
  private cacheResult(
    serverId: string,
    toolName: string,
    args: Record<string, any>,
    result: ToolInvocationResult
  ): void {
    const key = this.getCacheKey(serverId, toolName, args);
    const now = new Date();

    this.resultCache.set(key, {
      result,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + this.config.cacheTTL),
    });
  }

  /**
   * Clear cache for a specific tool or all tools
   */
  clearCache(toolName?: string): void {
    if (toolName) {
      // Clear cache for specific tool
      for (const [key] of this.resultCache) {
        if (key.includes(`:${toolName}:`)) {
          this.resultCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.resultCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
  } {
    const now = new Date();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.resultCache.values()) {
      if (cached.expiresAt >= now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.resultCache.size,
      validEntries,
      expiredEntries,
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanExpiredCache(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.resultCache) {
      if (cached.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.resultCache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get tool invocation statistics across all servers
   */
  async getInvocationStats(): Promise<{
    totalInvocations: number;
    successfulInvocations: number;
    failedInvocations: number;
    successRate: number;
    averageExecutionTime: number;
    byServer: Record<
      string,
      {
        serverName: string;
        invocations: number;
        successRate: number;
      }
    >;
  }> {
    const manager = getMCPServerManager();
    const servers = manager.getAllServers();

    let totalInvocations = 0;
    let successfulInvocations = 0;
    let failedInvocations = 0;
    let totalExecutionTime = 0;

    const byServer: Record<
      string,
      {
        serverName: string;
        invocations: number;
        successRate: number;
      }
    > = {};

    for (const server of servers) {
      const metrics = server.metrics;
      totalInvocations += metrics.totalRequests;
      successfulInvocations += metrics.successfulRequests;
      failedInvocations += metrics.failedRequests;
      totalExecutionTime +=
        metrics.averageResponseTime * metrics.totalRequests;

      if (metrics.totalRequests > 0) {
        byServer[server.id] = {
          serverName: server.config.name,
          invocations: metrics.totalRequests,
          successRate:
            (metrics.successfulRequests / metrics.totalRequests) * 100,
        };
      }
    }

    return {
      totalInvocations,
      successfulInvocations,
      failedInvocations,
      successRate:
        totalInvocations > 0
          ? (successfulInvocations / totalInvocations) * 100
          : 0,
      averageExecutionTime:
        totalInvocations > 0 ? totalExecutionTime / totalInvocations : 0,
      byServer,
    };
  }
}

/**
 * Create a new tool executor instance
 */
export function createToolExecutor(
  config?: ToolExecutorConfig
): MCPToolExecutor {
  return new MCPToolExecutor(config);
}

/**
 * Global tool executor instance (singleton pattern)
 */
let globalExecutor: MCPToolExecutor | null = null;

/**
 * Get the global tool executor instance
 */
export function getToolExecutor(): MCPToolExecutor {
  if (!globalExecutor) {
    globalExecutor = new MCPToolExecutor();
  }
  return globalExecutor;
}

/**
 * Helper function to quickly invoke a tool
 */
export async function invokeTool(
  toolName: string,
  args: Record<string, any>,
  options?: {
    serverId?: string;
    userId?: string;
    conversationId?: string;
  }
): Promise<ToolInvocationResult> {
  const executor = getToolExecutor();
  return executor.invokeTool({
    toolName,
    arguments: args,
    serverId: options?.serverId,
    userId: options?.userId,
    conversationId: options?.conversationId,
  });
}

/**
 * Helper function to discover all available tools
 */
export async function discoverTools(): Promise<ToolDiscoveryResult[]> {
  const executor = getToolExecutor();
  return executor.discoverTools();
}

/**
 * Helper function to search tools by keyword
 */
export async function searchTools(keyword: string): Promise<Tool[]> {
  const executor = getToolExecutor();
  return executor.searchTools(keyword);
}
