/**
 * MCP Server Monitoring - Archie View
 *
 * Quick status overview of MCP servers with link to full registry.
 * Shows connection status, available tools, and health metrics.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  toolsCount: number;
  resourcesCount: number;
  transport: string;
  lastHealthCheck?: string;
  lastError?: {
    message: string;
  };
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

export default function MCPMonitoringPage() {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-400 bg-green-900/30 border-green-500/40';
      case 'connecting':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/40';
      case 'error':
        return 'text-red-400 bg-red-900/30 border-red-500/40';
      default:
        return 'text-slate-400 bg-slate-900/30 border-slate-600/40';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return '✓';
      case 'connecting':
        return '⟳';
      case 'error':
        return '✗';
      default:
        return '○';
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
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-5xl">🔌</span>
                  <h1 className="text-4xl font-bold text-white">MCP Server Monitoring</h1>
                </div>
                <p className="text-slate-400 text-lg">
                  Model Context Protocol server status and capabilities
                </p>
              </div>

              <Link
                href="/integrations/mcp"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Open Full Registry →
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-12 text-center backdrop-blur-sm">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
              <p className="text-slate-400">Loading MCP server status...</p>
            </div>
          ) : error ? (
            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-red-400 text-4xl">⚠️</div>
                <div>
                  <div className="text-red-400 font-semibold text-xl">MCP Health Check Failed</div>
                  <div className="text-red-300/70 text-sm mt-1">{error}</div>
                </div>
              </div>
              <button
                onClick={fetchHealth}
                className="px-4 py-2 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 hover:bg-red-900/70 transition-colors text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          ) : healthData ? (
            <>
              {/* System Status Card */}
              <div className={`
                mb-8 p-6 rounded-lg border-2 backdrop-blur-sm
                ${healthData.overall.healthy
                  ? 'bg-green-900/20 border-green-500/40'
                  : 'bg-red-900/20 border-red-500/40'
                }
              `}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl ${healthData.overall.healthy ? 'animate-pulse' : ''}`}>
                      {healthData.overall.healthy ? '✅' : '⚠️'}
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${
                        healthData.overall.healthy ? 'text-green-400' : 'text-red-400'
                      }`}>
                        MCP System: {healthData.overall.status}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {healthData.overall.connectedServers} of {healthData.overall.totalServers} servers connected
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-center">
                    <div>
                      <div className="text-3xl font-bold text-white">{healthData.capabilities.tools}</div>
                      <div className="text-xs text-slate-500">Available Tools</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-white">{healthData.capabilities.resources}</div>
                      <div className="text-xs text-slate-500">Resources</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Server List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {healthData.servers.length === 0 ? (
                  <div className="col-span-2 bg-slate-900/50 border border-slate-700/50 rounded-lg p-12 text-center backdrop-blur-sm">
                    <div className="text-6xl mb-4">📦</div>
                    <div className="text-slate-400 text-lg mb-2">No MCP Servers Configured</div>
                    <div className="text-slate-500 text-sm mb-6">
                      Get started by installing servers from the registry
                    </div>
                    <Link
                      href="/integrations/mcp"
                      className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Browse Server Registry →
                    </Link>
                  </div>
                ) : (
                  healthData.servers.map((server) => (
                    <div
                      key={server.id}
                      className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm hover:border-indigo-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{server.name}</h3>
                          <div className="text-sm text-slate-500">
                            Transport: <span className="text-slate-400 font-mono">{server.transport}</span>
                          </div>
                        </div>

                        <div className={`
                          px-3 py-1.5 rounded-full border text-xs font-semibold
                          ${getStatusColor(server.status)}
                        `}>
                          <span className="mr-1">{getStatusIcon(server.status)}</span>
                          {server.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-950/50 rounded-md p-3">
                          <div className="text-xs text-slate-500 mb-1">Tools</div>
                          <div className="text-2xl font-bold text-white">{server.toolsCount}</div>
                        </div>
                        <div className="bg-slate-950/50 rounded-md p-3">
                          <div className="text-xs text-slate-500 mb-1">Resources</div>
                          <div className="text-2xl font-bold text-white">{server.resourcesCount}</div>
                        </div>
                      </div>

                      {server.lastError && (
                        <div className="bg-red-950/30 border border-red-500/30 rounded-md p-3 mb-4">
                          <div className="text-xs text-red-400 font-semibold mb-1">LAST ERROR</div>
                          <div className="text-sm text-red-300">{server.lastError.message}</div>
                        </div>
                      )}

                      {server.lastHealthCheck && (
                        <div className="text-xs text-slate-500">
                          Last check: {new Date(server.lastHealthCheck).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Quick Info */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <span>📚</span>
                    What is MCP?
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Model Context Protocol (MCP) is an open standard that enables AI applications to
                    securely connect to external data sources and tools. MCP servers provide context
                    and capabilities that enhance your AI's knowledge and abilities.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <span>🚀</span>
                    Getting Started
                  </h3>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">1.</span>
                      <span>Browse the server registry to find useful integrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">2.</span>
                      <span>Install and configure servers for your needs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">3.</span>
                      <span>Monitor their health and performance here</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
