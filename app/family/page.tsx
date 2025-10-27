'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface DashboardStats {
  knowledgeCount: number;
  upcomingEventsCount: number;
  recentEmailsCount: number;
  activeProjectsCount: number;
  sharedItemsCount: number;
}

interface Activity {
  id: string;
  userId: string;
  activityType: string;
  title: string;
  description: string;
  resourceType: string;
  createdAt: string;
}

export default function FamilyDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    knowledgeCount: 0,
    upcomingEventsCount: 0,
    recentEmailsCount: 0,
    activeProjectsCount: 0,
    sharedItemsCount: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load stats
      const [knowledgeRes, eventsRes, emailsRes] = await Promise.all([
        fetch('/api/family/knowledge?limit=1'),
        fetch('/api/family/availability?start_date=' + new Date().toISOString().split('T')[0] + '&end_date=' + getDateDaysFromNow(7)),
        fetch('/api/family/emails?limit=1'),
      ]);

      const [knowledgeData, eventsData, emailsData] = await Promise.all([
        knowledgeRes.json(),
        eventsRes.json(),
        emailsRes.json(),
      ]);

      setStats({
        knowledgeCount: knowledgeData.count || 0,
        upcomingEventsCount: eventsData.slots?.length || 0,
        recentEmailsCount: emailsData.count || 0,
        activeProjectsCount: 0,
        sharedItemsCount: 0,
      });

      // Load recent activities (mock for now)
      setActivities([
        {
          id: '1',
          userId: 'zach',
          activityType: 'knowledge_created',
          title: 'Created new note',
          description: 'Added travel plans for summer vacation',
          resourceType: 'knowledge',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateDaysFromNow = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const getUserColor = (userId: string) => {
    if (userId === 'zach') return 'purple';
    if (userId === 'rebecca') return 'pink';
    return 'blue';
  };

  const getActivityIcon = (activityType: string) => {
    const icons: Record<string, string> = {
      knowledge_created: '📝',
      knowledge_updated: '✏️',
      calendar_event_created: '📅',
      email_categorized: '📧',
      email_shared: '📩',
      project_created: '🎯',
      project_updated: '🔄',
    };
    return icons[activityType] || '📌';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Family Intelligence Hub</h1>
            <p className="text-gray-400">
              Shared knowledge, calendar, and email management for Zach and Rebecca
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              icon="📝"
              onClick={() => router.push('/family/knowledge')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Add Knowledge
            </Button>
            <Button
              icon="📅"
              onClick={() => router.push('/family/calendar')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Schedule Event
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => router.push('/family/knowledge')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">📚</span>
              <span className="text-purple-300 text-sm">Knowledge</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.knowledgeCount}</div>
            <div className="text-sm text-purple-300">Shared notes</div>
          </div>

          <div
            className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => router.push('/family/calendar')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">📅</span>
              <span className="text-blue-300 text-sm">Calendar</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.upcomingEventsCount}</div>
            <div className="text-sm text-blue-300">Upcoming events</div>
          </div>

          <div
            className="bg-gradient-to-br from-pink-900 to-pink-800 border border-pink-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => router.push('/family/email')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">📧</span>
              <span className="text-pink-300 text-sm">Emails</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.recentEmailsCount}</div>
            <div className="text-sm text-pink-300">Family emails</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 border border-indigo-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">🎯</span>
              <span className="text-indigo-300 text-sm">Projects</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.activeProjectsCount}</div>
            <div className="text-sm text-indigo-300">Active projects</div>
          </div>

          <div className="bg-gradient-to-br from-cyan-900 to-cyan-800 border border-cyan-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <span className="text-4xl">🔗</span>
              <span className="text-cyan-300 text-sm">Shared</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.sharedItemsCount}</div>
            <div className="text-sm text-cyan-300">Shared items</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/family/knowledge')}
              className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
            >
              <span className="text-3xl">📝</span>
              <div>
                <div className="text-white font-medium">Add Knowledge</div>
                <div className="text-sm text-gray-400">Create shared note or memory</div>
              </div>
            </button>

            <button
              onClick={() => router.push('/family/calendar')}
              className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
            >
              <span className="text-3xl">🔍</span>
              <div>
                <div className="text-white font-medium">Find Time</div>
                <div className="text-sm text-gray-400">Check mutual availability</div>
              </div>
            </button>

            <button
              onClick={() => router.push('/family/email')}
              className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left"
            >
              <span className="text-3xl">📧</span>
              <div>
                <div className="text-white font-medium">Check Emails</div>
                <div className="text-sm text-gray-400">View shared family emails</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <span className="text-sm text-gray-400">Last 7 days</span>
            </div>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No recent activity
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                  >
                    <span className="text-2xl">{getActivityIcon(activity.activityType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            activity.userId === 'zach'
                              ? 'bg-purple-900 text-purple-300'
                              : 'bg-pink-900 text-pink-300'
                          }`}
                        >
                          {activity.userId}
                        </span>
                        <span className="text-sm text-gray-400">
                          {new Date(activity.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-white font-medium mb-1">{activity.title}</div>
                      <div className="text-sm text-gray-400">{activity.description}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Overview */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Family Members</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-900/50 to-transparent border border-purple-800 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-2xl">
                  👨
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">Zach Kimble</div>
                  <div className="text-sm text-purple-300">zach.kimble@gmail.com</div>
                </div>
                <div className="text-purple-300 text-sm">Active</div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-900/50 to-transparent border border-pink-800 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-2xl">
                  👩
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold">Rebecca Kimble</div>
                  <div className="text-sm text-pink-300">becky.aza.kimble@gmail.com</div>
                </div>
                <div className="text-pink-300 text-sm">Active</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => router.push('/family/knowledge')}
            className="bg-gradient-to-br from-purple-900 to-purple-950 border border-purple-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-white mb-2">Shared Knowledge</h3>
            <p className="text-purple-300 text-sm mb-4">
              Notes, memories, decisions, and project spaces accessible to both family members
            </p>
            <div className="flex items-center text-purple-400 text-sm font-medium">
              View Knowledge →
            </div>
          </div>

          <div
            onClick={() => router.push('/family/calendar')}
            className="bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-white mb-2">Joint Calendar</h3>
            <p className="text-blue-300 text-sm mb-4">
              Combined calendar view, availability matching, and smart scheduling for both calendars
            </p>
            <div className="flex items-center text-blue-400 text-sm font-medium">
              View Calendar →
            </div>
          </div>

          <div
            onClick={() => router.push('/family/email')}
            className="bg-gradient-to-br from-pink-900 to-pink-950 border border-pink-700 rounded-lg p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-xl font-bold text-white mb-2">Family Emails</h3>
            <p className="text-pink-300 text-sm mb-4">
              Categorized emails relevant to both users, bills, travel, home, and joint projects
            </p>
            <div className="flex items-center text-pink-400 text-sm font-medium">
              View Emails →
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
