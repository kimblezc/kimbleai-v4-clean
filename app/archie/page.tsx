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

  // Get transcription stats
  const { data: transcriptions } = await supabase
    .from('transcriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  const transcriptionCount = transcriptions || 0;

  // Get device stats
  const { data: devices } = await supabase
    .from('device_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  const deviceCount = devices || 0;

  // Get agent tasks stats
  const { data: pendingTasks } = await supabase
    .from('agent_tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'in_progress']);

  const taskCount = pendingTasks || 0;

  // Get insights/findings stats
  const { data: insights } = await supabase
    .from('agent_findings')
    .select('*', { count: 'exact', head: true })
    .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const insightCount = insights || 0;

  // Get recent activity count (last 24h)
  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const activityCount = recentLogs || 0;

  return {
    transcriptions: transcriptionCount,
    devices: deviceCount,
    tasks: taskCount,
    insights: insightCount,
    activity: activityCount
  };
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
            label="Devices"
            value={stats.devices}
            color="orange"
          />
          <StatusBadge
            label="Active Tasks"
            value={stats.tasks}
            color="green"
          />
          <StatusBadge
            label="Insights"
            value={stats.insights}
            color="purple"
          />
          <StatusBadge
            label="24h Activity"
            value={stats.activity}
            color="blue"
          />
        </div>

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
