/**
 * MCP Monitoring Agent
 *
 * Autonomous agent that monitors MCP server health, detects issues,
 * and generates findings for the Archie dashboard.
 *
 * Runs on schedule via cron job to ensure all MCP servers are operational.
 */

import { createClient } from '@supabase/supabase-js';
import { activityStream } from '../activity-stream';
import { getMCPServerManager } from '../mcp/mcp-server-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * MCP Monitoring Agent
 * Checks server health and generates actionable findings
 */
export class MCPMonitoringAgent {
  private findings: Finding[] = [];

  /**
   * Run the monitoring check
   */
  async run(): Promise<void> {
    console.log('🔮 MCP Monitoring Agent: Starting health check...');

    activityStream.broadcast({
      agent: 'MCP Monitoring Agent',
      category: 'system',
      level: 'info',
      message: 'MCP Monitoring Agent: Starting server health check',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    try {
      this.findings = [];

      // Get server manager
      const manager = getMCPServerManager();
      const servers = manager.getAllServers();

      console.log(`📊 Checking ${servers.length} MCP servers...`);

      // Check each server
      for (const server of servers) {
        await this.checkServer(server);
      }

      // Generate summary findings
      await this.generateSummaryFindings(servers);

      // Save findings to database
      await this.saveFindings();

      // Broadcast completion
      activityStream.broadcast({
        agent: 'MCP Monitoring Agent',
        category: 'system',
        level: 'info',
        message: `MCP health check complete: ${this.findings.length} findings generated`,
        metadata: {
          totalServers: servers.length,
          connectedServers: servers.filter((s) => s.status === 'connected').length,
          findings: this.findings.length,
        },
      });

      console.log(`✅ MCP Monitoring Agent: Complete. ${this.findings.length} findings.`);
    } catch (error: any) {
      console.error('❌ MCP Monitoring Agent error:', error);

      activityStream.broadcast({
        agent: 'MCP Monitoring Agent',
        category: 'system',
        level: 'error',
        message: 'MCP Monitoring Agent failed',
        metadata: {
          error: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Check a single server for issues
   * @private
   */
  private async checkServer(server: any): Promise<void> {
    const { config, status, metrics, lastError, lastHealthCheck } = server;

    // Critical: Server in error state
    if (status === 'error') {
      this.findings.push({
        severity: 'critical',
        title: `MCP Server Error: ${config.name}`,
        description: lastError
          ? `Server is in error state: ${lastError.message}`
          : 'Server is in error state with unknown cause',
        action: 'Check server configuration and logs. Try reconnecting.',
        metadata: {
          serverId: server.id,
          serverName: config.name,
          transport: config.transport,
          errorCode: (lastError as any)?.code,
        },
      });

      activityStream.broadcast({
        agent: 'MCP Monitoring Agent',
        category: 'system',
        level: 'error',
        message: `MCP server ${config.name} is in error state`,
        metadata: {
          serverId: server.id,
          error: lastError?.message,
        },
      });
    }

    // High: Enabled server is disconnected
    if (config.enabled && status === 'disconnected') {
      this.findings.push({
        severity: 'high',
        title: `MCP Server Disconnected: ${config.name}`,
        description: `Enabled server is not connected. Tools and resources are unavailable.`,
        action: 'Connect to this server to restore functionality.',
        metadata: {
          serverId: server.id,
          serverName: config.name,
          transport: config.transport,
        },
      });

      activityStream.broadcast({
        agent: 'MCP Monitoring Agent',
        category: 'system',
        level: 'warning',
        message: `MCP server ${config.name} is disconnected`,
        metadata: {
          serverId: server.id,
        },
      });
    }

    // Medium: High error rate
    if (metrics.totalRequests > 10) {
      const errorRate =
        (metrics.failedRequests / metrics.totalRequests) * 100;

      if (errorRate > 20) {
        this.findings.push({
          severity: 'medium',
          title: `High Error Rate: ${config.name}`,
          description: `Server has ${Math.round(errorRate)}% error rate over ${metrics.totalRequests} requests`,
          action: 'Investigate server logs and connection stability.',
          metadata: {
            serverId: server.id,
            serverName: config.name,
            errorRate,
            totalRequests: metrics.totalRequests,
            failedRequests: metrics.failedRequests,
          },
        });
      }
    }

    // Low: Slow response times
    if (metrics.averageResponseTime > 5000) {
      this.findings.push({
        severity: 'low',
        title: `Slow Response Times: ${config.name}`,
        description: `Average response time is ${Math.round(metrics.averageResponseTime)}ms`,
        action: 'Consider optimizing server performance or network connection.',
        metadata: {
          serverId: server.id,
          serverName: config.name,
          averageResponseTime: metrics.averageResponseTime,
        },
      });
    }

    // Low: Health check overdue
    if (lastHealthCheck && status === 'connected') {
      const timeSinceCheck = Date.now() - new Date(lastHealthCheck).getTime();
      const expectedInterval = config.healthCheckInterval || 60000;

      if (timeSinceCheck > expectedInterval * 2) {
        this.findings.push({
          severity: 'low',
          title: `Health Check Overdue: ${config.name}`,
          description: `Last health check was ${Math.round(timeSinceCheck / 1000)}s ago (expected every ${expectedInterval / 1000}s)`,
          action: 'Health check process may be stalled. Consider restarting.',
          metadata: {
            serverId: server.id,
            serverName: config.name,
            lastHealthCheck,
            timeSinceCheck,
          },
        });
      }
    }
  }

  /**
   * Generate summary findings across all servers
   * @private
   */
  private async generateSummaryFindings(servers: any[]): Promise<void> {
    const enabled = servers.filter((s) => s.config.enabled);
    const connected = servers.filter((s) => s.status === 'connected');
    const errored = servers.filter((s) => s.status === 'error');

    // Critical: No servers connected
    if (enabled.length > 0 && connected.length === 0) {
      this.findings.push({
        severity: 'critical',
        title: 'No MCP Servers Connected',
        description: `${enabled.length} enabled servers but none are connected. MCP functionality is completely unavailable.`,
        action: 'Connect to at least one MCP server to enable integrations.',
        metadata: {
          enabledCount: enabled.length,
          connectedCount: connected.length,
        },
      });

      activityStream.broadcast({
        agent: 'MCP Monitoring Agent',
        category: 'system',
        level: 'error',
        message: 'CRITICAL: No MCP servers connected',
        metadata: {
          enabledServers: enabled.length,
        },
      });
    }

    // High: Multiple servers in error state
    if (errored.length >= 2) {
      this.findings.push({
        severity: 'high',
        title: 'Multiple MCP Servers in Error State',
        description: `${errored.length} servers are experiencing errors. This may indicate a systemic issue.`,
        action: 'Review system logs and check network connectivity.',
        metadata: {
          erroredServers: errored.map((s) => s.config.name),
          errorCount: errored.length,
        },
      });
    }

    // Medium: Low connection ratio
    if (enabled.length > 0) {
      const connectionRatio = (connected.length / enabled.length) * 100;

      if (connectionRatio < 50 && connectionRatio > 0) {
        this.findings.push({
          severity: 'medium',
          title: 'Low MCP Server Connection Rate',
          description: `Only ${connected.length} of ${enabled.length} enabled servers are connected (${Math.round(connectionRatio)}%)`,
          action: 'Check disconnected servers and attempt to reconnect.',
          metadata: {
            enabledCount: enabled.length,
            connectedCount: connected.length,
            connectionRatio,
          },
        });
      }
    }

    // Info: All systems operational
    if (enabled.length > 0 && connected.length === enabled.length && errored.length === 0) {
      activityStream.broadcast({
        agent: 'MCP Monitoring Agent',
        category: 'system',
        level: 'info',
        message: `All MCP servers operational (${connected.length}/${enabled.length})`,
        metadata: {
          connectedServers: connected.map((s) => s.config.name),
        },
      });
    }
  }

  /**
   * Save findings to database
   * @private
   */
  private async saveFindings(): Promise<void> {
    if (this.findings.length === 0) {
      console.log('No findings to save.');
      return;
    }

    try {
      const findingsToInsert = this.findings.map((finding) => ({
        type: 'mcp_health',
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        action: finding.action || null,
        metadata: finding.metadata || {},
        user_id: 'zach', // System-generated findings
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('agent_findings').insert(findingsToInsert);

      if (error) {
        console.error('Error saving findings:', error);
      } else {
        console.log(`💾 Saved ${findingsToInsert.length} findings to database`);
      }
    } catch (error: any) {
      console.error('Error saving findings:', error);
    }
  }

  /**
   * Get findings from this run
   */
  getFindings(): Finding[] {
    return this.findings;
  }
}

/**
 * Run the MCP monitoring agent (main entry point)
 */
export async function runMCPMonitoringAgent(): Promise<Finding[]> {
  const agent = new MCPMonitoringAgent();
  await agent.run();
  return agent.getFindings();
}
