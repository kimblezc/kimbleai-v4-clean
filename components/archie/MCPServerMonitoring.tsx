/**
 * MCP Server Monitoring Component
 *
 * Displays MCP server status and capabilities on the Archie dashboard.
 * Shows connected servers, available tools, and quick access to the full registry.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  toolsCount: number;
  resourcesCount: number;
  transport: string;
}

interface MCPHealthData {
  success: boolean;
  overall: {
    healthy: boolean;
    status: string;
    connectedServers: number;
    totalServers: number;
  };
  capabilities: {
    tools: number;
    resources: number;
  };
  servers: MCPServer[];
}

export function MCPServerMonitoring() {
  const [healthData, setHealthData] = useState<MCPHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setError(null);
      const response = await fetch('/api/mcp/health');
      const data = await response.json();

      if (data.success) {
        setHealthData(data);
      } else {
        setError(data.error || 'Failed to fetch health data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch MCP health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Poll every 15 seconds
    const interval = setInterval(fetchHealth, 15000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900/80 via-purple-900/10 to-slate-900/80 border-purple-500/20 p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-slate-400 mt-2 text-sm">Loading MCP servers...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-950/20 border-red-500/30 p-6">
        <div className="flex items-center gap-3">
          <div className="text-red-400 text-2xl">⚠️</div>
          <div>
            <div className="text-red-400 font-semibold">MCP Health Check Failed</div>
            <div className="text-red-300/70 text-sm mt-1">{error}</div>
          </div>
        </div>
      </Card>
    );
  }

  if (!healthData) {
    return null;
  }

  const connectedServers = healthData.servers.filter((s) => s.status === 'connected');

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 via-purple-900/10 to-slate-900/80 border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-purple-500/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                🔮 MCP Server Status
              </h2>
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  healthData.overall.healthy
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {healthData.overall.status}
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Model Context Protocol • Real-time server monitoring
            </p>
          </div>

          <Link
            href="/integrations/mcp"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105"
          >
            Manage Servers →
          </Link>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-950/50 rounded-lg border border-purple-500/20">
            <div className="text-slate-400 text-xs mb-1">Connected</div>
            <div className="text-3xl font-bold text-emerald-400">
              {healthData.overall.connectedServers}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              of {healthData.overall.totalServers} total
            </div>
          </div>

          <div className="p-4 bg-slate-950/50 rounded-lg border border-indigo-500/20">
            <div className="text-slate-400 text-xs mb-1">Available Tools</div>
            <div className="text-3xl font-bold text-indigo-400">
              {healthData.capabilities.tools}
            </div>
            <div className="text-slate-500 text-xs mt-1">across all servers</div>
          </div>

          <div className="p-4 bg-slate-950/50 rounded-lg border border-pink-500/20">
            <div className="text-slate-400 text-xs mb-1">Resources</div>
            <div className="text-3xl font-bold text-pink-400">
              {healthData.capabilities.resources}
            </div>
            <div className="text-slate-500 text-xs mt-1">accessible</div>
          </div>

          <div className="p-4 bg-slate-950/50 rounded-lg border border-purple-500/20">
            <div className="text-slate-400 text-xs mb-1">Health Status</div>
            <div className={`text-3xl font-bold ${
              healthData.overall.healthy ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {healthData.overall.healthy ? '✓' : '✕'}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {healthData.overall.healthy ? 'All systems operational' : 'Issues detected'}
            </div>
          </div>
        </div>

        {/* Connected Servers */}
        {connectedServers.length > 0 ? (
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>Connected Servers</span>
              <span className="text-xs text-slate-400">({connectedServers.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectedServers.map((server) => (
                <div
                  key={server.id}
                  className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg hover:border-emerald-500/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-semibold group-hover:text-emerald-300 transition-colors">
                      {server.name}
                    </div>
                    <div className="text-emerald-400 text-xs">✓</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Tools:</span>{' '}
                      <span className="text-indigo-300 font-semibold">{server.toolsCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Resources:</span>{' '}
                      <span className="text-pink-300 font-semibold">{server.resourcesCount}</span>
                    </div>
                    <div className="text-slate-500">{server.transport}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🔌</div>
            <div className="text-slate-400 mb-2">No servers connected</div>
            <div className="text-slate-500 text-sm mb-4">
              Connect to MCP servers to expand Archie&apos;s capabilities
            </div>
            <Link
              href="/integrations/mcp"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105"
            >
              Connect Servers
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
