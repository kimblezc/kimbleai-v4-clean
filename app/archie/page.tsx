/**
 * Agent Command Center - Main Overview Page
 *
 * Consolidated view of ALL agents in the system:
 * - Archie (Autonomous Task Agent)
 * - AutoReferenceButler (Reference Management)
 * - Session Logger (Device Switching)
 * - MCP Servers (Model Context Protocol)
 * - API Integrations (External Services)
 *
 * Each agent card shows real-time status, key metrics, and links to detailed subpages.
 */

import { createClient } from '@supabase/supabase-js';
import { AgentCard } from '@/components/archie/AgentCard';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Agent Command Center - KimbleAI',
  description: 'Real-time monitoring and control for all autonomous agents'
};

async function getAgentOverview() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch data directly from Supabase (avoid network fetch during build)
    const [
      archieActiveTasksResult,
      archieTodayTasksResult,
      archieCompletedTodayResult,
      archieFailedResult,
      butlerActivityResult,
      sessionsTodayResult,
      activeSessionResult,
      recentErrorsResult
    ] = await Promise.all([
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo.toISOString()),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', oneDayAgo.toISOString()),
      supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('agent_logs').select('*', { count: 'exact', head: true }).ilike('activity', '%reference%').gte('timestamp', oneDayAgo.toISOString()),
      supabase.from('session_logs').select('*', { count: 'exact', head: true }).gte('started_at', oneDayAgo.toISOString()),
      supabase.from('session_logs').select('*').is('ended_at', null).order('started_at', { ascending: false }).limit(1).single(),
      supabase.from('agent_logs').select('*', { count: 'exact', head: true }).in('log_level', ['error', 'critical']).gte('timestamp', oneDayAgo.toISOString())
    ]);

    // Determine agent statuses
    const archieStatus = archieActiveTasksResult.count! > 0 ? 'active' : 'idle';
    const butlerStatus = butlerActivityResult.count! > 0 ? 'active' : 'idle';
    const sessionStatus = activeSessionResult.data ? 'active' : 'idle';
    const mcpStatus = 'disabled'; // MCP requires API call, skip for now

    return {
      success: true,
      timestamp: now.toISOString(),
      agents: {
        archie: {
          name: 'Archie',
          icon: '🤖',
          description: 'Autonomous Task Agent',
          status: archieStatus,
          currentActivity: archieActiveTasksResult.count! > 0 ? `Processing ${archieActiveTasksResult.count} task${archieActiveTasksResult.count === 1 ? '' : 's'}` : undefined,
          metrics: [
            { label: 'Active Tasks', value: archieActiveTasksResult.count || 0, trend: 'neutral' as const },
            { label: 'Completed Today', value: archieCompletedTodayResult.count || 0, trend: 'up' as const },
            { label: 'Failed', value: archieFailedResult.count || 0, trend: archieFailedResult.count! > 0 ? 'down' as const : 'neutral' as const },
            { label: 'Tasks Today', value: archieTodayTasksResult.count || 0, trend: 'neutral' as const }
          ],
          detailsUrl: '/archie/tasks',
          error: archieFailedResult.count! > 0 ? `${archieFailedResult.count} failed tasks need attention` : undefined
        },
        butler: {
          name: 'AutoReferenceButler',
          icon: '📚',
          description: 'Reference Management',
          status: butlerStatus,
          currentActivity: butlerActivityResult.count! > 0 ? `Referenced ${butlerActivityResult.count} items today` : undefined,
          metrics: [
            { label: 'References Today', value: butlerActivityResult.count || 0, trend: 'neutral' as const },
            { label: 'Status', value: 'Monitoring', trend: 'neutral' as const }
          ],
          detailsUrl: '/archie/references'
        },
        sessions: {
          name: 'Session Logger',
          icon: '🔄',
          description: 'Device Switching',
          status: sessionStatus,
          currentActivity: activeSessionResult.data ? `Active on ${activeSessionResult.data.device_name}` : undefined,
          metrics: [
            { label: 'Sessions Today', value: sessionsTodayResult.count || 0, trend: 'neutral' as const },
            { label: 'Current Device', value: activeSessionResult.data?.device_name || 'None', trend: 'neutral' as const }
          ],
          detailsUrl: '/sessions'
        },
        mcp: {
          name: 'MCP Servers',
          icon: '🔌',
          description: 'Model Context Protocol',
          status: mcpStatus,
          metrics: [
            { label: 'Connected', value: 0, trend: 'neutral' as const },
            { label: 'Total Servers', value: 0, trend: 'neutral' as const },
            { label: 'Available Tools', value: 0, trend: 'neutral' as const },
            { label: 'Resources', value: 0, trend: 'neutral' as const }
          ],
          detailsUrl: '/archie/mcp'
        }
      },
      systemHealth: {
        healthy: recentErrorsResult.count! === 0,
        errors24h: recentErrorsResult.count || 0,
        activeAgents: [archieStatus === 'active', butlerStatus === 'active', sessionStatus === 'active'].filter(Boolean).length,
        totalAgents: 4
      }
    };
  } catch (error) {
    console.error('[Agent Command Center] Error fetching overview:', error);
    return null;
  }
}

