'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { StatCard, ProjectCard } from '../../components/ui/Card';
import { Button, ButtonGroup } from '../../components/ui/Button';
import { useRouter } from 'next/navigation';
import LoadingScreen from '../../components/LoadingScreen';
import TimeZoneDisplay from '@/components/TimeZoneDisplay';

interface DashboardStats {
  totalProjects: number;
  totalFiles: number;
  totalConversations: number;
  storageUsed: number;
  storageLimit: number;
  apiCostsToday: number;
  apiCostsMonth: number;
}

interface RecentActivity {
  id: string;
  type: 'conversation' | 'file' | 'project';
  title: string;
  description: string;
  timestamp: string;
  project?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalFiles: 0,
    totalConversations: 0,
    storageUsed: 0,
    storageLimit: 10 * 1024 * 1024 * 1024, // 10 GB
    apiCostsToday: 0,
    apiCostsMonth: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load recent projects
      const projectsResponse = await fetch('/api/projects?limit=6');
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setRecentProjects(projectsData.projects || []);
      }

      // Load recent activity
      const activityResponse = await fetch('/api/dashboard/activity?limit=10');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStorage = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const storagePercentage = (stats.storageUsed / stats.storageLimit) * 100;

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingScreen message="Loading dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Time Zone Display */}
        <div className="flex justify-center mb-4">
          <TimeZoneDisplay />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">
              Welcome back! Here&apos;s what&apos;s happening with your projects.
            </p>
          </div>
          <ButtonGroup>
            <Button icon="💬" onClick={() => router.push('/')}>
              New Chat
            </Button>
            <Button icon="⬆️" variant="secondary" onClick={() => router.push('/files/upload')}>
              Upload File
            </Button>
          </ButtonGroup>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            icon="📋"
            color="blue"
            trend={{ value: 12, label: 'vs last month' }}
          />
          <StatCard
            title="Conversations"
            value={stats.totalConversations}
            icon="💬"
            color="green"
            trend={{ value: 8, label: 'vs last week' }}
          />
          <StatCard
            title="Files Stored"
            value={stats.totalFiles}
            icon="📁"
            color="purple"
            trend={{ value: 15, label: 'vs last month' }}
          />
          <StatCard
            title="API Costs (Today)"
            value={`$${stats.apiCostsToday.toFixed(2)}`}
            icon="💰"
            color="orange"
            trend={{ value: -5, label: 'vs yesterday' }}
          />
        </div>

        {/* Storage Usage */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Storage Usage</h3>
              <p className="text-sm text-gray-400">
                {formatStorage(stats.storageUsed)} of {formatStorage(stats.storageLimit)} used
              </p>
            </div>
            <span className="text-2xl text-blue-500">{storagePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                storagePercentage > 90
                  ? 'bg-red-500'
                  : storagePercentage > 70
                  ? 'bg-orange-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Recent Projects</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/projects')}
            >
              View All →
            </Button>
          </div>
          {recentProjects.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
              <span className="text-6xl mb-4 block">📋</span>
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-gray-400 mb-4">
                Create your first project to organize your work
              </p>
              <Button onClick={() => router.push('/projects/new')}>
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  status={project.status}
                  conversations={project.stats?.total_conversations || 0}
                  files={project.stats?.total_files || 0}
                  lastActivity="2 hours ago"
                  tags={project.tags}
                  onClick={() => router.push(`/projects/${project.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg divide-y divide-gray-800">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No recent activity
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {activity.type === 'conversation' ? '💬' : activity.type === 'file' ? '📁' : '📋'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white mb-1">
                        {activity.title}
                      </h4>
                      <p className="text-xs text-gray-400 mb-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{activity.timestamp}</span>
                        {activity.project && (
                          <>
                            <span>•</span>
                            <span className="text-blue-400">{activity.project}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">API Usage (This Month)</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Cost</span>
                <span className="text-lg font-bold text-white">${stats.apiCostsMonth.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Budget Limit</span>
                <span className="text-sm text-gray-400">$500.00</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  style={{ width: `${(stats.apiCostsMonth / 500) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Platform</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-500">Online</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Google Services</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-500">Connected</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Knowledge Base</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-500">Active</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
