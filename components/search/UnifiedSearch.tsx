'use client';

import { useState } from 'react';
import { Search, Mail, FileText, HardDrive, BookOpen, Calendar, ExternalLink, Loader2, X } from 'lucide-react';

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

interface UnifiedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UnifiedSearch({ isOpen, onClose }: UnifiedSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>(['gmail', 'drive', 'local', 'kb']);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
        return 'bg-red-900 bg-opacity-20 text-red-400 border-red-700';
      case 'drive':
        return 'bg-blue-900 bg-opacity-20 text-blue-400 border-blue-700';
      case 'local':
        return 'bg-green-900 bg-opacity-20 text-green-400 border-green-700';
      case 'knowledge_base':
        return 'bg-purple-900 bg-opacity-20 text-purple-400 border-purple-700';
      case 'calendar':
        return 'bg-orange-900 bg-opacity-20 text-orange-400 border-orange-700';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-600';
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] mx-4 overflow-y-auto bg-[#0f0f0f] border border-[#333] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6 space-y-4">
          {/* Search Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Search Everything</h1>
            <p className="text-gray-400 text-sm">
              Search across Gmail, Drive, local files, and knowledge base
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anything... (e.g., DND, meeting notes, project files)"
                className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:border-[#2563eb] focus:outline-none text-base"
                autoFocus
              />
            </div>

            {/* Source Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-400 py-2">Search in:</span>

              <button
                type="button"
                onClick={() => toggleSource('gmail')}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                  selectedSources.includes('gmail')
                    ? 'bg-red-900 bg-opacity-30 text-red-400 border-red-700'
                    : 'bg-[#2a2a2a] text-gray-400 border-[#444] hover:bg-[#333]'
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
                    ? 'bg-blue-900 bg-opacity-30 text-blue-400 border-blue-700'
                    : 'bg-[#2a2a2a] text-gray-400 border-[#444] hover:bg-[#333]'
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
                    ? 'bg-green-900 bg-opacity-30 text-green-400 border-green-700'
                    : 'bg-[#2a2a2a] text-gray-400 border-[#444] hover:bg-[#333]'
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
                    ? 'bg-purple-900 bg-opacity-30 text-purple-400 border-purple-700'
                    : 'bg-[#2a2a2a] text-gray-400 border-[#444] hover:bg-[#333]'
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
              className="w-full bg-[#1a5490] text-white py-3 rounded-lg font-medium hover:bg-[#2563eb] disabled:bg-[#2a2a2a] disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

          {/* Error Message */}
          {error && (
            <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4 mt-6">
              {/* Results Summary */}
              <div className="bg-[#171717] rounded-lg border border-[#333] p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    Found {results.totalResults} results for "{results.query}"
                  </h2>
                  <div className="flex gap-2 text-sm flex-wrap">
                    {results.breakdown.gmail > 0 && (
                      <span className="px-2 py-1 bg-red-900 bg-opacity-30 text-red-400 border border-red-700 rounded-md">
                        {results.breakdown.gmail} emails
                      </span>
                    )}
                    {results.breakdown.drive > 0 && (
                      <span className="px-2 py-1 bg-blue-900 bg-opacity-30 text-blue-400 border border-blue-700 rounded-md">
                        {results.breakdown.drive} drive
                      </span>
                    )}
                    {results.breakdown.local > 0 && (
                      <span className="px-2 py-1 bg-green-900 bg-opacity-30 text-green-400 border border-green-700 rounded-md">
                        {results.breakdown.local} local
                      </span>
                    )}
                    {results.breakdown.knowledge_base > 0 && (
                      <span className="px-2 py-1 bg-purple-900 bg-opacity-30 text-purple-400 border border-purple-700 rounded-md">
                        {results.breakdown.knowledge_base} knowledge
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Results List */}
              {results.results.length === 0 ? (
                <div className="bg-[#171717] rounded-lg border border-[#333] p-8 text-center">
                  <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-300">No results found for "{results.query}"</p>
                  <p className="text-sm text-gray-500 mt-2">Try a different search term or source</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.results.map((result, idx) => (
                    <div
                      key={`${result.source}-${result.id}-${idx}`}
                      className="bg-[#171717] rounded-lg border border-[#333] p-4 hover:border-[#444] transition-all"
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
                          <h3 className="font-semibold text-white truncate">
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
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Snippet */}
                        <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                          {result.snippet}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md border ${getSourceColor(result.source)}`}>
                            {result.source === 'knowledge_base' ? 'Knowledge' : result.source}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span>{result.type}</span>
                          <span className="text-gray-600">•</span>
                          <span>Relevance: {Math.round(result.relevanceScore * 100)}%</span>

                          {/* Gmail Metadata */}
                          {result.source === 'gmail' && result.metadata?.from && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>From: {result.metadata.from.split('<')[0].trim()}</span>
                            </>
                          )}

                          {/* Drive Metadata */}
                          {result.source === 'drive' && result.metadata?.mimeType && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>{result.metadata.mimeType.split('/')[1]}</span>
                            </>
                          )}

                          {/* Local File Metadata */}
                          {result.source === 'local' && result.metadata?.fileType && (
                            <>
                              <span className="text-gray-600">•</span>
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
            <div className="bg-[#171717] rounded-lg border border-[#333] p-12 text-center mt-6">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Search across all your content
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Find emails, files, documents, and knowledge from Gmail, Drive, local uploads, and your knowledge base all in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center text-sm text-gray-400">
                <span>Try searching for:</span>
                <button
                  onClick={() => {
                    setQuery('DND');
                    setTimeout(() => handleSearch(), 100);
                  }}
                  className="px-2 py-1 bg-[#2a2a2a] border border-[#444] rounded hover:bg-[#333] transition-colors text-white"
                >
                  DND
                </button>
                <button
                  onClick={() => {
                    setQuery('project');
                    setTimeout(() => handleSearch(), 100);
                  }}
                  className="px-2 py-1 bg-[#2a2a2a] border border-[#444] rounded hover:bg-[#333] transition-colors text-white"
                >
                  project
                </button>
                <button
                  onClick={() => {
                    setQuery('meeting');
                    setTimeout(() => handleSearch(), 100);
                  }}
                  className="px-2 py-1 bg-[#2a2a2a] border border-[#444] rounded hover:bg-[#333] transition-colors text-white"
                >
                  meeting
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
