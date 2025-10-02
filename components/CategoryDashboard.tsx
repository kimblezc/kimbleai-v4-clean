// components/CategoryDashboard.tsx
// Main dashboard for content organization by category

'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  keywords: string[];
  metadata: any;
}

interface CategoryStats {
  category_id: string;
  category_name: string;
  icon: string;
  color: string;
  transcription_count: number;
  project_count: number;
  conversation_count: number;
  knowledge_count: number;
  total_audio_size: number;
  total_audio_duration: number;
  last_activity: string;
}

interface ContentItem {
  content_type: string;
  content_id: string;
  title: string;
  created_at: string;
  metadata: any;
}

export default function CategoryDashboard({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryContent, setCategoryContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'all' | 'audio' | 'projects' | 'conversations' | 'knowledge'>('all');

  // Load categories and stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load categories
      const categoriesResponse = await fetch(`/api/categories?userId=${userId}&action=list`);
      if (!categoriesResponse.ok) throw new Error('Failed to load categories');
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData.categories || []);

      // Load stats
      const statsResponse = await fetch(`/api/categories?userId=${userId}&action=stats`);
      if (!statsResponse.ok) throw new Error('Failed to load statistics');
      const statsData = await statsResponse.json();
      setStats(statsData.stats || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load content for selected category
  const loadCategoryContent = useCallback(async (categoryId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/categories?userId=${userId}&action=content&categoryId=${categoryId}&contentType=${contentType}&limit=50`
      );

      if (!response.ok) throw new Error('Failed to load category content');
      const data = await response.json();
      setCategoryContent(data.content || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, contentType]);

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryContent(selectedCategory);
    }
  }, [selectedCategory, contentType, loadCategoryContent]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Get category stats
  const getCategoryStats = (categoryId: string): CategoryStats | undefined => {
    return stats.find(s => s.category_id === categoryId);
  };

  // Calculate total items for a category
  const getTotalItems = (stat: CategoryStats): number => {
    return (stat.transcription_count || 0) +
           (stat.project_count || 0) +
           (stat.conversation_count || 0) +
           (stat.knowledge_count || 0);
  };

  const cardStyle = "bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 cursor-pointer";
  const selectedCardStyle = "bg-blue-50 rounded-lg shadow-lg p-6 border-2 border-blue-500 cursor-pointer";
  const buttonStyle = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors";

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">Content Organization</h1>
        <p className="text-gray-600">Organize and access your D&D sessions, military transition content, and more</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const stat = getCategoryStats(category.id);
          const totalItems = stat ? getTotalItems(stat) : 0;
          const isSelected = selectedCategory === category.id;

          return (
            <div
              key={category.id}
              className={isSelected ? selectedCardStyle : cardStyle}
              onClick={() => setSelectedCategory(category.id)}
              style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{category.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {stat && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold">{totalItems}</span>
                  </div>

                  {stat.transcription_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transcriptions:</span>
                      <span className="font-semibold">{stat.transcription_count}</span>
                    </div>
                  )}

                  {stat.project_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Projects:</span>
                      <span className="font-semibold">{stat.project_count}</span>
                    </div>
                  )}

                  {stat.conversation_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conversations:</span>
                      <span className="font-semibold">{stat.conversation_count}</span>
                    </div>
                  )}

                  {stat.knowledge_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Knowledge Items:</span>
                      <span className="font-semibold">{stat.knowledge_count}</span>
                    </div>
                  )}

                  {stat.total_audio_duration > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Audio Duration:</span>
                      <span className="font-semibold">{formatDuration(stat.total_audio_duration)}</span>
                    </div>
                  )}

                  {stat.last_activity && (
                    <div className="flex justify-between text-xs pt-2 border-t">
                      <span className="text-gray-500">Last Activity:</span>
                      <span className="text-gray-700">
                        {new Date(stat.last_activity).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!stat && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No content yet
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Content Viewer */}
      {selectedCategory && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Content Type Filter */}
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {categories.find(c => c.id === selectedCategory)?.icon}
                {categories.find(c => c.id === selectedCategory)?.name} Content
              </h2>

              <div className="flex gap-2">
                {['all', 'audio', 'projects', 'conversations', 'knowledge'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type as any)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      contentType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content List */}
          <div className="p-6">
            {loading && (
              <div className="text-center py-8 text-gray-500">
                Loading content...
              </div>
            )}

            {!loading && categoryContent.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No {contentType !== 'all' ? contentType : 'content'} items found in this category
              </div>
            )}

            {!loading && categoryContent.length > 0 && (
              <div className="space-y-4">
                {categoryContent.map((item) => (
                  <div
                    key={item.content_id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                            {item.content_type}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            Created: {new Date(item.created_at).toLocaleString()}
                          </div>

                          {/* Type-specific metadata */}
                          {item.content_type === 'audio' && item.metadata && (
                            <div className="flex gap-4">
                              {item.metadata.duration && (
                                <span>Duration: {formatDuration(item.metadata.duration)}</span>
                              )}
                              {item.metadata.file_size && (
                                <span>Size: {formatFileSize(item.metadata.file_size)}</span>
                              )}
                              {item.metadata.importance && (
                                <span>Importance: {(item.metadata.importance * 100).toFixed(0)}%</span>
                              )}
                            </div>
                          )}

                          {item.content_type === 'project' && item.metadata && (
                            <div className="flex gap-4">
                              {item.metadata.status && (
                                <span className="capitalize">Status: {item.metadata.status}</span>
                              )}
                              {item.metadata.priority && (
                                <span className="capitalize">Priority: {item.metadata.priority}</span>
                              )}
                            </div>
                          )}

                          {item.content_type === 'conversation' && item.metadata && (
                            <div className="flex gap-4">
                              {item.metadata.message_count && (
                                <span>Messages: {item.metadata.message_count}</span>
                              )}
                            </div>
                          )}

                          {/* Tags */}
                          {item.metadata?.tags && item.metadata.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-2">
                              {item.metadata.tags.slice(0, 5).map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        onClick={() => {
                          // Navigate to content (implement navigation logic)
                          console.log('Navigate to:', item.content_type, item.content_id);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedCategory && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Select a category above to view its content</p>
        </div>
      )}
    </div>
  );
}
