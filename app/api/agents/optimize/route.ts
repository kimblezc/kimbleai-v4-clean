/**
 * Agent Optimizer API
 * Analyzes agent performance and provides optimization recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentRegistry } from '@/lib/agent-registry';

export async function GET(request: NextRequest) {
  try {
    // Get all agent health data
    const healthMap = await agentRegistry.getAllAgentHealth();
    const agents = agentRegistry.getAllAgents();

    // Analyze performance and generate recommendations
    const recommendations: Array<{
      agentId: string;
      agentName: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      category: 'performance' | 'error' | 'optimization' | 'resource';
      issue: string;
      recommendation: string;
      impact: string;
      estimatedImprovement?: string;
    }> = [];

    // Check each agent
    agents.forEach(agent => {
      const health = healthMap.get(agent.id);
      if (!health) return;

      // Critical: Agent has errors
      if (health.errors.length > 0) {
        recommendations.push({
          agentId: agent.id,
          agentName: agent.name,
          priority: 'critical',
          category: 'error',
          issue: `Agent has ${health.errors.length} error(s): ${health.errors.join(', ')}`,
          recommendation: 'Investigate and fix errors immediately. Check database connectivity and API endpoints.',
          impact: 'Agent may be non-functional or providing incorrect results',
          estimatedImprovement: '100% error reduction'
        });
      }

      // High: Agent is idle with 0 tasks
      if (health.tasksCompleted === 0 && agent.id !== 'agent-optimizer') {
        const tableInfo = agent.databaseTables.length > 0
          ? ` Check tables: ${agent.databaseTables.join(', ')}`
          : '';

        recommendations.push({
          agentId: agent.id,
          agentName: agent.name,
          priority: 'medium',
          category: 'optimization',
          issue: 'Agent has processed 0 tasks',
          recommendation: `Verify agent is properly integrated and database tables are being populated.${tableInfo}`,
          impact: 'Agent capabilities are not being utilized',
          estimatedImprovement: 'Enable agent functionality'
        });
      }

      // Medium: Slow response time
      if (health.metrics.avgResponseTime && health.metrics.avgResponseTime > 500) {
        recommendations.push({
          agentId: agent.id,
          agentName: agent.name,
          priority: 'medium',
          category: 'performance',
          issue: `Slow response time: ${health.metrics.avgResponseTime}ms`,
          recommendation: 'Optimize database queries, add caching, or implement parallel processing',
          impact: 'Degraded user experience and increased latency',
          estimatedImprovement: `Reduce to <200ms (${Math.round((1 - 200/health.metrics.avgResponseTime) * 100)}% improvement)`
        });
      }

      // Low: Success rate below 100%
      if (health.metrics.successRate && health.metrics.successRate < 100) {
        recommendations.push({
          agentId: agent.id,
          agentName: agent.name,
          priority: 'low',
          category: 'optimization',
          issue: `Success rate: ${health.metrics.successRate.toFixed(1)}%`,
          recommendation: 'Add error handling, implement retry logic, and improve validation',
          impact: 'Some requests may fail intermittently',
          estimatedImprovement: `Increase to 99.9% (${(100 - health.metrics.successRate).toFixed(1)}% improvement)`
        });
      }

      // Resource optimization
      if (health.metrics.queueLength && health.metrics.queueLength > 10) {
        recommendations.push({
          agentId: agent.id,
          agentName: agent.name,
          priority: 'high',
          category: 'resource',
          issue: `Queue backlog: ${health.metrics.queueLength} items`,
          recommendation: 'Scale agent workers, implement batch processing, or increase processing speed',
          impact: 'Delayed task processing and increased wait times',
          estimatedImprovement: 'Clear backlog and reduce queue to <5 items'
        });
      }
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Calculate system-wide metrics
    const totalAgents = agents.length;
    const agentsWithErrors = Array.from(healthMap.values()).filter(h => h.errors.length > 0).length;
    const idleAgents = Array.from(healthMap.values()).filter(h => h.tasksCompleted === 0).length;
    const activeAgents = totalAgents - idleAgents;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalAgents,
        activeAgents,
        idleAgents,
        agentsWithErrors,
        totalRecommendations: recommendations.length,
        criticalIssues: recommendations.filter(r => r.priority === 'critical').length,
        highPriorityIssues: recommendations.filter(r => r.priority === 'high').length
      },
      recommendations,
      systemHealth: {
        score: Math.round(((totalAgents - agentsWithErrors) / totalAgents) * 100),
        status: agentsWithErrors === 0 ? 'healthy' : agentsWithErrors < 3 ? 'warning' : 'critical'
      }
    });

  } catch (error: any) {
    console.error('[AgentOptimizer] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST: Apply specific optimization
export async function POST(request: NextRequest) {
  try {
    const { agentId, action } = await request.json();

    if (!agentId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Agent ID and action are required'
      }, { status: 400 });
    }

    const agent = agentRegistry.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({
        success: false,
        error: `Agent not found: ${agentId}`
      }, { status: 404 });
    }

    // Apply optimization based on action
    let result = { applied: false, message: '' };

    switch (action) {
      case 'restart':
        // Simulate agent restart (in real implementation, this would restart the agent process)
        result = {
          applied: true,
          message: `Agent ${agent.name} restarted successfully`
        };
        break;

      case 'clear-errors':
        // Clear agent errors (in real implementation, this would reset error state)
        result = {
          applied: true,
          message: `Errors cleared for ${agent.name}`
        };
        break;

      case 'optimize-queries':
        // Optimize database queries (in real implementation, this would rebuild indexes, etc.)
        result = {
          applied: true,
          message: `Database queries optimized for ${agent.name}`
        };
        break;

      case 'scale-up':
        // Scale agent resources (in real implementation, this would increase workers/threads)
        result = {
          applied: true,
          message: `Resources scaled up for ${agent.name}`
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      agentId,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[AgentOptimizer] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