export default async function AgentCommandCenter() {
  const overview = await getAgentOverview();

  // Fallback if API fails
  if (!overview || !overview.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            Failed to Load Agent Data
          </h1>
          <p className="text-slate-400 mb-6">
            Unable to fetch agent status. Please check system health.
          </p>
          <Link
            href="/archie/tasks"
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
          >
            View Task Queue Instead →
          </Link>
        </div>
      </div>
    );
  }

  const { agents, systemHealth } = overview;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Archie Overwatch Header */}
          <div className="mb-12 text-center">
            {/* Animated Owl with Glow */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-teal-500/30 blur-3xl animate-pulse" />
              <div className="relative text-9xl filter drop-shadow-2xl animate-float">
                🦉
              </div>
              {/* Active status pulse */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full" />
            </div>

            <h1 className="text-6xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent mb-4">
              ARCHIE
            </h1>
            <p className="text-2xl font-semibold text-slate-300 mb-2">
              Autonomous Agent Overwatch
            </p>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Monitoring and coordinating all autonomous agents • Running 24/7 • Every 5 minutes
            </p>
          </div>

          {/* System Health & Quick Nav */}
          <div className="mb-8">
            {/* Quick Nav */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Link
                href="/archie/tasks"
                className="px-6 py-3 bg-green-600/20 border border-green-500/40 rounded-lg text-green-300 hover:bg-green-600/30 transition-colors font-semibold"
              >
                📋 Task Queue
              </Link>
              <Link
                href="/archie/references"
                className="px-6 py-3 bg-purple-600/20 border border-purple-500/40 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-colors font-semibold"
              >
                📚 References
              </Link>
              <Link
                href="/archie/mcp"
                className="px-6 py-3 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-colors font-semibold"
              >
                🔌 MCP Servers
              </Link>
              <Link
                href="/sessions"
                className="px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-800/70 transition-colors font-semibold"
              >
                🔄 Sessions
              </Link>
            </div>

            {/* System Health Bar */}
            <div className={`
              p-4 rounded-lg border-2 backdrop-blur-sm
              ${systemHealth.healthy
                ? 'bg-green-900/20 border-green-500/40'
                : 'bg-red-900/20 border-red-500/40'
              }
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-3xl ${systemHealth.healthy ? 'animate-pulse' : ''}`}>
                    {systemHealth.healthy ? '✅' : '⚠️'}
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${
                      systemHealth.healthy ? 'text-green-400' : 'text-red-400'
                    }`}>
                      System Status: {systemHealth.healthy ? 'Healthy' : 'Issues Detected'}
                    </div>
                    <div className="text-sm text-slate-400">
                      {systemHealth.activeAgents} of {systemHealth.totalAgents} agents active
                      {systemHealth.errors24h > 0 && ` • ${systemHealth.errors24h} errors in last 24h`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {systemHealth.activeAgents}
                    </div>
                    <div className="text-xs text-slate-500">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {systemHealth.totalAgents - systemHealth.activeAgents}
                    </div>
                    <div className="text-xs text-slate-500">Idle</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {systemHealth.errors24h}
                    </div>
                    <div className="text-xs text-slate-500">Errors</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subordinate Agents - Under Archie's Watch */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-200 mb-4 flex items-center gap-3">
              <span className="text-green-400">▼</span>
              Managed Agents
              <span className="text-sm font-normal text-slate-500">(Under Archie's Supervision)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 mb-8">
            {/* Task Management */}
            <AgentCard {...agents.archie} />

            {/* AutoReferenceButler */}
            <AgentCard {...agents.butler} />

            {/* Session Logger */}
            <AgentCard {...agents.sessions} />

            {/* MCP Servers */}
            <AgentCard {...agents.mcp} />
          </div>

          {/* API Integrations Card */}
          <div className="mb-8">
            <Link href="/archie/integrations">
              <div className="
                relative overflow-hidden rounded-lg border-2 border-purple-500/40
                bg-purple-900/20 backdrop-blur-sm
                transition-all duration-300 cursor-pointer
                hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/20
                hover:scale-[1.01]
                p-6
              ">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">🔗</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        API Integrations
                      </h3>
                      <p className="text-slate-400">
                        External services status and health monitoring
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-center">
                    <div>
                      <div className="text-green-400 text-xs font-semibold mb-1">ANTHROPIC</div>
                      <div className="text-2xl">✓</div>
                    </div>
                    <div>
                      <div className="text-green-400 text-xs font-semibold mb-1">SUPABASE</div>
                      <div className="text-2xl">✓</div>
                    </div>
                    <div>
                      <div className="text-green-400 text-xs font-semibold mb-1">VERCEL</div>
                      <div className="text-2xl">✓</div>
                    </div>
                    <div className="text-indigo-400 font-semibold">
                      View All →
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/archie/tasks"
              className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:bg-slate-900/70 transition-colors group"
            >
              <div className="text-3xl mb-2">📋</div>
              <div className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                View Task Queue
              </div>
              <div className="text-sm text-slate-400">
                Monitor Archie's pending and active tasks
              </div>
            </Link>

            <Link
              href="/archie/references"
              className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:bg-slate-900/70 transition-colors group"
            >
              <div className="text-3xl mb-2">📚</div>
              <div className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                Reference Activity
              </div>
              <div className="text-sm text-slate-400">
                See what AutoReferenceButler is tracking
              </div>
            </Link>

            <Link
              href="/archie/mcp"
              className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:bg-slate-900/70 transition-colors group"
            >
              <div className="text-3xl mb-2">🔌</div>
              <div className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                MCP Server Registry
              </div>
              <div className="text-sm text-slate-400">
                Manage Model Context Protocol servers
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
