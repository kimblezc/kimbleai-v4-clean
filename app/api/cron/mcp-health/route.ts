/**
 * MCP Health Check Cron Job
 *
 * Runs the MCP Monitoring Agent on a schedule to check server health,
 * detect issues, and generate findings for the Archie dashboard.
 *
 * @route GET /api/cron/mcp-health
 * @schedule Every 15 minutes (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMCPMonitoringAgent } from '@/lib/agents/mcp-agent';
import { initializeMCPServerManager } from '@/lib/mcp/mcp-server-manager';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for health checks

/**
 * GET /api/cron/mcp-health
 * Cron endpoint for MCP server health monitoring
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('🔮 MCP Health Check Cron: Starting...');

    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize MCP Server Manager (ensure it's loaded)
    try {
      await initializeMCPServerManager();
    } catch (error: any) {
      console.warn('MCP Server Manager already initialized or init failed:', error.message);
      // Continue anyway - manager may already be initialized
    }

    // Run the monitoring agent
    const findings = await runMCPMonitoringAgent();

    const duration = Date.now() - startTime;

    console.log(`✅ MCP Health Check Cron: Complete in ${duration}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      findings: findings.map((f) => ({
        severity: f.severity,
        title: f.title,
        description: f.description,
        action: f.action,
      })),
      summary: {
        totalFindings: findings.length,
        critical: findings.filter((f) => f.severity === 'critical').length,
        high: findings.filter((f) => f.severity === 'high').length,
        medium: findings.filter((f) => f.severity === 'medium').length,
        low: findings.filter((f) => f.severity === 'low').length,
      },
    });
  } catch (error: any) {
    console.error('❌ MCP Health Check Cron error:', error);

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: 'MCP health check failed',
        details: error.message,
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
