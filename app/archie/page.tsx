/**
 * Archie Dashboard - Complete Redesign
 *
 * Modern, real-time AI oversight dashboard with:
 * - Live activity monitoring across all agents
 * - Performance metrics and analytics
 * - Visual data representations
 * - Agent status and schedules
 * - System health monitoring
 */

import { createClient } from '@supabase/supabase-js';
import { DashboardHeader } from '@/components/archie/DashboardHeader';
import { MetricsGrid } from '@/components/archie/MetricsGrid';
import { AgentStatus } from '@/components/archie/AgentStatus';
import { ActivityFeed } from '@/components/archie/ActivityFeed';
import { TasksOverview } from '@/components/archie/TasksOverview';
import { PerformanceCharts } from '@/components/archie/PerformanceCharts';
import { SystemHealth } from '@/components/archie/SystemHealth';
import { QuickActions } from '@/components/archie/QuickActions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Archie Dashboard - AI Oversight Center',
  description: 'Real-time monitoring and analytics for your autonomous AI agents'
};

interface DashboardData {
  stats: {
    transcriptions: number;
    devices: number;
    pendingTasks: number;
    completedTasks: number;
    totalTasks: number;
    insights: number;
    activityToday: number;
    activityThisWeek: number;
    hasErrors: boolean;
  };
  recentActivity: any[];
  tasks: {
    recent: any[];
    byStatus: {
      pending: number;
      in_progress: number;
      completed: number;
      failed: number;
    };
    byType: Record<string, number>;
  };
  findings: {
    recent: any[];
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  performance: {
    hourlyActivity: number[];
    completionRate: number;
    avgTaskDuration: number;
  };
  systemHealth: {
    agentEnabled: boolean;
    lastHealthCheck: string;
    errorRate: number;
  };
}

async function getDashboardData(): Promise<DashboardData> {
  const userId = 'zach';
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // Fetch all data in parallel
    const [
      transcriptionResult,
      deviceResult,
      allTasksResult,
      pendingTasksResult,
      completedTasksResult,
      recentTasksResult,
      insightResult,
      recentFindingsResult,
      activityTodayResult,
      activityWeekResult,
      recentActivityResult,
      agentStateResult,
      recentLogsResult
    ] = await Promise.all([
      // Transcriptions
      supabase
        .from('audio_transcriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Active devices
      supabase
        .from('device_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true),

      // All tasks
      supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true }),

      // Pending tasks
      supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']),

      // Completed tasks (last 24h)
      supabase
        .from('agent_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', oneDayAgo.toISOString()),

      // Recent tasks for detailed view
      supabase
        .from('agent_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),

      // Insights (last 7 days)
      supabase
        .from('agent_findings')
        .select('*', { count: 'exact', head: true })
        .gte('detected_at', oneWeekAgo.toISOString()),

      // Recent findings for detailed view
      supabase
        .from('agent_findings')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(15),

      // Activity today
      supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneDayAgo.toISOString()),

      // Activity this week
      supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneWeekAgo.toISOString()),

      // Recent activity for feed
      supabase
        .from('agent_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(30),

      // Agent state
      supabase
        .from('agent_state')
        .select('*'),

      // Recent error logs
      supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .in('log_level', ['error', 'critical'])
        .gte('timestamp', oneHourAgo.toISOString())
    ]);

    // Process task statistics
    const tasks = recentTasksResult.data || [];
    const tasksByStatus = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };

    const tasksByType: Record<string, number> = {};
    tasks.forEach(task => {
      tasksByType[task.task_type] = (tasksByType[task.task_type] || 0) + 1;
    });

    // Process findings statistics
    const findings = recentFindingsResult.data || [];
    const findingsBySeverity = {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length
    };

