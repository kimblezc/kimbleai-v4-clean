/**
 * PLATFORM STATUS MONITOR COMPONENT
 *
 * Real-time monitoring of all platform connections:
 * - API connectivity status
 * - Sync status and schedules
 * - Error rates and health
 * - Response times
 * - Usage statistics
 */

'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
} from 'lucide-react';

export interface PlatformStatus {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'down' | 'syncing';
  apiConnectivity: boolean;
  lastSync?: string;
  nextSync?: string;
  errorCount: number;
  errorRate: number;
  responseTime?: number;
  uptime?: number;
  syncEnabled: boolean;
  metadata?: any;
}

interface PlatformStatusMonitorProps {
  platforms?: PlatformStatus[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  onRefresh?: () => void;
}

export function PlatformStatusMonitor({
  platforms: initialPlatforms,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onRefresh,
}: PlatformStatusMonitorProps) {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>(initialPlatforms || []);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshStatus();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hub/platforms/status');
      const data = await response.json();

      if (data.platforms) {
        setPlatforms(data.platforms);
      }

      setLastUpdate(new Date());
      onRefresh?.();
    } catch (error) {
      console.error('Failed to refresh platform status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500 bg-green-900/20 border-green-700/50';
      case 'degraded':
        return 'text-yellow-500 bg-yellow-900/20 border-yellow-700/50';
      case 'down':
        return 'text-red-500 bg-red-900/20 border-red-700/50';
      case 'syncing':
        return 'text-blue-500 bg-blue-900/20 border-blue-700/50';
      default:
        return 'text-gray-500 bg-gray-900/20 border-gray-700/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'syncing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            Platform Status
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>

        <button
          onClick={refreshStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Platform List */}
      <div className="space-y-4">
        {platforms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No platforms connected</p>
          </div>
        ) : (
          platforms.map((platform) => (
            <div
              key={platform.id}
              className={`border rounded-lg p-4 ${getStatusColor(platform.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(platform.status)}
                  <div>
                    <h4 className="font-medium text-white">{platform.name}</h4>
                    <p className="text-xs text-gray-400 capitalize">{platform.type}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-white capitalize">
                    {platform.status}
                  </p>
                  {platform.responseTime && (
                    <p className="text-xs text-gray-400">
                      {platform.responseTime}ms
                    </p>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* API Connectivity */}
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">API</p>
                    <p className={`text-sm font-medium ${platform.apiConnectivity ? 'text-green-400' : 'text-red-400'}`}>
                      {platform.apiConnectivity ? 'Connected' : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Sync Status */}
                {platform.syncEnabled && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Next Sync</p>
                      <p className="text-sm font-medium text-white">
                        {platform.nextSync ? formatDuration(new Date(platform.nextSync).getTime() - Date.now()) : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Rate */}
                <div className="flex items-center gap-2">
                  {platform.errorRate > 0.1 ? (
                    <TrendingUp className="w-4 h-4 text-red-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-400" />
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Errors</p>
                    <p className={`text-sm font-medium ${platform.errorRate > 0.1 ? 'text-red-400' : 'text-green-400'}`}>
                      {(platform.errorRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Uptime */}
                {platform.uptime !== undefined && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400">Uptime</p>
                      <p className="text-sm font-medium text-white">
                        {(platform.uptime * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Last Sync */}
              {platform.lastSync && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400">
                    Last sync: {new Date(platform.lastSync).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Errors */}
              {platform.errorCount > 0 && (
                <div className="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-400">
                  {platform.errorCount} errors in last 24 hours
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
