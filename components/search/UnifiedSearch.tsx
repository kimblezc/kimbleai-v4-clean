'use client';

import { useState } from 'react';
import { Search, Mail, FileText, HardDrive, BookOpen, Calendar, ExternalLink, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  source: 'gmail' | 'drive' | 'local' | 'knowledge_base' | 'calendar';
  type: 'email' | 'file' | 'document' | 'attachment' | 'knowledge' | 'event';
  title: string;
  content: string;
  snippet: string;
  url?: string;
  metadata: any;
  relevanceScore: number;
  timestamp?: string;
}

interface SearchResponse {
  success: boolean;
  query: string;
  sources: string[];
  totalResults: number;
  results: SearchResult[];
  breakdown: {
    gmail: number;
    drive: number;
    local: number;
    knowledge_base: number;
    calendar?: number;
  };
}

export default function UnifiedSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>(['gmail', 'drive', 'local', 'kb']);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const sourcesParam = selectedSources.join(',');
      const response = await fetch(
        `/api/search/unified?q=${encodeURIComponent(query)}&sources=${sourcesParam}&limit=10`
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gmail':
        return <Mail className="w-4 h-4" />;
      case 'drive':
        return <HardDrive className="w-4 h-4" />;
      case 'local':
        return <FileText className="w-4 h-4" />;
      case 'knowledge_base':
        return <BookOpen className="w-4 h-4" />;
      case 'calendar':
        return <Calendar className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'gmail':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'drive':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'local':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'knowledge_base':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'calendar':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-4">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Unified Search</h1>
        <p className="text-gray-600 mb-6">
          Search across Gmail, Drive, local files, and knowledge base
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anything... (e.g., DND, meeting notes, project files)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {/* Source Filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 py-2">Search in:</span>

            <button
              type="button"
              onClick={() => toggleSource('gmail')}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                selectedSources.includes('gmail')
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-1" />
              Gmail
            </button>

            <button
              type="button"
              onClick={() => toggleSource('drive')}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                selectedSources.includes('drive')
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <HardDrive className="w-4 h-4 inline mr-1" />
              Drive
            </button>

            <button
              type="button"
              onClick={() => toggleSource('local')}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                selectedSources.includes('local')
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Local Files
            </button>

            <button
              type="button"
              onClick={() => toggleSource('kb')}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                selectedSources.includes('kb')
                  ? 'bg-purple-100 text-purple-700 border-purple-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1" />
              Knowledge Base
            </button>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Results Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Found {results.totalResults} results for "{results.query}"
              </h2>
              <div className="flex gap-2 text-sm">
                {results.breakdown.gmail > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md">
                    {results.breakdown.gmail} emails
                  </span>
                )}
                {results.breakdown.drive > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                    {results.breakdown.drive} drive
                  </span>
                )}
                {results.breakdown.local > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">
                    {results.breakdown.local} local
                  </span>
                )}
                {results.breakdown.knowledge_base > 0 && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
                    {results.breakdown.knowledge_base} knowledge
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Results List */}
          {results.results.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No results found for "{results.query}"</p>
              <p className="text-sm text-gray-500 mt-2">Try a different search term or source</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.results.map((result, idx) => (
                <div
                  key={`${result.source}-${result.id}-${idx}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Source Icon */}
                    <div className={`p-2 rounded-md border ${getSourceColor(result.source)}`}>
                      {getSourceIcon(result.source)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title & Source */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {result.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(result.timestamp)}
                          </span>
                          {result.url && (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Snippet */}
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {result.snippet}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded-md border ${getSourceColor(result.source)}`}>
                          {result.source === 'knowledge_base' ? 'Knowledge' : result.source}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{result.type}</span>
                        <span className="text-gray-400">•</span>
                        <span>Relevance: {Math.round(result.relevanceScore * 100)}%</span>

                        {/* Gmail Metadata */}
                        {result.source === 'gmail' && result.metadata?.from && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>From: {result.metadata.from.split('<')[0].trim()}</span>
                          </>
                        )}

                        {/* Drive Metadata */}
                        {result.source === 'drive' && result.metadata?.mimeType && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{result.metadata.mimeType.split('/')[1]}</span>
                          </>
                        )}

                        {/* Local File Metadata */}
                        {result.source === 'local' && result.metadata?.fileType && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{result.metadata.fileType}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!results && !isSearching && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Search across all your content
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Find emails, files, documents, and knowledge from Gmail, Drive, local uploads, and your knowledge base all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center text-sm text-gray-500">
            <span>Try searching for:</span>
            <button
              onClick={() => {
                setQuery('DND');
                setTimeout(() => handleSearch(), 100);
              }}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              DND
            </button>
            <button
              onClick={() => {
                setQuery('project');
                setTimeout(() => handleSearch(), 100);
              }}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              project
            </button>
            <button
              onClick={() => {
                setQuery('meeting');
                setTimeout(() => handleSearch(), 100);
              }}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              meeting
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
