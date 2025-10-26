'use client';

/**
 * CHATGPT IMPORT & SEARCH PAGE
 *
 * Upload ChatGPT export files and search through your ChatGPT history
 * with full RAG semantic search.
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Upload, Search, Database, Loader2, CheckCircle, XCircle, Download, RefreshCw, ArrowRight } from 'lucide-react';

interface ImportStats {
  totalConversations: number;
  totalMessages: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
}

interface SearchResult {
  id: string;
  title: string;
  full_text?: string;
  content?: string;
  createDate: string;
  similarity: number;
  message_count?: number;
  conversation_title?: string;
}

export default function ChatGPTImportPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'stats' | 'transition'>('upload');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadToDrive, setUploadToDrive] = useState(true);
  const [generateEmbeddings, setGenerateEmbeddings] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'conversations' | 'chunks'>('conversations');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Stats state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Transition state
  const [transitioning, setTransitioning] = useState(false);
  const [transitionOptions, setTransitionOptions] = useState({
    autoCreateProjects: true,
    minMatchConfidence: 0.7,
    migrateToMainSystem: true,
    preserveChatGPTData: true,
    generateEmbeddings: false,
    analyzeSentiment: false,
    extractKeywords: true,
    groupByTopic: true,
    dryRun: false,
  });
  const [transitionResult, setTransitionResult] = useState<any>(null);

  // Load stats on mount
  useEffect(() => {
    if (session && activeTab === 'stats') {
      loadStats();
    }
  }, [session, activeTab]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/chatgpt/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress('Preparing upload...');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadToDrive', uploadToDrive.toString());
      formData.append('generateEmbeddings', generateEmbeddings.toString());

      const response = await fetch('/api/chatgpt/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadResult(data);
      setFile(null);
      setUploadProgress('');

    } catch (error: any) {
      setUploadResult({
        success: false,
        error: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch('/api/chatgpt/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          searchType,
          limit: 20
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setSearchResults(data.results);

    } catch (error: any) {
      console.error('Search failed:', error);
      alert(`Search failed: ${error.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleTransition = async () => {
    setTransitioning(true);
    setTransitionResult(null);

    try {
      const response = await fetch('/api/chatgpt/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transitionOptions)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transition failed');
      }

      setTransitionResult(data.data);

    } catch (error: any) {
      console.error('Transition failed:', error);
      setTransitionResult({
        success: false,
        error: error.message
      });
    } finally {
      setTransitioning(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to import ChatGPT conversations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ChatGPT Import & Search</h1>
          <p className="text-gray-600">
            Import your ChatGPT conversation history and search it with semantic RAG
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="inline-block w-5 h-5 mr-2" />
              Upload Export
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'search'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="inline-block w-5 h-5 mr-2" />
              Search History
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="inline-block w-5 h-5 mr-2" />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('transition')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'transition'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <RefreshCw className="inline-block w-5 h-5 mr-2" />
              Transition
            </button>
          </div>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-4">Upload ChatGPT Export</h2>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">How to export from ChatGPT:</h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
                <li>Go to ChatGPT Settings → Data Controls</li>
                <li>Click "Export data"</li>
                <li>Wait for the email with your export (can take a few minutes)</li>
                <li>Download and extract the ZIP file</li>
                <li>Upload the <code className="bg-blue-100 px-1 rounded">conversations.json</code> file here</li>
              </ol>
            </div>

            <div className="space-y-6">
              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select conversations.json file
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={uploadToDrive}
                    onChange={(e) => setUploadToDrive(e.target.checked)}
                    disabled={uploading}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Upload to Google Drive (backup)</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={generateEmbeddings}
                    onChange={(e) => setGenerateEmbeddings(e.target.checked)}
                    disabled={uploading}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Generate embeddings (enables semantic search)</span>
                </label>
              </div>

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{uploadProgress}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Import ChatGPT Export</span>
                  </>
                )}
              </button>

              {/* Upload result */}
              {uploadResult && (
                <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-start space-x-3">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {uploadResult.success ? 'Import Successful!' : 'Import Failed'}
                      </h3>
                      <p className={`text-sm mt-1 ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {uploadResult.message || uploadResult.error}
                      </p>
                      {uploadResult.stats && (
                        <div className="mt-2 text-sm text-green-800 space-y-1">
                          <div>Conversations: {uploadResult.stats.totalConversations}</div>
                          <div>Messages: {uploadResult.stats.totalMessages}</div>
                          <div>Date Range: {new Date(uploadResult.stats.dateRange.earliest).toLocaleDateString()} - {new Date(uploadResult.stats.dateRange.latest).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-4">Search Your ChatGPT History</h2>

            <form onSubmit={handleSearch} className="space-y-4 mb-8">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What do you want to find in your ChatGPT history?"
                  disabled={searching}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="conversations"
                    checked={searchType === 'conversations'}
                    onChange={(e) => setSearchType('conversations')}
                    disabled={searching}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Search conversations</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="chunks"
                    checked={searchType === 'chunks'}
                    onChange={(e) => setSearchType('chunks')}
                    disabled={searching}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Search chunks (more granular)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!searchQuery.trim() || searching}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">
                  Found {searchResults.length} results
                </h3>
                {searchResults.map((result) => (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{result.title || result.conversation_title}</h4>
                      <span className="text-sm text-blue-600 font-medium">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                      {result.full_text || result.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{new Date(result.createDate).toLocaleDateString()}</span>
                      {result.message_count && <span>{result.message_count} messages</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <div className="text-center py-8 text-gray-500">
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-6">Import Statistics</h2>

            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="text-3xl font-bold text-blue-900 mb-1">
                    {stats.total_conversations || 0}
                  </div>
                  <div className="text-sm text-blue-700">Total Conversations</div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="text-3xl font-bold text-green-900 mb-1">
                    {stats.total_messages || 0}
                  </div>
                  <div className="text-sm text-green-700">Total Messages</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="text-3xl font-bold text-purple-900 mb-1">
                    {stats.embedding_coverage_percent || 0}%
                  </div>
                  <div className="text-sm text-purple-700">Embedding Coverage</div>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <div className="text-3xl font-bold text-orange-900 mb-1">
                    {stats.total_chunks || 0}
                  </div>
                  <div className="text-sm text-orange-700">Searchable Chunks</div>
                </div>

                {stats.date_range_formatted && (
                  <div className="col-span-2 bg-gray-50 rounded-lg p-6">
                    <div className="text-sm text-gray-700 mb-2">Date Range</div>
                    <div className="text-lg font-medium text-gray-900">
                      {stats.date_range_formatted.earliest && new Date(stats.date_range_formatted.earliest).toLocaleDateString()}
                      {' → '}
                      {stats.date_range_formatted.latest && new Date(stats.date_range_formatted.latest).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No data imported yet. Upload your ChatGPT export to get started.
              </div>
            )}
          </div>
        )}

        {/* Transition Tab */}
        {activeTab === 'transition' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold mb-4">ChatGPT to KimbleAI Transition</h2>

            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                <ArrowRight className="w-5 h-5 mr-2" />
                Intelligent Project Matching & Migration
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                This comprehensive transition agent will analyze all your ChatGPT conversations and intelligently:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Match conversations to existing KimbleAI projects using multi-factor analysis</li>
                <li>Create new projects for unmatched conversations grouped by topic</li>
                <li>Migrate all conversations and messages to your main KimbleAI system</li>
                <li>Generate detailed transition reports with confidence scores</li>
              </ul>
            </div>

            <div className="space-y-6">
              {/* Configuration Options */}
              <div className="border border-gray-200 rounded-lg p-6 space-y-4">
                <h3 className="font-medium text-gray-900 mb-3">Transition Options</h3>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={transitionOptions.autoCreateProjects}
                    onChange={(e) => setTransitionOptions({...transitionOptions, autoCreateProjects: e.target.checked})}
                    disabled={transitioning}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Auto-create projects for unmatched conversations</span>
                    <p className="text-xs text-gray-500">Automatically group and create projects using GPT-4 topic analysis</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={transitionOptions.migrateToMainSystem}
                    onChange={(e) => setTransitionOptions({...transitionOptions, migrateToMainSystem: e.target.checked})}
                    disabled={transitioning}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Migrate to main conversation system</span>
                    <p className="text-xs text-gray-500">Move conversations from chatgpt_* tables to main conversations table</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={transitionOptions.preserveChatGPTData}
                    onChange={(e) => setTransitionOptions({...transitionOptions, preserveChatGPTData: e.target.checked})}
                    disabled={transitioning}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Preserve original ChatGPT data</span>
                    <p className="text-xs text-gray-500">Keep original chatgpt_* tables intact (recommended)</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={transitionOptions.extractKeywords}
                    onChange={(e) => setTransitionOptions({...transitionOptions, extractKeywords: e.target.checked})}
                    disabled={transitioning}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Extract keywords for better matching</span>
                    <p className="text-xs text-gray-500">Analyze conversation content to extract relevant keywords</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={transitionOptions.groupByTopic}
                    onChange={(e) => setTransitionOptions({...transitionOptions, groupByTopic: e.target.checked})}
                    disabled={transitioning}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Group conversations by topic (GPT-4)</span>
                    <p className="text-xs text-gray-500">Use AI to intelligently group related conversations</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={transitionOptions.generateEmbeddings}
                    onChange={(e) => setTransitionOptions({...transitionOptions, generateEmbeddings: e.target.checked})}
                    disabled={transitioning}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Generate embeddings for semantic search</span>
                    <p className="text-xs text-gray-500">Enable AI-powered semantic search (costs ~$0.05 per 100 conversations)</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={transitionOptions.dryRun}
                    onChange={(e) => setTransitionOptions({...transitionOptions, dryRun: e.target.checked})}
                    disabled={transitioning}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Dry run (test mode)</span>
                    <p className="text-xs text-gray-500">Preview results without making actual database changes</p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum match confidence: {Math.round(transitionOptions.minMatchConfidence * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={transitionOptions.minMatchConfidence * 100}
                    onChange={(e) => setTransitionOptions({...transitionOptions, minMatchConfidence: parseInt(e.target.value) / 100})}
                    disabled={transitioning}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher values require stronger matches (recommended: 70%)
                  </p>
                </div>
              </div>

              {/* Run Transition Button */}
              <button
                onClick={handleTransition}
                disabled={transitioning}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-lg"
              >
                {transitioning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Running Transition...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Start Comprehensive Transition</span>
                  </>
                )}
              </button>

              {/* Transition Results */}
              {transitionResult && (
                <div className={`p-6 rounded-lg ${transitionResult.success ? 'bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                  <div className="flex items-start space-x-3">
                    {transitionResult.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg mb-2 ${transitionResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {transitionResult.success ? 'Transition Completed Successfully!' : 'Transition Failed'}
                      </h3>

                      {transitionResult.success && transitionResult.stats && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-2xl font-bold text-blue-900">{transitionResult.stats.conversationsProcessed}</div>
                              <div className="text-xs text-gray-600">Conversations</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-2xl font-bold text-green-900">{transitionResult.stats.projectsMatched}</div>
                              <div className="text-xs text-gray-600">Matched</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-2xl font-bold text-purple-900">{transitionResult.stats.projectsCreated}</div>
                              <div className="text-xs text-gray-600">Created</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-2xl font-bold text-orange-900">{transitionResult.stats.conversationsMigrated}</div>
                              <div className="text-xs text-gray-600">Migrated</div>
                            </div>
                          </div>

                          {transitionResult.matches && transitionResult.matches.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-900 mb-2">Project Matches:</h4>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {transitionResult.matches.slice(0, 10).map((match: any, idx: number) => (
                                  <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-medium text-sm text-gray-900">{match.conversation.title}</span>
                                      <span className="text-xs font-semibold text-blue-600">
                                        {Math.round(match.confidence * 100)}%
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      → {match.project?.name || 'New Project'}
                                    </div>
                                    {match.reasons && match.reasons.length > 0 && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {match.reasons[0]}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {transitionResult.matches.length > 10 && (
                                  <div className="text-xs text-gray-500 text-center py-2">
                                    + {transitionResult.matches.length - 10} more matches...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-gray-600 mt-3">
                            Execution time: {transitionResult.executionTime || 0}ms
                          </div>
                        </div>
                      )}

                      {!transitionResult.success && (
                        <p className="text-sm text-red-800">{transitionResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
