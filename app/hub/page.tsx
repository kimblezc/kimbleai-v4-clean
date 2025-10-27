'use client';

/**
 * INTEGRATION HUB - UNIFIED PLATFORM DASHBOARD
 *
 * Central command center for all AI platforms and services.
 * Shows status, activity, and quick actions for:
 * - KimbleAI, Claude Projects, ChatGPT, Google Workspace
 * - MCP Servers, Notion, GitHub, Slack
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Search,
  Upload,
  Settings,
  Zap,
  Database,
  MessageSquare,
  FileText,
  Mail,
  Calendar,
  Code,
  Hash,
  Bell,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface PlatformCard {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync?: string;
  nextSync?: string;
  stats?: {
    label: string;
    value: string | number;
  }[];
  quickActions?: {
    label: string;
    url: string;
  }[];
}

interface ActivityItem {
  id: string;
  platform: string;
  type: string;
  title: string;
  description?: string;
  action: string;
  status: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  url?: string;
}

export default function IntegrationHubPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [platforms, setPlatforms] = useState<PlatformCard[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session) {
      loadHubData();
    }
  }, [session]);

  const loadHubData = async () => {
    try {
      setLoading(true);

      // Load platform stats
      const statsRes = await fetch('/api/hub/stats');
      const statsData = await statsRes.json();

      // Load recent activity
      const activityRes = await fetch('/api/hub/activity?limit=20');
      const activityData = await activityRes.json();

      if (statsData.platforms) {
        setPlatforms(statsData.platforms);
      }

      if (activityData.activity) {
        setActivity(activityData.activity);
      }
    } catch (error) {
      console.error('Failed to load hub data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHubData();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'syncing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation':
        return <MessageSquare className="w-4 h-4" />;
      case 'file_upload':
        return <FileText className="w-4 h-4" />;
      case 'email_received':
        return <Mail className="w-4 h-4" />;
      case 'event_created':
        return <Calendar className="w-4 h-4" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4" />;
      case 'code':
        return <Code className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <p className="text-gray-400">Access the Integration Hub with your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Integration Hub</h1>
              <p className="text-gray-400">Unified command center for all your AI platforms</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={() => router.push('/hub/search')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Universal Search
              </button>

              <button
                onClick={() => router.push('/hub/import')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>

              <button
                onClick={() => router.push('/hub/settings')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Platform Cards */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                Connected Platforms
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KimbleAI Platform */}
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-2xl">
                        💜
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">KimbleAI</h3>
                        <p className="text-sm text-gray-400">Main Platform</p>
                      </div>
                    </div>
                    {getStatusIcon('active')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Conversations</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Files</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Dashboard
                  </button>
                </div>

                {/* Claude Projects */}
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                        🤖
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Claude Projects</h3>
                        <p className="text-sm text-gray-400">Anthropic Claude</p>
                      </div>
                    </div>
                    {getStatusIcon('inactive')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Projects</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Artifacts</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/hub/import')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Import Data
                  </button>
                </div>

                {/* ChatGPT */}
                <div className="bg-gradient-to-br from-teal-900/50 to-teal-800/30 border border-teal-700/50 rounded-xl p-6 hover:border-teal-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center text-2xl">
                        💬
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">ChatGPT</h3>
                        <p className="text-sm text-gray-400">OpenAI ChatGPT</p>
                      </div>
                    </div>
                    {getStatusIcon('active')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Imported</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last sync</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/chatgpt-import')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage Imports
                  </button>
                </div>

                {/* Google Workspace */}
                <div className="bg-gradient-to-br from-yellow-900/50 to-orange-800/30 border border-yellow-700/50 rounded-xl p-6 hover:border-yellow-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-red-500 rounded-lg flex items-center justify-center text-2xl font-bold text-white">
                        G
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Google Workspace</h3>
                        <p className="text-sm text-gray-400">Drive, Gmail, Calendar</p>
                      </div>
                    </div>
                    {getStatusIcon(session ? 'active' : 'inactive')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Services</span>
                      <span className="text-white font-medium">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span className="text-green-500 font-medium">Connected</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/integrations')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Manage
                  </button>
                </div>

                {/* MCP Servers */}
                <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-700/50 rounded-xl p-6 hover:border-orange-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-2xl">
                        🔌
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">MCP Servers</h3>
                        <p className="text-sm text-gray-400">Model Context Protocol</p>
                      </div>
                    </div>
                    {getStatusIcon('active')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Servers</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Tools</span>
                      <span className="text-white font-medium">-</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/code')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Servers
                  </button>
                </div>

                {/* Notion */}
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600/50 rounded-xl p-6 hover:border-gray-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                        📝
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Notion</h3>
                        <p className="text-sm text-gray-400">Pages & Databases</p>
                      </div>
                    </div>
                    {getStatusIcon('inactive')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span className="text-gray-500 font-medium">Not Connected</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/hub/settings')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Connect
                  </button>
                </div>

                {/* GitHub */}
                <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-slate-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-2xl">
                        🐙
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">GitHub</h3>
                        <p className="text-sm text-gray-400">Repositories & Code</p>
                      </div>
                    </div>
                    {getStatusIcon('inactive')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span className="text-gray-500 font-medium">Not Connected</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/hub/settings')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Connect
                  </button>
                </div>

                {/* Slack */}
                <div className="bg-gradient-to-br from-purple-800/50 to-pink-800/30 border border-purple-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-700 rounded-lg flex items-center justify-center text-2xl">
                        💬
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Slack</h3>
                        <p className="text-sm text-gray-400">Channels & Messages</p>
                      </div>
                    </div>
                    {getStatusIcon('inactive')}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <span className="text-gray-500 font-medium">Not Connected</span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/hub/settings')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Quick Actions
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => router.push('/hub/search')}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <Search className="w-6 h-6 text-blue-400" />
                    <span className="text-sm text-white">Search All</span>
                  </button>

                  <button
                    onClick={() => router.push('/hub/import')}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <Upload className="w-6 h-6 text-purple-400" />
                    <span className="text-sm text-white">Import</span>
                  </button>

                  <button
                    onClick={() => router.push('/hub/graph')}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <span className="text-sm text-white">Graph</span>
                  </button>

                  <button
                    onClick={() => router.push('/hub/settings')}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <Settings className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-white">Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Activity Feed */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Recent Activity
              </h2>

              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 max-h-[800px] overflow-y-auto">
                {activity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
                        onClick={() => item.url && router.push(item.url)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            item.status === 'success' ? 'bg-green-900/50' :
                            item.status === 'error' ? 'bg-red-900/50' :
                            item.status === 'warning' ? 'bg-yellow-900/50' :
                            'bg-blue-900/50'
                          }`}>
                            {getActivityIcon(item.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium text-white truncate">
                                {item.title}
                              </h4>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                            </div>

                            {item.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300">
                                {item.platform}
                              </span>
                              <span className="text-xs text-gray-500">
                                {item.action}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
