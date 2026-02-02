/**
 * Transcriptions Archive Page
 *
 * Search, browse, and manage all transcriptions with AI-powered categorization
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

interface Transcription {
  id: string;
  name: string;
  createdAt: string;
  durationSeconds: number;
  category: 'professional' | 'dnd' | 'divorce' | 'other';
  categoryConfidence: number;
  suggestedProjectName: string;
  projectId?: string;
  projectName?: string;
  summary: string;
  topics: string[];
  tags: string[];
  isPrivate: boolean;
  confidence: number;
}

export default function TranscriptionsPage() {
  const { data: session, status } = useSession();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/api/auth/signin');
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTranscriptions();
    }
  }, [status, selectedCategory]);

  const fetchTranscriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/transcriptions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTranscriptions(data.transcriptions);
      }
    } catch (error) {
      console.error('Failed to fetch transcriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToProject = async (fileId: string, projectId: string) => {
    try {
      const response = await fetch('/api/transcriptions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, projectId }),
      });

      if (response.ok) {
        // Refresh transcriptions
        fetchTranscriptions();
      }
    } catch (error) {
      console.error('Failed to assign transcription:', error);
    }
  };

  const handleCreateProjectAndAssign = async (fileId: string, projectName: string) => {
    try {
      const response = await fetch('/api/transcriptions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          createNewProject: true,
          newProjectName: projectName,
        }),
      });

      if (response.ok) {
        fetchTranscriptions();
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const filteredTranscriptions = transcriptions.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'professional':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'dnd':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'divorce':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading transcriptions...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col lg:ml-72">
        {/* Header */}
        <header className="px-6 py-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Transcriptions Archive</h1>
              <p className="text-sm text-gray-400 mt-1">
                AI-powered categorization and search
              </p>
            </div>
            <div className="text-sm text-gray-400">
              {filteredTranscriptions.length} transcriptions
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mt-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transcriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="professional">Professional</option>
              <option value="dnd">D&D</option>
              <option value="divorce">Divorce</option>
              <option value="other">Other</option>
            </select>
          </div>
        </header>

        {/* Transcriptions Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {filteredTranscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <DocumentTextIcon className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                No transcriptions found
              </h2>
              <p className="text-gray-400">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Upload an audio file to create your first transcription'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => setSelectedTranscription(transcription)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(
                        transcription.category
                      )}`}
                    >
                      {transcription.category}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="font-medium text-white mb-2 truncate">
                    {transcription.name}
                  </h3>

                  {/* Summary */}
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {transcription.summary}
                  </p>

                  {/* Topics */}
                  {transcription.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {transcription.topics.slice(0, 3).map((topic, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Project Assignment */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    {transcription.projectId ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FolderIcon className="w-4 h-4" />
                        <span className="truncate">{transcription.projectName}</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateProjectAndAssign(
                            transcription.id,
                            transcription.suggestedProjectName
                          );
                        }}
                        className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                      >
                        File to {transcription.suggestedProjectName}
                      </button>
                    )}
                    <span className="text-xs text-gray-500">
                      {Math.round(transcription.durationSeconds / 60)}m
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {selectedTranscription && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTranscription(null)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedTranscription.name}
            </h2>

            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-400">Category:</span>
                <span
                  className={`ml-2 text-xs px-2 py-1 rounded-full ${getCategoryColor(
                    selectedTranscription.category
                  )}`}
                >
                  {selectedTranscription.category} (
                  {Math.round(selectedTranscription.categoryConfidence * 100)}% confidence)
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-400">Summary:</span>
                <p className="text-white mt-1">{selectedTranscription.summary}</p>
              </div>

              {selectedTranscription.topics.length > 0 && (
                <div>
                  <span className="text-sm text-gray-400">Topics:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTranscription.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedTranscription(null)}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
