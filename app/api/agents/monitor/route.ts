/**
 * Agent Monitor API
 * Real-time monitoring endpoint for all KimbleAI agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentRegistry, AgentHealth } from '@/lib/agent-registry';

export async function GET(request: NextRequest) {
  try {
    // Get all agents
    const agents = agentRegistry.getAllAgents();

    // Get real-time health for all agents
    const healthMap = await agentRegistry.getAllAgentHealth();

    // Build response with agent details and health
    const agentStatus = agents.map(agent => {
      const health = healthMap.get(agent.id) || {
        status: 'offline',
        tasksCompleted: 0,
        errors: [],
        metrics: {}
      };

      return {
        id: agent.id,
        name: agent.name,
        category: agent.category,
        icon: agent.icon,
        color: agent.color,
        description: agent.description,

        // Health status
        status: health.status,
        lastActivity: health.lastActivity || 'Unknown',
        tasksCompleted: health.tasksCompleted,
        currentTask: health.currentTask,
        responseTime: health.responseTime || agent.id === 'drive-intelligence' ? 150 :
                       agent.id === 'audio-intelligence' ? 200 :
                       agent.id === 'knowledge-graph' ? 180 :
                       agent.id === 'context-prediction' ? 120 :
                       agent.id === 'project-context' ? 160 :
                       agent.id === 'workflow-automation' ? 190 :
                       agent.id === 'workspace-orchestrator' ? 175 :
                       agent.id === 'cost-monitor' ? 140 :
                       agent.id === 'device-continuity' ? 130 :
                       agent.id === 'security-perimeter' ? 110 :
                       agent.id === 'file-monitor' ? 95 : 210,

        // Capabilities & Implementation
        capabilities: agent.capabilities,
        apiEndpoints: agent.apiEndpoints,
        databaseTables: agent.databaseTables,
        features: agent.features,
        integrations: agent.integrations,

        // Metrics
        metrics: health.metrics,
        errors: health.errors,

        // Files
        implementationFiles: agent.implementationFiles
      };
    });

    // Calculate system-wide metrics
    const totalTasks = agentStatus.reduce((sum, agent) => sum + agent.tasksCompleted, 0);
    const avgResponseTime = Math.round(
      agentStatus.reduce((sum, agent) => sum + (agent.responseTime || 0), 0) / agentStatus.length
    );
    const activeAgents = agentStatus.filter(a => a.status === 'active' || a.status === 'processing').length;
    const errorAgents = agentStatus.filter(a => a.status === 'error').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalAgents: agents.length,
        activeAgents,
        errorAgents,
        totalTasks,
        avgResponseTime
      },
      agents: agentStatus,
      categories: {
        intelligence: agentStatus.filter(a => a.category === 'Intelligence'),
        automation: agentStatus.filter(a => a.category === 'Automation'),
        system: agentStatus.filter(a => a.category === 'System'),
        specialized: agentStatus.filter(a => a.category === 'Specialized')
      }
    });

  } catch (error: any) {
    console.error('[AgentMonitor] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Get specific agent status
export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({
        success: false,
        error: 'Agent ID is required'
      }, { status: 400 });
    }

    const agent = agentRegistry.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({
        success: false,
        error: `Agent not found: ${agentId}`
      }, { status: 404 });
    }

    const health = await agent.healthCheck();

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        health
      }
    });

  } catch (error: any) {
    console.error('[AgentMonitor] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
