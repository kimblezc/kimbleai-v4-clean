'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface GitHubPanelProps {
  onRepoSelect: (repo: string) => void;
  onFilesLoad: (files: any[]) => void;
}

export default function GitHubPanel({
  onRepoSelect,
  onFilesLoad,
}: GitHubPanelProps) {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRepos, setShowRepos] = useState(false);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/code/repos');
      const data = await response.json();

      if (data.success) {
        setRepos(data.repos);
      }
    } catch (error) {
      console.error('Error loading repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = async (repo: Repository) => {
    setSelectedRepo(repo.full_name);
    setShowRepos(false);
    onRepoSelect(repo.full_name);

    // Load file tree
    setLoading(true);
    try {
      const response = await fetch('/api/code/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repo.full_name,
          branch: repo.default_branch,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onFilesLoad(data.tree);
      }
    } catch (error) {
      console.error('Error loading file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-gray-700">
      {/* Current Repo Button */}
      <button
        onClick={() => setShowRepos(!showRepos)}
        className="w-full p-3 text-left hover:bg-gray-700 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="text-sm">📦</span>
          {selectedRepo ? (
            <span className="text-sm text-white truncate">{selectedRepo}</span>
          ) : (
            <span className="text-sm text-gray-400">Select Repository</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${
            showRepos ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Repository List Dropdown */}
      {showRepos && (
        <div className="max-h-64 overflow-y-auto bg-gray-700 border-t border-gray-700">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">
              Loading repositories...
            </div>
          ) : repos.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">
              No repositories found
            </div>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleRepoSelect(repo)}
                className={`w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 ${
                  selectedRepo === repo.full_name ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs">
                    {repo.private ? '🔒' : '📂'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {repo.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {repo.full_name}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
