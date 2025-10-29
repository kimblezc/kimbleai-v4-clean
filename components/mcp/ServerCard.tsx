/**
 * MCP Server Card Component
 *
 * Displays an individual MCP server with status, metrics, and controls.
 * Dark D&D themed with mystical visual effects.
 */

'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';

interface ServerCardProps {
  server: {
    id: string;
    name: string;
    description: string;
    transport: 'stdio' | 'sse' | 'http';
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    isConnected: boolean;
    priority: number;
    tags: string[];
    metrics: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
    };
    toolsCount: number;
    resourcesCount: number;
    promptsCount: number;
    connectedAt?: string;
    lastHealthCheck?: string;
    lastError?: {
      message: string;
      code?: string;
    };
  };
  onRefresh: () => void;
}

export function ServerCard({ server, onRefresh }: ServerCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Status colors and icons
  const statusConfig = {
    connected: {
      color: 'emerald',
      icon: '✓',
      label: 'Connected',
      borderClass: 'border-emerald-500/30',
      glowClass: 'shadow-emerald-500/20',
      bgClass: 'bg-emerald-950/20',
    },
    disconnected: {
      color: 'slate',
      icon: '○',
      label: 'Disconnected',
      borderClass: 'border-slate-500/20',
      glowClass: 'shadow-slate-500/10',
      bgClass: 'bg-slate-900/50',
    },
    connecting: {
      color: 'blue',
      icon: '◐',
      label: 'Connecting...',
      borderClass: 'border-blue-500/30',
      glowClass: 'shadow-blue-500/20',
      bgClass: 'bg-blue-950/20',
    },
    error: {
      color: 'red',
      icon: '✕',
      label: 'Error',
      borderClass: 'border-red-500/30',
      glowClass: 'shadow-red-500/20',
      bgClass: 'bg-red-950/20',
    },
  };

  const statusStyle = statusConfig[server.status] || statusConfig.disconnected;

  // Transport icons
  const transportIcons = {
    stdio: '⚡',
    sse: '📡',
    http: '🌐',
  };

  // Handle connect/disconnect
  const handleToggleConnection = async () => {
    setIsConnecting(true);

    try {
      const endpoint = server.isConnected
        ? `/api/mcp/servers/${server.id}/connect`
        : `/api/mcp/servers/${server.id}/connect`;

      const method = server.isConnected ? 'DELETE' : 'POST';

      const response = await fetch(endpoint, { method });
      const data = await response.json();

      if (data.success) {
        // Refresh server list
        onRefresh();
        toast.success(`Successfully ${server.isConnected ? 'disconnected from' : 'connected to'} ${server.name}`, {
          duration: 3000,
        });
      } else {
        console.error('MCP server connection error:', data.error);
        toast.error(`Failed to ${server.isConnected ? 'disconnect from' : 'connect to'} server: ${data.error}`, {
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('MCP server connection exception:', error);
      toast.error(`Connection error: ${error.message}`, {
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Calculate success rate
  const successRate =
    server.metrics.totalRequests > 0
      ? Math.round(
          (server.metrics.successfulRequests / server.metrics.totalRequests) * 100
        )
      : 0;

  return (
    <Card
      className={`${statusStyle.bgClass} border ${statusStyle.borderClass} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${statusStyle.glowClass} group`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                {server.name}
              </h3>
              <span className="text-lg">{transportIcons[server.transport]}</span>
            </div>
            <p className="text-slate-400 text-sm line-clamp-2">{server.description}</p>
          </div>

          {/* Status Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              server.status === 'connected'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : server.status === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : server.status === 'connecting'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}
          >
            {statusStyle.icon} {statusStyle.label}
          </div>
        </div>

        {/* Tags */}
        {server.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {server.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-purple-500/10 text-purple-300 text-xs rounded border border-purple-500/20"
              >
                #{tag}
              </span>
            ))}
            {server.tags.length > 3 && (
              <span className="px-2 py-1 bg-slate-500/10 text-slate-400 text-xs rounded border border-slate-500/20">
                +{server.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Capabilities */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-indigo-500/10 rounded border border-indigo-500/20">
            <div className="text-2xl font-bold text-indigo-400">{server.toolsCount}</div>
            <div className="text-xs text-slate-400">Tools</div>
          </div>
          <div className="text-center p-2 bg-pink-500/10 rounded border border-pink-500/20">
            <div className="text-2xl font-bold text-pink-400">{server.resourcesCount}</div>
            <div className="text-xs text-slate-400">Resources</div>
          </div>
          <div className="text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
            <div className="text-2xl font-bold text-purple-400">{server.promptsCount}</div>
            <div className="text-xs text-slate-400">Prompts</div>
          </div>
        </div>

        {/* Metrics (if connected) */}
        {server.isConnected && server.metrics.totalRequests > 0 && (
          <div className="mb-4 p-3 bg-slate-950/50 rounded border border-slate-500/20">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-400 text-xs mb-1">Total Requests</div>
                <div className="text-white font-semibold">{server.metrics.totalRequests}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Success Rate</div>
                <div
                  className={`font-semibold ${
                    successRate >= 90
                      ? 'text-emerald-400'
                      : successRate >= 70
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}
                >
                  {successRate}%
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Avg Response</div>
                <div className="text-white font-semibold">
                  {Math.round(server.metrics.averageResponseTime)}ms
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Failed</div>
                <div className="text-red-400 font-semibold">{server.metrics.failedRequests}</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {server.status === 'error' && server.lastError && (
          <div className="mb-4 p-3 bg-red-950/20 border border-red-500/30 rounded">
            <div className="text-red-400 text-sm font-semibold mb-1">Last Error</div>
            <div className="text-red-300/70 text-xs">{server.lastError.message}</div>
            {server.lastError.code && (
              <div className="text-red-400/50 text-xs mt-1">Code: {server.lastError.code}</div>
            )}
          </div>
        )}

        {/* Expandable Details */}
        {isExpanded && server.isConnected && (
          <div className="mb-4 p-3 bg-slate-950/50 rounded border border-slate-500/20 text-xs">
            <div className="space-y-2">
              <div>
                <span className="text-slate-400">Priority:</span>{' '}
                <span className="text-white">{server.priority}</span>
              </div>
              <div>
                <span className="text-slate-400">Transport:</span>{' '}
                <span className="text-white">{server.transport}</span>
              </div>
              {server.connectedAt && (
                <div>
                  <span className="text-slate-400">Connected:</span>{' '}
                  <span className="text-white">
                    {new Date(server.connectedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {server.lastHealthCheck && (
                <div>
                  <span className="text-slate-400">Last Health Check:</span>{' '}
                  <span className="text-white">
                    {new Date(server.lastHealthCheck).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleToggleConnection}
            disabled={isConnecting || server.status === 'connecting'}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              server.isConnected
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isConnecting
              ? '...'
              : server.isConnected
                ? 'Disconnect'
                : 'Connect'}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            {isExpanded ? '↑' : 'ℹ️'}
          </button>
        </div>
      </div>
    </Card>
  );
}
