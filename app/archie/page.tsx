/**
 * Unified Archie Dashboard
 *
 * Consolidated hub for all AI assistant features:
 * - Transcription from Drive
 * - Device Sync
 * - Drive Intelligence
 * - Smart Insights
 * - Task Management
 * - Activity Logs
 */

import { createClient } from '@supabase/supabase-js';
import { DashboardHeader } from '@/components/archie/DashboardHeader';
import { FeatureCard } from '@/components/archie/FeatureCard';
import { StatusBadge } from '@/components/archie/StatusBadge';
import { QuickActions } from '@/components/archie/QuickActions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Archie Dashboard | KimbleAI',
  description: 'Your AI assistant for transcriptions, device sync, and drive intelligence'
};

async function getDashboardStats() {
  const userId = 'zach'; // Default user

  try {
    // Get transcription stats - use audio_transcriptions table (the actual table name)
    const { count: transcriptionCount, error: transcriptionError } = await supabase
      .from('audio_transcriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (transcriptionError) {
      console.error('Error fetching transcriptions:', transcriptionError);
    }

    // Get device stats
    const { count: deviceCount, error: deviceError } = await supabase
      .from('device_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deviceError) {
      console.error('Error fetching devices:', deviceError);
    }

    // Get agent tasks stats - get ALL tasks (not just pending)
    const { count: allTasksCount, error: allTasksError } = await supabase
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true });

    if (allTasksError) {
      console.error('Error fetching all tasks:', allTasksError);
    }

    // Get pending tasks count separately
    const { count: pendingTasksCount, error: pendingTasksError } = await supabase
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress']);

    if (pendingTasksError) {
      console.error('Error fetching pending tasks:', pendingTasksError);
    }

    // Get insights/findings stats
    const { count: insightCount, error: insightError } = await supabase
      .from('agent_findings')
      .select('*', { count: 'exact', head: true })
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (insightError) {
      console.error('Error fetching insights:', insightError);
    }

    // Get recent activity count (last 24h)
    const { count: activityCount, error: activityError } = await supabase
      .from('agent_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (activityError) {
      console.error('Error fetching activity logs:', activityError);
    }

    return {
      transcriptions: transcriptionCount ?? 0,
      devices: deviceCount ?? 0,
      tasks: pendingTasksCount ?? 0,
      allTasks: allTasksCount ?? 0,
      insights: insightCount ?? 0,
      activity: activityCount ?? 0,
      hasErrors: !!(transcriptionError || deviceError || allTasksError || insightError || activityError)
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      transcriptions: 0,
      devices: 0,
      tasks: 0,
      allTasks: 0,
      insights: 0,
      activity: 0,
      hasErrors: true
    };
  }
}

export default async function ArchieDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <DashboardHeader />

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <StatusBadge
            label="Transcriptions"
            value={stats.transcriptions}
            color="blue"
          />
          <StatusBadge
            label="Active Devices"
            value={stats.devices}
            color="orange"
          />
          <StatusBadge
            label="Pending Tasks"
            value={stats.tasks}
            color="green"
          />
          <StatusBadge
            label="Recent Insights"
            value={stats.insights}
            color="purple"
          />
          <StatusBadge
            label="24h Activity"
            value={stats.activity}
            color="blue"
          />
        </div>

        {/* Data Status Info */}
        {stats.hasErrors && (
          <div className="bg-red-500/5 border-2 border-red-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-2">
                  Database Connection Issues
                </h3>
                <p className="text-gray-400">
                  Some stats could not be loaded. Check the server logs for details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {!stats.hasErrors && stats.transcriptions === 0 && stats.allTasks === 0 && stats.insights === 0 && (
          <div className="bg-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📭</div>
              <div>
                <h3 className="text-lg font-bold text-blue-400 mb-2">
                  Getting Started with Archie
                </h3>
                <p className="text-gray-400 mb-3">
                  Archie is running, but there's no data yet. Here's how to get started:
                </p>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li>Upload audio files to Google Drive and Archie will auto-transcribe them</li>
                  <li>Start chatting and Archie will create tasks automatically</li>
                  <li>Connect devices to enable seamless cross-device sync</li>
                  <li>Archie runs on a schedule - give it a few minutes to detect new content</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success Message for Real Data */}
        {stats.allTasks > 0 && (
          <div className="bg-green-500/5 border-2 border-green-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <h3 className="text-lg font-bold text-green-400 mb-2">
                  Archie is Active
                </h3>
                <p className="text-gray-400">
                  Archie has completed {stats.allTasks} tasks total. {stats.insights} insights discovered in the last 7 days.
                  {stats.activity > 0 && ` ${stats.activity} actions in the last 24 hours.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            AI Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Transcribe from Drive */}
            <FeatureCard
              icon="🎙️"
              title="Transcribe from Drive"
              description="Convert Google Drive audio/video files to searchable text with speaker labels and timestamps"
              href="/transcribe"
              stats={`${stats.transcriptions} completed`}
              color="blue"
              badge="Popular"
            />

            {/* Drive Intelligence */}
            <FeatureCard
              icon="📁"
              title="Drive Intelligence"
              description="AI-powered insights, organization, and duplicate detection for your Google Drive files"
              href="/drive"
              stats={`${stats.insights} new insights`}
              color="purple"
            />

            {/* Device Sync */}
            <FeatureCard
              icon="🔄"
              title="Device Sync"
              description="Seamlessly continue conversations and sync context across all your devices"
              href="/devices"
              stats={`${stats.devices} devices connected`}
              color="orange"
            />

            {/* Smart Insights */}
            <FeatureCard
              icon="🔍"
              title="Smart Insights"
              description="Archie analyzes your data patterns and provides actionable recommendations"
              href="/agent"
              stats="Always learning"
              color="teal"
            />

            {/* Task Management */}
            <FeatureCard
              icon="✅"
              title="Task Management"
              description="View and manage tasks that Archie creates automatically from your conversations"
              href="/agent"
              stats={`${stats.tasks} pending`}
              color="green"
            />

            {/* Activity Log */}
            <FeatureCard
              icon="📊"
              title="Activity Log"
              description="See everything Archie has done for you, including transcriptions, analysis, and optimizations"
              href="/agent"
              stats={`${stats.activity} actions today`}
              color="pink"
            />
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💡</div>
            <div>
              <h3 className="text-lg font-bold text-blue-400 mb-2">
                About Archie
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Archie is your autonomous AI assistant running in the background 24/7.
                It monitors your Drive for new audio files to transcribe, syncs your context
                across devices, analyzes your files for organization opportunities, and creates
                tasks automatically based on your conversations. All agents run on automated
                schedules via Vercel Cron.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-sm text-green-400">
                  🦉 Autonomous Agent - Every 5 minutes
                </span>
                <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm text-blue-400">
                  🔍 Utility Agent - Every 15 minutes
                </span>
                <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-sm text-purple-400">
                  📁 Drive Intelligence - Every 6 hours
                </span>
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-sm text-orange-400">
                  🔄 Device Sync - Every 2 minutes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}
