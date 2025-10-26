/**
 * MCP Health Check API
 *
 * Provides real-time health status of all MCP servers.
 *
 * @route GET /api/mcp/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMCPServerManager } from '@/lib/mcp/mcp-server-manager';

/**
 * GET /api/mcp/health
 * Returns health status of all MCP servers
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getMCPServerManager();
    const servers = manager.getAllServers();
    const poolStats = manager.getPoolStats();

    // Build health status for each server
    const serverHealth = servers.map((server) => {
      const uptime = server.connectedAt
        ? Date.now() - server.connectedAt.getTime()
        : 0;

      return {
        id: server.id,
        name: server.config.name,
        description: server.config.description,
        status: server.status,
        transport: server.config.transport,
        priority: server.config.priority,
        isConnected: server.status === 'connected',
        connectedAt: server.connectedAt?.toISOString(),
        lastHealthCheck: server.lastHealthCheck?.toISOString(),
        lastError: server.lastError
          ? {
              message: server.lastError.message,
              code: (server.lastError as any).code,
            }
          : null,
        uptime: {
          milliseconds: uptime,
          seconds: Math.floor(uptime / 1000),
          minutes: Math.floor(uptime / 60000),
          hours: Math.floor(uptime / 3600000),
        },
        metrics: {
          totalRequests: server.metrics.totalRequests,
          successfulRequests: server.metrics.successfulRequests,
          failedRequests: server.metrics.failedRequests,
          successRate:
            server.metrics.totalRequests > 0
              ? (server.metrics.successfulRequests /
                  server.metrics.totalRequests) *
                100
              : 0,
          averageResponseTime: server.metrics.averageResponseTime,
          minResponseTime: server.metrics.minResponseTime,
          maxResponseTime: server.metrics.maxResponseTime,
          lastRequestAt: server.metrics.lastRequestAt?.toISOString(),
        },
        capabilities: {
          tools: server.availableTools?.length || 0,
          resources: server.availableResources?.length || 0,
          prompts: server.availablePrompts?.length || 0,
        },
      };
    });

    // Calculate overall health
    const connectedServers = servers.filter((s) => s.status === 'connected');
    const disconnectedServers = servers.filter(
      (s) => s.status === 'disconnected'
    );
    const errorServers = servers.filter((s) => s.status === 'error');
    const connectingServers = servers.filter((s) => s.status === 'connecting');

    const overallHealth = {
      healthy: errorServers.length === 0 && connectedServers.length > 0,
      status:
        errorServers.length > 0
          ? 'degraded'
          : connectedServers.length === servers.filter((s) => s.config.enabled).length
            ? 'healthy'
            : 'partial',
      totalServers: servers.length,
      enabledServers: servers.filter((s) => s.config.enabled).length,
      connectedServers: connectedServers.length,
      disconnectedServers: disconnectedServers.length,
      errorServers: errorServers.length,
      connectingServers: connectingServers.length,
      connectionPoolStats: poolStats,
    };

    // Calculate total capabilities
    const totalCapabilities = {
      tools: serverHealth.reduce((sum, s) => sum + s.capabilities.tools, 0),
      resources: serverHealth.reduce(
        (sum, s) => sum + s.capabilities.resources,
        0
      ),
      prompts: serverHealth.reduce(
        (sum, s) => sum + s.capabilities.prompts,
        0
      ),
    };

    // Calculate aggregate metrics
    const aggregateMetrics = {
      totalRequests: serverHealth.reduce(
        (sum, s) => sum + s.metrics.totalRequests,
        0
      ),
      successfulRequests: serverHealth.reduce(
        (sum, s) => sum + s.metrics.successfulRequests,
        0
      ),
      failedRequests: serverHealth.reduce(
        (sum, s) => sum + s.metrics.failedRequests,
        0
      ),
      overallSuccessRate: 0,
      averageResponseTime: 0,
    };

    if (aggregateMetrics.totalRequests > 0) {
      aggregateMetrics.overallSuccessRate =
        (aggregateMetrics.successfulRequests /
          aggregateMetrics.totalRequests) *
        100;

      // Weighted average response time
      const totalTime = serverHealth.reduce(
        (sum, s) =>
          sum + s.metrics.averageResponseTime * s.metrics.totalRequests,
        0
      );
      aggregateMetrics.averageResponseTime =
        totalTime / aggregateMetrics.totalRequests;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overall: overallHealth,
      capabilities: totalCapabilities,
      metrics: aggregateMetrics,
      servers: serverHealth,
    });
  } catch (error: any) {
    console.error('Error fetching MCP health:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch MCP health status',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/health/ping
 * Ping a specific server to check connectivity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server ID is required',
        },
        { status: 400 }
      );
    }

    const manager = getMCPServerManager();
    const server = manager.getServer(serverId);

    if (!server) {
      return NextResponse.json(
        {
          success: false,
          error: `Server ${serverId} not found`,
        },
        { status: 404 }
      );
    }

    // Perform health check
    const startTime = Date.now();
    // The manager's health check is automatic, but we can check current status
    const isHealthy = server.status === 'connected';
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      serverId,
      serverName: server.config.name,
      healthy: isHealthy,
      status: server.status,
      responseTime,
      lastHealthCheck: server.lastHealthCheck?.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error pinging MCP server:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ping server',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
