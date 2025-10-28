/**
 * Agent Overview API
 *
 * Provides consolidated status and metrics for all agents in the system.
 * Used by the Agent Command Center at /archie
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = 'zach'; // Get from auth in production
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch data from all agent systems in parallel
    const [
      // Archie (Autonomous Task Agent)
      archieActiveTasksResult,
      archieTodayTasksResult,
      archieCompletedTodayResult,
      archieFailedResult,

      // AutoReferenceButler
      butlerActivityResult,

      // Session Logger
      sessionsTodayResult,
      activeSessionResult,

      // MCP Servers
      mcpHealthResult,

      // System Health
      recentErrorsResult
    ] = await Promise.all([
      // Archie: Active tasks
      supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']),

      // Archie: Tasks today
      supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString()),

      // Archie: Completed today
      supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', oneDayAgo.toISOString()),

      // Archie: Failed tasks
      supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),

      // AutoReferenceButler: Recent activity from agent_logs
      supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .ilike('activity', '%reference%')
        .gte('timestamp', oneDayAgo.toISOString()),

      // Session Logger: Sessions today
      supabase
        .from('session_logs')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', oneDayAgo.toISOString()),

      // Session Logger: Active session
      supabase
        .from('session_logs')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single(),

      // MCP: Try to get health (may not exist)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mcp/health`)
        .then(r => r.json())
        .catch(() => ({ success: false, overall: { connectedServers: 0, totalServers: 0 } })),

      // System: Recent errors
      supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .in('log_level', ['error', 'critical'])
        .gte('timestamp', oneDayAgo.toISOString())
    ]);

    // Determine agent statuses
    const archieStatus = archieActiveTasksResult.count! > 0 ? 'active' : 'idle';
    const archieCurrentActivity = archieActiveTasksResult.count! > 0
      ? `Processing ${archieActiveTasksResult.count} task${archieActiveTasksResult.count === 1 ? '' : 's'}`
      : undefined;

    const butlerStatus = butlerActivityResult.count! > 0 ? 'active' : 'idle';
    const butlerCurrentActivity = butlerActivityResult.count! > 0
      ? `Referenced ${butlerActivityResult.count} items today`
      : undefined;

    const sessionStatus = activeSessionResult.data ? 'active' : 'idle';
    const sessionCurrentActivity = activeSessionResult.data
      ? `Active on ${activeSessionResult.data.device_name}`
      : undefined;

    const mcpStatus = mcpHealthResult.success && mcpHealthResult.overall.connectedServers > 0
      ? 'active'
      : mcpHealthResult.overall.totalServers > 0
      ? 'error'
      : 'disabled';
    const mcpCurrentActivity = mcpHealthResult.overall.connectedServers > 0
      ? `${mcpHealthResult.overall.connectedServers} server${mcpHealthResult.overall.connectedServers === 1 ? '' : 's'} connected`
      : undefined;

    // Build response
    const overview = {
      timestamp: now.toISOString(),
      agents: {
        archie: {
          name: 'Archie',
          icon: '🤖',
          description: 'Autonomous Task Agent',
          status: archieStatus,
          currentActivity: archieCurrentActivity,
          metrics: [
            {
              label: 'Active Tasks',
              value: archieActiveTasksResult.count || 0,
              trend: 'neutral' as const
            },
            {
              label: 'Completed Today',
              value: archieCompletedTodayResult.count || 0,
              trend: 'up' as const
            },
            {
              label: 'Failed',
              value: archieFailedResult.count || 0,
              trend: archieFailedResult.count! > 0 ? 'down' as const : 'neutral' as const
            },
            {
              label: 'Tasks Today',
              value: archieTodayTasksResult.count || 0,
              trend: 'neutral' as const
            }
          ],
          detailsUrl: '/archie/tasks',
          error: archieFailedResult.count! > 0 ? `${archieFailedResult.count} failed tasks need attention` : undefined
        },
        butler: {
          name: 'AutoReferenceButler',
          icon: '📚',
          description: 'Reference Management',
          status: butlerStatus,
          currentActivity: butlerCurrentActivity,
          metrics: [
            {
              label: 'References Today',
              value: butlerActivityResult.count || 0,
              trend: 'neutral' as const
            },
            {
              label: 'Status',
              value: 'Monitoring',
              trend: 'neutral' as const
            }
          ],
          detailsUrl: '/archie/references',
          error: undefined
        },
        sessions: {
          name: 'Session Logger',
          icon: '🔄',
          description: 'Device Switching',
          status: sessionStatus,
          currentActivity: sessionCurrentActivity,
          metrics: [
            {
              label: 'Sessions Today',
              value: sessionsTodayResult.count || 0,
              trend: 'neutral' as const
            },
            {
              label: 'Current Device',
              value: activeSessionResult.data?.device_name || 'None',
              trend: 'neutral' as const
            }
          ],
          detailsUrl: '/sessions',
          error: undefined
        },
        mcp: {
          name: 'MCP Servers',
          icon: '🔌',
          description: 'Model Context Protocol',
          status: mcpStatus,
          currentActivity: mcpCurrentActivity,
          metrics: [
            {
              label: 'Connected',
              value: mcpHealthResult.overall?.connectedServers || 0,
              trend: 'neutral' as const
            },
            {
              label: 'Total Servers',
              value: mcpHealthResult.overall?.totalServers || 0,
              trend: 'neutral' as const
            },
            {
              label: 'Available Tools',
              value: mcpHealthResult.capabilities?.tools || 0,
              trend: 'neutral' as const
            },
            {
              label: 'Resources',
              value: mcpHealthResult.capabilities?.resources || 0,
              trend: 'neutral' as const
            }
          ],
          detailsUrl: '/archie/mcp',
          error: mcpStatus === 'error' ? 'Some servers disconnected' : undefined
        }
      },
      systemHealth: {
        healthy: recentErrorsResult.count! === 0,
        errors24h: recentErrorsResult.count || 0,
        activeAgents: [
          archieStatus === 'active' ? 'archie' : null,
          butlerStatus === 'active' ? 'butler' : null,
          sessionStatus === 'active' ? 'sessions' : null,
          mcpStatus === 'active' ? 'mcp' : null
        ].filter(Boolean).length,
        totalAgents: 4
      }
    };

    return NextResponse.json({
      success: true,
      ...overview
    });
  } catch (error: any) {
    console.error('[Agent Overview API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch agent overview'
      },
      { status: 500 }
    );
  }
}
