'use client';

import React, { useState, useEffect } from 'react';
import KnowledgeGraphViz from './KnowledgeGraphViz';
import { Entity, EntityType, RelationshipType } from '@/lib/knowledge-graph-db';

interface GraphStats {
  totalEntities: number;
  totalRelationships: number;
  entityTypeDistribution: Record<string, number>;
  relationshipTypeDistribution: Record<string, number>;
  topConnectedEntities: Entity[];
  recentActivity: {
    entities: Entity[];
    relationships: any[];
  };
}

interface GraphInsight {
  type: 'connection' | 'cluster' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  entities: string[];
  confidence: number;
  actionable?: boolean;
  metadata?: Record<string, any>;
}

interface RecommendationResult {
  entityId: string;
  recommendedEntities: Array<{
    entity: Entity;
    reason: string;
    confidence: number;
    relationshipType: RelationshipType;
  }>;
  potentialConnections: Array<{
    fromEntity: Entity;
    toEntity: Entity;
    suggestedRelationship: RelationshipType;
    evidence: string;
    confidence: number;
  }>;
}

export default function KnowledgeGraphDashboard() {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [insights, setInsights] = useState<GraphInsight[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [searchResults, setSearchResults] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'stats' | 'insights' | 'search'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingContent, setProcessingContent] = useState('');
  const [contentType, setContentType] = useState<'text' | 'conversation' | 'file' | 'email'>('text');

  useEffect(() => {
    loadStats();
    loadInsights();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/agents/knowledge-graph?action=stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await fetch('/api/agents/knowledge-graph?action=insights');
      const result = await response.json();
      if (result.success) {
        setInsights(result.data.insights);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'search',
        query: searchQuery,
        includeConnections: 'false'
      });

      const response = await fetch(`/api/agents/knowledge-graph?${params}`);
      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data.entities);
        setActiveTab('search');
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntityClick = async (entity: Entity) => {
    setSelectedEntity(entity);

    // Load recommendations for this entity
    try {
      const response = await fetch('/api/agents/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommend',
          entityId: entity.id
        })
      });

      const result = await response.json();
      if (result.success) {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const processContent = async () => {
    if (!processingContent.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process',
          content: processingContent,
          contentType,
          sourceId: `manual_${Date.now()}`,
          metadata: {
            processedAt: new Date().toISOString(),
            manual: true
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Successfully processed content! Found ${result.data.entities.length} entities and ${result.data.relationships.length} relationships.`);
        setProcessingContent('');

        // Refresh stats and insights
        await loadStats();
        await loadInsights();
      } else {
        alert('Error processing content: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing content:', error);
      alert('Error processing content');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGraph = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });

      const result = await response.json();
      if (result.success) {
        alert('Knowledge graph initialized successfully!');
      } else {
        alert('Error initializing: ' + result.error);
      }
    } catch (error) {
      console.error('Error initializing:', error);
      alert('Error initializing knowledge graph');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Graph Agent</h1>
          <button
            onClick={initializeGraph}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Initialize Graph
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Intelligently connect all your data through entity extraction and relationship mapping.
        </p>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Entities</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.totalEntities}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Relationships</h3>
              <p className="text-2xl font-bold text-green-600">{stats.totalRelationships}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900">Top Connected</h3>
              <p className="text-2xl font-bold text-purple-600">{stats.topConnectedEntities.length}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-900">Recent Activity</h3>
              <p className="text-2xl font-bold text-orange-600">
                {stats.recentActivity.entities.length + stats.recentActivity.relationships.length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Content Processing */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Process New Content</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Text</option>
              <option value="conversation">Conversation</option>
              <option value="file">File</option>
              <option value="email">Email</option>
            </select>
          </div>
          <textarea
            value={processingContent}
            onChange={(e) => setProcessingContent(e.target.value)}
            placeholder="Enter content to analyze and add to the knowledge graph..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={processContent}
            disabled={isLoading || !processingContent.trim()}
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Process Content
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Search Knowledge Graph</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities, relationships, or content..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {[
              { id: 'graph', label: 'Graph Visualization' },
              { id: 'stats', label: 'Statistics' },
              { id: 'insights', label: 'Insights' },
              { id: 'search', label: 'Search Results' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Graph Visualization Tab */}
          {activeTab === 'graph' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Knowledge Graph Visualization</h2>
              <KnowledgeGraphViz
                width={800}
                height={600}
                onNodeClick={handleEntityClick}
                centerEntityId={selectedEntity?.id}
              />
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && stats && (
            <div>
              <h2 className="text-xl font-bold mb-4">Knowledge Graph Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Entity Type Distribution */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Entity Types</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.entityTypeDistribution).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Connected Entities */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Most Connected Entities</h3>
                  <div className="space-y-2">
                    {stats.topConnectedEntities.map((entity) => (
                      <div
                        key={entity.id}
                        className="flex justify-between items-center cursor-pointer hover:bg-gray-100 p-2 rounded"
                        onClick={() => handleEntityClick(entity)}
                      >
                        <div>
                          <span className="font-medium">{entity.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({entity.type})</span>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {entity.confidence_score?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Knowledge Graph Insights</h2>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === 'connection' ? 'border-blue-500 bg-blue-50' :
                      insight.type === 'cluster' ? 'border-green-500 bg-green-50' :
                      insight.type === 'trend' ? 'border-purple-500 bg-purple-50' :
                      insight.type === 'recommendation' ? 'border-orange-500 bg-orange-50' :
                      'border-gray-500 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{insight.title}</h3>
                        <p className="text-gray-600 mt-1">{insight.description}</p>
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">Entities: </span>
                          <span className="text-sm">{insight.entities.join(', ')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium capitalize">{insight.type}</span>
                        <div className="text-xs text-gray-500">
                          Confidence: {(insight.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {insights.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No insights available. Add more content to generate insights.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Search Results Tab */}
          {activeTab === 'search' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Search Results</h2>
              <div className="space-y-3">
                {searchResults.map((entity) => (
                  <div
                    key={entity.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEntityClick(entity)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{entity.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{entity.type}</p>
                        {entity.content && (
                          <p className="text-gray-600 mt-1 text-sm">
                            {entity.content.substring(0, 200)}...
                          </p>
                        )}
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {(entity.confidence_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && searchQuery && (
                  <p className="text-gray-500 text-center py-8">
                    No entities found matching "{searchQuery}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entity Details Panel */}
      {selectedEntity && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Entity Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{selectedEntity.name}</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Type:</strong> <span className="capitalize">{selectedEntity.type}</span></div>
                <div><strong>Confidence:</strong> {(selectedEntity.confidence_score * 100).toFixed(1)}%</div>
                <div><strong>Created:</strong> {new Date(selectedEntity.created_at).toLocaleDateString()}</div>
                {selectedEntity.source_type && (
                  <div><strong>Source:</strong> {selectedEntity.source_type}</div>
                )}
              </div>
              {selectedEntity.content && (
                <div className="mt-4">
                  <h4 className="font-semibold">Content:</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedEntity.content}</p>
                </div>
              )}
            </div>

            {recommendations && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
                <div className="space-y-3">
                  {recommendations.recommendedEntities.slice(0, 5).map((rec, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="font-medium">{rec.entity.name}</div>
                      <div className="text-sm text-gray-600">{rec.reason}</div>
                      <div className="text-xs text-gray-500">
                        Confidence: {(rec.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-center">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}