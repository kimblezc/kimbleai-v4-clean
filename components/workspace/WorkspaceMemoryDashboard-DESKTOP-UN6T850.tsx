'use client';

import React, { useState, useEffect } from 'react';

interface MemoryStats {
  totalMemories: number;
  memoryTypes: Record<string, number>;
  storageUsed: string;
  compressionEfficiency: string;
  recentActivity: Array<{
    id: string;
    title: string;
    type: string;
    created: string;
    size: string;
  }>;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  type: string;
  created: string;
  tags: string[];
}

interface RAGResult {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
    type: string;
  }>;
  searchStats: {
    totalMemories: number;
    searchedMemories: number;
    relevantMemories: number;
  };
}

export default function WorkspaceMemoryDashboard() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // RAG query state
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragResult, setRAGResult] = useState<RAGResult | null>(null);

  // Document storage state
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docTags, setDocTags] = useState('');

  const userId = 'zach'; // TODO: Get from auth context

  useEffect(() => {
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const callWorkspaceAPI = async (action: string, params: any = {}) => {
    const response = await fetch('/api/google/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userId, ...params })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API call failed');
    }

    return await response.json();
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await callWorkspaceAPI('get_stats');
      if (result.success) {
        setStats(result.stats);
      }
    } catch (err: any) {
      setError(`Failed to load stats: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeSystem = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await callWorkspaceAPI('initialize');
      if (result.success) {
        setSuccess('Workspace memory system initialized successfully!');
        loadStats();
      }
    } catch (err: any) {
      setError(`Initialization failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSystem = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await callWorkspaceAPI('test_system');
      if (result.success) {
        setSuccess('System test passed! All components working correctly.');
      } else {
        setError('System test failed. Check configuration.');
      }
    } catch (err: any) {
      setError(`Test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const result = await callWorkspaceAPI('search', {
        query: searchQuery,
        limit: 10,
        threshold: 0.6
      });

      if (result.success) {
        setSearchResults(result.results);
        setSuccess(`Found ${result.totalResults} relevant memories`);
      }
    } catch (err: any) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performRAGQuery = async () => {
    if (!ragQuestion.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const result = await callWorkspaceAPI('rag_query', {
        question: ragQuestion,
        threshold: 0.6,
        maxTokens: 2000
      });

      if (result.success) {
        setRAGResult(result);
        setSuccess('Generated answer using your memory base');
      }
    } catch (err: any) {
      setError(`RAG query failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const storeDocument = async () => {
    if (!docTitle.trim() || !docContent.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await callWorkspaceAPI('store_document', {
        title: docTitle,
        content: docContent,
        type: 'knowledge',
        tags: docTags.split(',').map(t => t.trim()).filter(t => t)
      });

      if (result.success) {
        setSuccess(`Document stored with ${result.chunks} chunks for search`);
        setDocTitle('');
        setDocContent('');
        setDocTags('');
        loadStats();
      }
    } catch (err: any) {
      setError(`Failed to store document: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = "bg-white rounded-lg shadow-lg p-6 border border-gray-200";
  const buttonStyle = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors";
  const buttonSecondaryStyle = "px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors";
  const inputStyle = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  const textareaStyle = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-vertical";

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Google Workspace Memory System</h1>
        <p className="text-gray-600">Ultra-efficient persistent memory with RAG capabilities</p>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardStyle}>
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="space-y-3">
            <button
              onClick={initializeSystem}
              disabled={loading}
              className={`${buttonStyle} w-full`}
            >
              {loading ? 'Loading...' : 'Initialize System'}
            </button>
            <button
              onClick={testSystem}
              disabled={loading}
              className={`${buttonSecondaryStyle} w-full`}
            >
              {loading ? 'Loading...' : 'Test System'}
            </button>
            <button
              onClick={loadStats}
              disabled={loading}
              className={`${buttonSecondaryStyle} w-full`}
            >
              {loading ? 'Loading...' : 'Refresh Stats'}
            </button>
          </div>
        </div>

        <div className={cardStyle}>
          <h3 className="text-lg font-semibold mb-4">Memory Statistics</h3>
          {stats ? (
            <div className="space-y-2 text-sm">
              <div>Total Memories: <strong>{stats.totalMemories}</strong></div>
              <div>Storage Used: <strong>{stats.storageUsed}</strong></div>
              <div>Compression: <strong>{stats.compressionEfficiency}</strong></div>
              <div className="pt-2">
                <div className="text-xs font-medium mb-1">Memory Types:</div>
                {Object.entries(stats.memoryTypes).map(([type, count]) => (
                  <div key={type} className="text-xs">
                    {type}: {count}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Loading stats...</div>
          )}
        </div>

        <div className={cardStyle}>
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {stats?.recentActivity ? (
            <div className="space-y-2">
              {stats.recentActivity.slice(0, 5).map((item) => (
                <div key={item.id} className="text-xs border-b pb-1">
                  <div className="font-medium truncate">{item.title}</div>
                  <div className="text-gray-500">{item.type} • {item.size}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No recent activity</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'search', label: 'Search' },
              { id: 'rag', label: 'RAG Query' },
              { id: 'store', label: 'Store Document' },
              { id: 'upload', label: 'Upload File' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
          {activeTab === 'search' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vector Search</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search your memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  className={inputStyle}
                />
                <button onClick={performSearch} disabled={loading} className={buttonStyle}>
                  Search
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3 mt-6">
                  {searchResults.map((result) => (
                    <div key={result.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{result.title}</h4>
                        <span className="text-sm text-gray-500">
                          {(result.similarity * 100).toFixed(1)}% match
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{result.content}</p>
                      <div className="text-xs text-gray-400">
                        {result.type} • {new Date(result.created).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rag' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">RAG Question Answering</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about your memories..."
                  value={ragQuestion}
                  onChange={(e) => setRagQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performRAGQuery()}
                  className={inputStyle}
                />
                <button onClick={performRAGQuery} disabled={loading} className={buttonStyle}>
                  Ask
                </button>
              </div>

              {ragResult && (
                <div className="space-y-4 mt-6">
                  <div className="border rounded p-4 bg-blue-50">
                    <h4 className="font-medium mb-2">Answer:</h4>
                    <p className="whitespace-pre-wrap">{ragResult.answer}</p>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">Sources ({ragResult.sources.length}):</h5>
                    <div className="space-y-2">
                      {ragResult.sources.map((source) => (
                        <div key={source.id} className="text-sm border rounded p-2 bg-gray-50">
                          <div className="font-medium">{source.title}</div>
                          <div className="text-gray-600">{source.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Searched {ragResult.searchStats.totalMemories} memories,
                    found {ragResult.searchStats.relevantMemories} relevant sources
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'store' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Store Document</h3>
              <input
                type="text"
                placeholder="Document title..."
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className={inputStyle}
              />
              <textarea
                placeholder="Document content..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className={textareaStyle}
              />
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
                className={inputStyle}
              />
              <button onClick={storeDocument} disabled={loading} className={`${buttonStyle} w-full`}>
                Store Document
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">File Upload</h3>
              <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-4">File upload interface</p>
                <p className="text-sm text-gray-400 mb-4">
                  Supports: Text, PDF, Audio (Whisper), Images, Word docs
                </p>
                <a
                  href="/api/google/workspace/upload"
                  target="_blank"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Upload API
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}