    // Calculate performance metrics
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.started_at && t.completed_at);
    const avgTaskDuration = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / completedTasks.length
      : 0;

    const totalRecent = pendingTasksResult.count || 0 + (completedTasksResult.count || 0);
    const completionRate = totalRecent > 0
      ? ((completedTasksResult.count || 0) / totalRecent) * 100
      : 0;

    // Generate hourly activity (last 24 hours)
    const hourlyActivity = Array(24).fill(0);
    const activityLogs = recentActivityResult.data || [];
    activityLogs.forEach(log => {
      const hourAgo = Math.floor((now.getTime() - new Date(log.timestamp).getTime()) / (60 * 60 * 1000));
      if (hourAgo >= 0 && hourAgo < 24) {
        hourlyActivity[23 - hourAgo]++;
      }
    });

    // Agent state
    const agentState = agentStateResult.data || [];
    const agentEnabledValue = agentState.find(s => s.key === 'agent_enabled')?.value;
    const agentEnabled = agentEnabledValue === true || agentEnabledValue === 'true';
    const lastHealthCheck = agentState.find(s => s.key === 'last_health_check')?.updated_at || new Date().toISOString();
    const errorRate = activityTodayResult.count
      ? ((recentLogsResult.count || 0) / activityTodayResult.count) * 100
      : 0;

    const hasErrors = !!(
      transcriptionResult.error ||
      deviceResult.error ||
      allTasksResult.error ||
      insightResult.error ||
      activityTodayResult.error
    );

    return {
      stats: {
        transcriptions: transcriptionResult.count ?? 0,
        devices: deviceResult.count ?? 0,
        pendingTasks: pendingTasksResult.count ?? 0,
        completedTasks: completedTasksResult.count ?? 0,
        totalTasks: allTasksResult.count ?? 0,
        insights: insightResult.count ?? 0,
        activityToday: activityTodayResult.count ?? 0,
        activityThisWeek: activityWeekResult.count ?? 0,
        hasErrors
      },
      recentActivity: activityLogs.slice(0, 15),
      tasks: {
        recent: tasks.slice(0, 10),
        byStatus: tasksByStatus,
        byType: tasksByType
      },
      findings: {
        recent: findings.slice(0, 8),
        bySeverity: findingsBySeverity
      },
      performance: {
        hourlyActivity,
        completionRate,
        avgTaskDuration: Math.round(avgTaskDuration / 1000) // Convert to seconds
      },
      systemHealth: {
        agentEnabled,
        lastHealthCheck,
        errorRate: Math.round(errorRate * 10) / 10
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return {
      stats: {
        transcriptions: 0,
        devices: 0,
        pendingTasks: 0,
        completedTasks: 0,
        totalTasks: 0,
        insights: 0,
        activityToday: 0,
        activityThisWeek: 0,
        hasErrors: true
      },
      recentActivity: [],
      tasks: {
        recent: [],
        byStatus: { pending: 0, in_progress: 0, completed: 0, failed: 0 },
        byType: {}
      },
      findings: {
        recent: [],
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }
      },
      performance: {
        hourlyActivity: Array(24).fill(0),
        completionRate: 0,
        avgTaskDuration: 0
      },
      systemHealth: {
        agentEnabled: false,
        lastHealthCheck: new Date().toISOString(),
        errorRate: 0
      }
    };
  }
}

export default async function ArchieDashboard() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <DashboardHeader stats={data.stats} />

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Left Column - Metrics & Charts (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Metrics Grid */}
              <MetricsGrid stats={data.stats} />

              {/* Performance Charts */}
              <PerformanceCharts
                hourlyActivity={data.performance.hourlyActivity}
                completionRate={data.performance.completionRate}
                avgTaskDuration={data.performance.avgTaskDuration}
              />

              {/* Tasks Overview */}
              <TasksOverview
                tasks={data.tasks.recent}
                byStatus={data.tasks.byStatus}
                byType={data.tasks.byType}
              />
            </div>

            {/* Right Column - Activity & Status (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* System Health */}
              <SystemHealth
                systemHealth={data.systemHealth}
                errorCount={data.findings.bySeverity.critical + data.findings.bySeverity.high}
              />

              {/* Agent Status */}
              <AgentStatus />

              {/* Activity Feed */}
              <ActivityFeed
                activities={data.recentActivity}
                findings={data.findings.recent}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
