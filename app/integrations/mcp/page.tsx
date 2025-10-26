/**
 * MCP Server Registry
 *
 * Discover, manage, and monitor MCP (Model Context Protocol) servers.
 * Beautiful dark D&D themed interface for connecting to 2000+ community servers.
 */

'use client';

import { useState, useEffect } from 'react';
import { ServerCard } from '@/components/mcp/ServerCard';
import { ServerInstaller } from '@/components/mcp/ServerInstaller';
import { Card } from '@/components/ui/Card';

interface MCPServer {
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
}

interface ServerStats {
  total: number;
  connected: number;
  disconnected: number;
}

export default function MCPIntegrationsPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [stats, setStats] = useState<ServerStats>({ total: 0, connected: 0, disconnected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [filterTransport, setFilterTransport] = useState<'all' | 'stdio' | 'sse' | 'http'>('all');
  const [showInstaller, setShowInstaller] = useState(false);

  // Fetch servers
  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/mcp/servers';
      const params = new URLSearchParams();

      if (filterStatus !== 'all') {
        params.append('enabled', filterStatus === 'connected' ? 'true' : 'false');
      }

      if (filterTransport !== 'all') {
        params.append('transport', filterTransport);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setServers(data.servers);
        setStats({
          total: data.total,
          connected: data.connected,
          disconnected: data.disconnected,
        });
      } else {
        setError(data.error || 'Failed to fetch servers');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchServers();

    // Poll every 10 seconds
    const interval = setInterval(fetchServers, 10000);

    return () => clearInterval(interval);
  }, [filterStatus, filterTransport]);

  // Filter servers by search query
  const filteredServers = servers.filter((server) => {
    const matchesSearch =
      searchQuery === '' ||
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Calculate total capabilities
  const totalTools = servers.reduce((sum, s) => sum + s.toolsCount, 0);
  const totalResources = servers.reduce((sum, s) => sum + s.resourcesCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
              🔮 MCP Server Registry
            </h1>
            <p className="text-slate-400">
              Connect to 2000+ community servers • Expand Archie&apos;s capabilities with powerful integrations
            </p>
          </div>

          <button
            onClick={() => setShowInstaller(!showInstaller)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105"
          >
            {showInstaller ? '✕ Close Installer' : '+ Add Server'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur-sm">
            <div className="p-4">
              <div className="text-sm text-slate-400 mb-1">Total Servers</div>
              <div className="text-3xl font-bold text-purple-400">{stats.total}</div>
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-emerald-500/20 backdrop-blur-sm">
            <div className="p-4">
              <div className="text-sm text-slate-400 mb-1">Connected</div>
              <div className="text-3xl font-bold text-emerald-400">{stats.connected}</div>
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-indigo-500/20 backdrop-blur-sm">
            <div className="p-4">
              <div className="text-sm text-slate-400 mb-1">Available Tools</div>
              <div className="text-3xl font-bold text-indigo-400">{totalTools}</div>
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-pink-500/20 backdrop-blur-sm">
            <div className="p-4">
              <div className="text-sm text-slate-400 mb-1">Resources</div>
              <div className="text-3xl font-bold text-pink-400">{totalResources}</div>
            </div>
          </Card>
        </div>

        {/* Server Installer */}
        {showInstaller && (
          <div className="mb-6">
            <ServerInstaller onInstalled={fetchServers} onClose={() => setShowInstaller(false)} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search servers by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 backdrop-blur-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 backdrop-blur-sm cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected</option>
          </select>

          {/* Transport Filter */}
          <select
            value={filterTransport}
            onChange={(e) => setFilterTransport(e.target.value as any)}
            className="px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 backdrop-blur-sm cursor-pointer"
          >
            <option value="all">All Transports</option>
            <option value="stdio">Stdio</option>
            <option value="sse">SSE</option>
            <option value="http">HTTP</option>
          </select>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="max-w-7xl mx-auto">
        {loading && servers.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-slate-400 mt-4">Loading MCP servers...</p>
          </div>
        ) : error ? (
          <Card className="bg-red-950/20 border-red-500/30 p-6">
            <div className="text-red-400 font-semibold mb-2">Error loading servers</div>
            <div className="text-red-300/70 text-sm">{error}</div>
            <button
              onClick={fetchServers}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Retry
            </button>
          </Card>
        ) : filteredServers.length === 0 ? (
          <Card className="bg-slate-900/50 border-purple-500/20 p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <div className="text-xl text-slate-400 mb-2">No servers found</div>
            <div className="text-slate-500 text-sm mb-6">
              {searchQuery
                ? `No servers match "${searchQuery}"`
                : 'Get started by adding your first MCP server'}
            </div>
            {!searchQuery && (
              <button
                onClick={() => setShowInstaller(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-105"
              >
                + Add Your First Server
              </button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onRefresh={fetchServers}
              />
            ))}
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && filteredServers.length > 0 && (
          <div className="mt-6 text-center text-slate-400 text-sm">
            Showing {filteredServers.length} of {servers.length} servers
          </div>
        )}
      </div>
    </div>
  );
}
