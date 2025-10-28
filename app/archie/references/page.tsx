/**
 * AutoReferenceButler Dashboard
 *
 * Monitor the reference management and automatic context retrieval system.
 * Shows what AutoReferenceButler is tracking and retrieving for context.
 */

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'AutoReferenceButler - Reference Dashboard',
  description: 'Automatic context retrieval and reference management monitoring'
};

interface ReferenceActivity {
  id: string;
  timestamp: string;
  activity: string;
  log_level: string;
  agent_name: string;
  metadata?: any;
}

async function getButlerActivity() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      todayActivityResult,
      weekActivityResult,
      recentLogsResult,
      knowledgeStatsResult,
      fileStatsResult
    ] = await Promise.all([
      // Activity today
      supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .ilike('activity', '%reference%')
        .gte('timestamp', oneDayAgo.toISOString()),

      // Activity this week
      supabase
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .ilike('activity', '%reference%')
        .gte('timestamp', oneWeekAgo.toISOString()),

      // Recent activity logs
      supabase
        .from('agent_logs')
        .select('*')
        .ilike('activity', '%reference%')
        .order('timestamp', { ascending: false })
        .limit(50),

      // Knowledge base stats
      supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true }),

      // Indexed files stats
      supabase
        .from('indexed_files')
        .select('*', { count: 'exact', head: true })
    ]);

    return {
      todayCount: todayActivityResult.count || 0,
      weekCount: weekActivityResult.count || 0,
      recentActivity: recentLogsResult.data || [],
      knowledgeCount: knowledgeStatsResult.count || 0,
      filesCount: fileStatsResult.count || 0
    };
  } catch (error) {
    console.error('[AutoReferenceButler] Error fetching activity:', error);
    return {
      todayCount: 0,
      weekCount: 0,
      recentActivity: [],
      knowledgeCount: 0,
      filesCount: 0
    };
  }
}

export default async function AutoReferenceButlerDashboard() {
  const data = await getButlerActivity();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (activity: string, logLevel: string) => {
    if (logLevel === 'error') return '❌';
    if (activity.includes('knowledge')) return '📚';
    if (activity.includes('file')) return '📄';
    if (activity.includes('memory')) return '🧠';
    if (activity.includes('email')) return '📧';
    if (activity.includes('calendar')) return '📅';
    return '🔍';
  };

  const getLogLevelColor = (logLevel: string) => {
    switch (logLevel) {
      case 'error':
      case 'critical':
        return 'text-red-400 bg-red-950/30 border-red-500/30';
      case 'warn':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-500/30';
      case 'info':
        return 'text-blue-400 bg-blue-950/30 border-blue-500/30';
      default:
        return 'text-slate-400 bg-slate-900/50 border-slate-700/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              href="/archie"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold flex items-center gap-2"
            >
              ← Back to Agent Command Center
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-5xl">📚</span>
              <h1 className="text-4xl font-bold text-white">AutoReferenceButler</h1>
            </div>
            <p className="text-slate-400 text-lg">
              Automatic context retrieval and reference management system
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/50 border border-indigo-500/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-sm text-indigo-400 font-semibold mb-2">REFERENCES TODAY</div>
              <div className="text-4xl font-bold text-white mb-1">{data.todayCount}</div>
              <div className="text-xs text-slate-500">Automatic retrievals</div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-slate-900/50 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-sm text-purple-400 font-semibold mb-2">REFERENCES THIS WEEK</div>
              <div className="text-4xl font-bold text-white mb-1">{data.weekCount}</div>
              <div className="text-xs text-slate-500">Total retrievals</div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-slate-900/50 border border-blue-500/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-sm text-blue-400 font-semibold mb-2">KNOWLEDGE ENTRIES</div>
              <div className="text-4xl font-bold text-white mb-1">{data.knowledgeCount}</div>
              <div className="text-xs text-slate-500">In knowledge base</div>
            </div>

            <div className="bg-gradient-to-br from-green-900/20 to-slate-900/50 border border-green-500/30 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-sm text-green-400 font-semibold mb-2">INDEXED FILES</div>
              <div className="text-4xl font-bold text-white mb-1">{data.filesCount}</div>
              <div className="text-xs text-slate-500">Ready for retrieval</div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span>
              Recent Activity
            </h2>

            {data.recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💤</div>
                <div className="text-slate-400 text-lg mb-2">No Recent Activity</div>
                <div className="text-slate-500 text-sm">
                  AutoReferenceButler will appear here when it retrieves context
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((activity: ReferenceActivity) => (
                  <div
                    key={activity.id}
                    className={`
                      p-4 rounded-lg border backdrop-blur-sm
                      ${getLogLevelColor(activity.log_level)}
                      hover:scale-[1.01] transition-transform
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl mt-0.5">
                          {getActivityIcon(activity.activity, activity.log_level)}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium mb-1">
                            {activity.activity}
                          </div>
                          {activity.metadata && (
                            <div className="text-xs text-slate-400 mt-2 font-mono bg-slate-950/50 p-2 rounded">
                              {JSON.stringify(activity.metadata, null, 2).slice(0, 200)}
                              {JSON.stringify(activity.metadata).length > 200 && '...'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap ml-4">
                        {formatTimestamp(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span>⚙️</span>
                How It Works
              </h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Automatically analyzes your messages for context needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Retrieves relevant knowledge, files, emails, and calendar events</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Provides context without requiring explicit commands</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Learns from your patterns to improve relevance</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span>🎯</span>
                What Gets Referenced
              </h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">📚</span>
                  <span>Knowledge base entries and notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">🧠</span>
                  <span>Conversation memory and history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">📄</span>
                  <span>Project files and documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">📧</span>
                  <span>Relevant emails and attachments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">📅</span>
                  <span>Calendar events and reminders</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
