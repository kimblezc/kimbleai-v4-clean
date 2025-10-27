'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  created_by: string;
  category: string;
  tags: string[];
  shared_with: string[];
  is_pinned: boolean;
  priority: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'family_decisions', label: 'Family Decisions', icon: '👨‍👩‍👧', color: 'blue' },
  { value: 'travel_plans', label: 'Travel Plans', icon: '✈️', color: 'cyan' },
  { value: 'home_projects', label: 'Home Projects', icon: '🏠', color: 'green' },
  { value: 'financial', label: 'Financial', icon: '💰', color: 'yellow' },
  { value: 'goals', label: 'Goals', icon: '🎯', color: 'purple' },
  { value: 'memories', label: 'Memories', icon: '📸', color: 'pink' },
  { value: 'ideas', label: 'Ideas', icon: '💡', color: 'orange' },
  { value: 'shopping', label: 'Shopping', icon: '🛒', color: 'red' },
  { value: 'health', label: 'Health', icon: '❤️', color: 'rose' },
  { value: 'other', label: 'Other', icon: '📌', color: 'gray' },
];

export default function FamilyKnowledge() {
  const router = useRouter();
  const { data: session } = useSession();
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState<string[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>(['zach', 'rebecca']);
  const [isPinned, setIsPinned] = useState(false);
  const [priority, setPriority] = useState('normal');

  useEffect(() => {
    loadKnowledge();
  }, [selectedCategory, showPinnedOnly]);

  const loadKnowledge = async () => {
    try {
      setLoading(true);
      let url = '/api/family/knowledge?limit=100';
      if (selectedCategory) url += `&category=${selectedCategory}`;
      if (showPinnedOnly) url += '&is_pinned=true';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setKnowledge(data.knowledge || []);
        setCategoryCounts(data.categoryCounts || {});
      }
    } catch (error) {
      console.error('Failed to load knowledge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadKnowledge();
  };

  const handleCreate = async () => {
    if (!title || !content) {
      alert('Title and content are required');
      return;
    }

    try {
      const response = await fetch('/api/family/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          category,
          tags,
          sharedWith,
          isPinned,
          priority,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsCreating(false);
        setTitle('');
        setContent('');
        setTags([]);
        loadKnowledge();
      }
    } catch (error) {
      console.error('Failed to create knowledge:', error);
      alert('Failed to create knowledge entry');
    }
  };

  const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
    try {
      const response = await fetch('/api/family/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isPinned: !currentlyPinned,
        }),
      });

      if (response.ok) {
        loadKnowledge();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const getCategoryInfo = (categoryValue: string) => {
    return CATEGORIES.find((c) => c.value === categoryValue) || CATEGORIES[CATEGORIES.length - 1];
  };

  const getUserColor = (userId: string) => {
    if (userId === 'zach') return 'purple';
    if (userId === 'rebecca') return 'pink';
    return 'blue';
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Shared Knowledge Base</h1>
            <p className="text-gray-400">
              Notes, memories, decisions, and project spaces for the family
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              icon="🏠"
              variant="secondary"
              onClick={() => router.push('/family')}
            >
              Back to Dashboard
            </Button>
            <Button
              icon="➕"
              onClick={() => setIsCreating(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Add Knowledge
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search knowledge base..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button icon="🔍" onClick={handleSearch}>
              Search
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showPinnedOnly
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              📌 Pinned Only
            </button>
            <div className="text-gray-400">|</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {cat.icon} {cat.label} {categoryCounts[cat.value] ? `(${categoryCounts[cat.value]})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create Form */}
        {isCreating && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create Knowledge Entry</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter content..."
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">📌 Pin this entry</span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button icon="💾" onClick={handleCreate}>
                  Create Entry
                </Button>
                <Button variant="secondary" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : knowledge.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <span className="text-6xl mb-4 block">📚</span>
            <h3 className="text-xl font-semibold text-white mb-2">No knowledge entries yet</h3>
            <p className="text-gray-400 mb-4">
              Start building your family knowledge base by creating your first entry
            </p>
            <Button icon="➕" onClick={() => setIsCreating(true)}>
              Create First Entry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledge.map((entry) => {
              const catInfo = getCategoryInfo(entry.category);
              return (
                <div
                  key={entry.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{catInfo.icon}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          entry.created_by === 'zach'
                            ? 'bg-purple-900 text-purple-300'
                            : 'bg-pink-900 text-pink-300'
                        }`}
                      >
                        {entry.created_by}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePin(entry.id, entry.is_pinned)}
                      className={`text-xl transition-transform hover:scale-110 ${
                        entry.is_pinned ? '' : 'opacity-30'
                      }`}
                    >
                      📌
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{entry.title}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-3">{entry.content}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-gray-800 text-gray-300 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                    <span className={`font-medium ${
                      entry.priority === 'urgent' ? 'text-red-400' :
                      entry.priority === 'high' ? 'text-orange-400' :
                      'text-gray-500'
                    }`}>
                      {entry.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
