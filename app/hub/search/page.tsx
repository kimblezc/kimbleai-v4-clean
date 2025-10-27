'use client';

/**
 * UNIVERSAL SEARCH PAGE
 *
 * Search across ALL platforms from one interface:
 * - KimbleAI conversations, files, knowledge
 * - ChatGPT imported conversations
 * - Claude Projects (when imported)
 * - Google Drive files
 * - Gmail messages
 * - Notion pages
 * - GitHub repos
 * - Slack messages
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Calendar,
  FileText,
  MessageSquare,
  Mail,
  Code,
  Database,
  Loader2,
  ExternalLink,
  Star,
  Clock,
  TrendingUp,
  X,
} from 'lucide-react';

interface SearchResult {
  id: string;
  platform: string;
  contentType: string;
  title: string;
  content: string;
  summary?: string;
  author?: string;
  createdDate: string;
  modifiedDate?: string;
  similarity: number;
  url?: string;
  tags?: string[];
  metadata?: any;
}

interface SearchFilters {
  platforms: string[];
  contentTypes: string[];
  startDate: string;
  endDate: string;
  minSimilarity: number;
}

export default function UniversalSearchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    platforms: [],
    contentTypes: [],
    startDate: '',
    endDate: '',
    minSimilarity: 0.7,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  const platforms = [
    { id: 'kimbleai', name: 'KimbleAI', color: 'purple' },
    { id: 'chatgpt', name: 'ChatGPT', color: 'teal' },
    { id: 'claude', name: 'Claude Projects', color: 'blue' },
    { id: 'google', name: 'Google Workspace', color: 'yellow' },
    { id: 'notion', name: 'Notion', color: 'gray' },
    { id: 'github', name: 'GitHub', color: 'slate' },
    { id: 'slack', name: 'Slack', color: 'purple' },
  ];

  const contentTypes = [
    { id: 'conversation', name: 'Conversations', icon: MessageSquare },
    { id: 'file', name: 'Files', icon: FileText },
    { id: 'email', name: 'Emails', icon: Mail },
    { id: 'code', name: 'Code', icon: Code },
    { id: 'note', name: 'Notes', icon: Database },
  ];

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      handleSearch(q);
    }
  }, [searchParams]);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setSearching(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/hub/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          platforms: filters.platforms.length > 0 ? filters.platforms : undefined,
          contentTypes: filters.contentTypes.length > 0 ? filters.contentTypes : undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          minSimilarity: filters.minSimilarity,
          limit: 50,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        setSearchTime(Date.now() - startTime);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setFilters((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((p) => p !== platformId)
        : [...prev.platforms, platformId],
    }));
  };

  const toggleContentType = (typeId: string) => {
    setFilters((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(typeId)
        ? prev.contentTypes.filter((t) => t !== typeId)
        : [...prev.contentTypes, typeId],
    }));
  };

  const clearFilters = () => {
    setFilters({
      platforms: [],
      contentTypes: [],
      startDate: '',
      endDate: '',
      minSimilarity: 0.7,
    });
  };

  const getPlatformColor = (platform: string) => {
    const p = platforms.find((pl) => pl.id === platform);
    return p?.color || 'gray';
  };

  const getContentIcon = (contentType: string) => {
    const type = contentTypes.find((t) => t.id === contentType);
    return type?.icon || FileText;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <p className="text-gray-400">Access Universal Search with your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => router.push('/hub')}
                className="text-gray-400 hover:text-white mb-2 text-sm"
              >
                ← Back to Hub
              </button>
              <h1 className="text-3xl font-bold text-white">Universal Search</h1>
              <p className="text-gray-400">Search across all your AI platforms</p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filters.platforms.length > 0 || filters.contentTypes.length > 0) && (
                <span className="px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-medium">
                  {filters.platforms.length + filters.contentTypes.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations, files, emails, code, and more..."
              disabled={searching}
              className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Search Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Platform Filters */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platforms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          filters.platforms.includes(platform.id)
                            ? `bg-${platform.color}-600 text-white`
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {platform.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Type Filters */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {contentTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => toggleContentType(type.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            filters.contentTypes.includes(type.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {type.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-400 self-center">to</span>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Similarity Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Similarity: {Math.round(filters.minSimilarity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minSimilarity * 100}
                    onChange={(e) =>
                      setFilters({ ...filters, minSimilarity: parseInt(e.target.value) / 100 })
                    }
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {searching && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

        {!searching && query && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-400">
              Found <span className="text-white font-medium">{results.length}</span> results
              {searchTime > 0 && (
                <span className="text-gray-500"> in {searchTime}ms</span>
              )}
            </p>

            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm">
                <TrendingUp className="w-4 h-4" />
                Relevance
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm">
                <Clock className="w-4 h-4" />
                Recent
              </button>
            </div>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result) => {
              const Icon = getContentIcon(result.contentType);
              return (
                <div
                  key={result.id}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-all cursor-pointer"
                  onClick={() => result.url && router.push(result.url)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${getPlatformColor(result.platform)}-900/50 rounded-lg`}>
                        <Icon className={`w-5 h-5 text-${getPlatformColor(result.platform)}-400`} />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{result.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 bg-${getPlatformColor(result.platform)}-900/50 text-${getPlatformColor(result.platform)}-300 rounded`}>
                            {result.platform}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(result.createdDate).toLocaleDateString()}
                          </span>
                          {result.author && (
                            <span className="text-xs text-gray-500">by {result.author}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-purple-400">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                      {result.url && (
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                    {result.summary || result.content}
                  </p>

                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {result.tags.slice(0, 5).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-700/50 text-gray-400 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search query or filters
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {!searching && !query && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-purple-500" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Search across all your platforms
            </h3>
            <p className="text-gray-400 mb-6">
              Find conversations, files, emails, code, and more in one place
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {platforms.slice(0, 4).map((platform) => (
                <div
                  key={platform.id}
                  className={`p-4 bg-${platform.color}-900/20 border border-${platform.color}-700/50 rounded-lg`}
                >
                  <p className={`text-sm text-${platform.color}-300`}>{platform.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
