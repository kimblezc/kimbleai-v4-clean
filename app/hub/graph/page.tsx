'use client';

/**
 * KNOWLEDGE GRAPH VISUALIZER
 *
 * Interactive visualization of connections between:
 * - Conversations, files, and knowledge
 * - Tag relationships
 * - User activity patterns
 * - Platform interconnections
 * - Topic clusters
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Network,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'conversation' | 'file' | 'tag' | 'platform' | 'user' | 'topic';
  size: number;
  color: string;
  metadata?: any;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function KnowledgeGraphPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filters, setFilters] = useState({
    showConversations: true,
    showFiles: true,
    showTags: true,
    showPlatforms: true,
    minConnections: 1,
  });

  useEffect(() => {
    if (session) {
      loadGraphData();
    }
  }, [session]);

  const loadGraphData = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/hub/graph');
      const data = await response.json();

      if (data.graph) {
        setGraphData(data.graph);
      }
    } catch (error) {
      console.error('Failed to load graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'conversation':
        return '#8B5CF6'; // Purple
      case 'file':
        return '#3B82F6'; // Blue
      case 'tag':
        return '#10B981'; // Green
      case 'platform':
        return '#F59E0B'; // Orange
      case 'topic':
        return '#EC4899'; // Pink
      default:
        return '#6B7280'; // Gray
    }
  };

  const exportGraph = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'knowledge-graph.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <p className="text-gray-400">Access Knowledge Graph with your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/hub')}
            className="text-gray-400 hover:text-white mb-2 text-sm"
          >
            ← Back to Hub
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Knowledge Graph</h1>
              <p className="text-gray-400">Visualize connections across your data</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadGraphData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={exportGraph}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar: Filters & Stats */}
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-purple-500" />
                  Filters
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.showConversations}
                      onChange={(e) =>
                        setFilters({ ...filters, showConversations: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-white">Conversations</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.showFiles}
                      onChange={(e) =>
                        setFilters({ ...filters, showFiles: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-white">Files</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.showTags}
                      onChange={(e) =>
                        setFilters({ ...filters, showTags: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-white">Tags</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.showPlatforms}
                      onChange={(e) =>
                        setFilters({ ...filters, showPlatforms: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-white">Platforms</span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-300 mb-2">
                    Min Connections: {filters.minConnections}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters.minConnections}
                    onChange={(e) =>
                      setFilters({ ...filters, minConnections: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Statistics
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Nodes</span>
                    <span className="text-sm text-white font-medium">
                      {graphData.nodes.length}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Connections</span>
                    <span className="text-sm text-white font-medium">
                      {graphData.edges.length}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Conversations</span>
                    <span className="text-sm text-white font-medium">
                      {graphData.nodes.filter((n) => n.type === 'conversation').length}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Files</span>
                    <span className="text-sm text-white font-medium">
                      {graphData.nodes.filter((n) => n.type === 'file').length}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Tags</span>
                    <span className="text-sm text-white font-medium">
                      {graphData.nodes.filter((n) => n.type === 'tag').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Node */}
              {selectedNode && (
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Selected Node</h3>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400">Type</p>
                      <p className="text-sm text-white capitalize">{selectedNode.type}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Label</p>
                      <p className="text-sm text-white">{selectedNode.label}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Connections</p>
                      <p className="text-sm text-white">{selectedNode.size}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Graph Visualization Area */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 h-[800px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-purple-500" />
                    Graph Visualization
                  </h3>

                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </button>
                    <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                      <ZoomOut className="w-4 h-4 text-white" />
                    </button>
                    <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Graph Canvas */}
                <div className="relative w-full h-full bg-gray-900/50 rounded-lg overflow-hidden">
                  {graphData.nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Network className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400">No graph data available</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Import conversations and files to build your knowledge graph
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8">
                      {/* Simple node visualization (placeholder for D3/Recharts) */}
                      <div className="grid grid-cols-4 gap-4">
                        {graphData.nodes.slice(0, 20).map((node) => (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-purple-500 cursor-pointer transition-all"
                            style={{
                              borderColor: selectedNode?.id === node.id ? getNodeColor(node.type) : undefined,
                            }}
                          >
                            <div
                              className="w-3 h-3 rounded-full mb-2"
                              style={{ backgroundColor: getNodeColor(node.type) }}
                            />
                            <p className="text-xs text-white font-medium truncate">
                              {node.label}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">{node.type}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {node.size} connections
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 text-center">
                        <p className="text-sm text-gray-400">
                          Interactive graph visualization with D3.js coming soon
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                    <span className="text-gray-300">Conversations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
                    <span className="text-gray-300">Files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
                    <span className="text-gray-300">Tags</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                    <span className="text-gray-300">Platforms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EC4899' }} />
                    <span className="text-gray-300">Topics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
