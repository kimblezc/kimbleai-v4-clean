'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/card';
import { Button, ButtonGroup, IconButton } from '../../components/ui/Button';
import { SearchInput, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { TAG_CATEGORIES } from '@/lib/tag-utils';

interface Tag {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  color: string;
  description?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface TagStats {
  totalTags: number;
  totalUsage: number;
  avgUsagePerTag: number;
  categoryBreakdown: Record<string, { count: number; usage: number }>;
  usageDistribution: {
    unused: number;
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('usage_count');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [newTag, setNewTag] = useState({
    name: '',
    displayName: '',
    category: 'custom',
    color: '#6366f1',
    description: '',
  });

  useEffect(() => {
    loadTags();
    loadStats();
  }, []);

  useEffect(() => {
    filterAndSortTags();
  }, [tags, searchQuery, categoryFilter, sortBy]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId: 'zach',
        sortBy,
        order: 'desc',
      });
      const response = await fetch(`/api/tags?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/tags/stats?userId=zach');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filterAndSortTags = () => {
    let filtered = [...tags];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage_count':
          return b.usage_count - a.usage_count;
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredTags(filtered);
  };

  const handleCreateTag = async () => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'zach',
          ...newTag,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewTag({
          name: '',
          displayName: '',
          category: 'custom',
          color: '#6366f1',
          description: '',
        });
        loadTags();
        loadStats();
      } else {
        const error = await response.json();
        alert(`Failed to create tag: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag. Please try again.');
    }
  };

  const handleUpdateTag = async () => {
    if (!selectedTag) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'zach',
          id: selectedTag.id,
          name: newTag.name,
          displayName: newTag.displayName,
          category: newTag.category,
          color: newTag.color,
          description: newTag.description,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedTag(null);
        setNewTag({
          name: '',
          displayName: '',
          category: 'custom',
          color: '#6366f1',
          description: '',
        });
        loadTags();
        loadStats();
      } else {
        const error = await response.json();
        alert(`Failed to update tag: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
      alert('Failed to update tag. Please try again.');
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) return;

    try {
      const response = await fetch(`/api/tags?id=${tagId}&userId=zach`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadTags();
        loadStats();
      } else {
        const error = await response.json();
        alert(`Failed to delete tag: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag. Please try again.');
    }
  };

  const handleSyncTags = async () => {
    if (!confirm('Sync tags from all knowledge base entries and files? This may take a moment.')) return;

    try {
      setSyncing(true);
      const response = await fetch('/api/tags/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'zach' }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully synced ${data.tagsCount} tags from content!`);
        loadTags();
        loadStats();
      } else {
        const error = await response.json();
        alert(`Failed to sync tags: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error('Failed to sync tags:', error);
      alert('Failed to sync tags. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const openEditModal = (tag: Tag) => {
    setSelectedTag(tag);
    setNewTag({
      name: tag.name,
      displayName: tag.display_name || tag.name,
      category: tag.category,
      color: tag.color,
      description: tag.description || '',
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-400">Loading tags...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tag Management</h1>
            <p className="text-gray-400">Organize and categorize your content with tags</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon="🔄"
              onClick={handleSyncTags}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync from Content'}
            </Button>
            <Button icon="➕" onClick={() => setShowCreateModal(true)}>
              New Tag
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50">
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-blue-400">{stats.totalTags}</div>
                <div className="text-sm text-gray-300 mt-1">Total Tags</div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-700/50">
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-purple-400">{stats.totalUsage}</div>
                <div className="text-sm text-gray-300 mt-1">Total Uses</div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-700/50">
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-green-400">{stats.avgUsagePerTag}</div>
                <div className="text-sm text-gray-300 mt-1">Avg Uses/Tag</div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border-orange-700/50">
              <div className="text-center p-4">
                <div className="text-4xl font-bold text-orange-400">{stats.usageDistribution.unused}</div>
                <div className="text-sm text-gray-300 mt-1">Unused Tags</div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search tags..."
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'technical', label: 'Technical' },
                { value: 'business', label: 'Business' },
                { value: 'client', label: 'Client' },
                { value: 'priority', label: 'Priority' },
                { value: 'status', label: 'Status' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'usage_count', label: 'Most Used' },
                { value: 'name', label: 'Name' },
                { value: 'created_at', label: 'Recently Created' },
              ]}
            />
            <ButtonGroup>
              <IconButton
                icon="▦"
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('grid')}
                tooltip="Grid view"
              />
              <IconButton
                icon="☰"
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('list')}
                tooltip="List view"
              />
            </ButtonGroup>
          </div>
        </div>

        {/* Tags Display */}
        {filteredTags.length === 0 ? (
          <Card className="p-12 text-center">
            <span className="text-6xl mb-4 block">🏷️</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery || categoryFilter !== 'all'
                ? 'No tags found'
                : 'No tags yet'}
            </h3>
            <p className="text-gray-400 mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first tag or sync from existing content'}
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowCreateModal(true)}>Create Tag</Button>
                <Button variant="secondary" onClick={handleSyncTags}>
                  Sync from Content
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'
                : 'space-y-2'
            }
          >
            {filteredTags.map((tag) => (
              <Card
                key={tag.id}
                className={
                  viewMode === 'grid'
                    ? 'p-4 hover:border-gray-600 transition-all cursor-pointer'
                    : 'p-4 hover:border-gray-600 transition-all cursor-pointer flex items-center justify-between'
                }
                onClick={() => openEditModal(tag)}
              >
                {viewMode === 'grid' ? (
                  <div className="text-center">
                    <div
                      className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.usage_count}
                    </div>
                    <div className="font-medium text-white text-sm truncate" title={tag.name}>
                      {tag.display_name || tag.name}
                    </div>
                    <div className="text-xs text-gray-400 capitalize mt-1">
                      {tag.category}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.usage_count}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {tag.display_name || tag.name}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="capitalize">{tag.category}</span>
                          {tag.description && (
                            <>
                              <span>·</span>
                              <span className="truncate">{tag.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <IconButton
                      icon="🗑️"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag.id, tag.name);
                      }}
                      tooltip="Delete tag"
                    />
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Tag Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Tag"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={!newTag.name.trim()}
            >
              Create Tag
            </Button>
          </>
        }
      >
        <TagForm tag={newTag} onChange={setNewTag} />
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTag(null);
        }}
        title="Edit Tag"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTag} disabled={!newTag.name.trim()}>
              Update Tag
            </Button>
          </>
        }
      >
        <TagForm tag={newTag} onChange={setNewTag} />
      </Modal>
    </DashboardLayout>
  );
}

function TagForm({
  tag,
  onChange,
}: {
  tag: {
    name: string;
    displayName: string;
    category: string;
    color: string;
    description: string;
  };
  onChange: (tag: any) => void;
}) {
  const categories = Object.entries(TAG_CATEGORIES);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tag Name * (normalized)
        </label>
        <input
          type="text"
          value={tag.name}
          onChange={(e) => onChange({ ...tag, name: e.target.value })}
          placeholder="my-tag-name"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Lowercase, hyphens only (auto-normalized)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Display Name (optional)
        </label>
        <input
          type="text"
          value={tag.displayName}
          onChange={(e) => onChange({ ...tag, displayName: e.target.value })}
          placeholder="My Tag Name"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <Select
            value={tag.category}
            onChange={(value) => {
              const categoryColor = TAG_CATEGORIES[value as keyof typeof TAG_CATEGORIES]?.color || '#6366f1';
              onChange({ ...tag, category: value, color: categoryColor });
            }}
            options={categories.map(([key, val]) => ({
              value: key,
              label: val.label,
            }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={tag.color}
              onChange={(e) => onChange({ ...tag, color: e.target.value })}
              className="w-12 h-10 rounded border border-gray-700 bg-gray-800 cursor-pointer"
            />
            <input
              type="text"
              value={tag.color}
              onChange={(e) => onChange({ ...tag, color: e.target.value })}
              placeholder="#6366f1"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description (optional)
        </label>
        <textarea
          value={tag.description}
          onChange={(e) => onChange({ ...tag, description: e.target.value })}
          placeholder="What is this tag for?"
          rows={3}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}
