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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/code/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRepoName,
          private: newRepoPrivate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setNewRepoName('');
        setNewRepoPrivate(false);
        await loadRepositories();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating repository:', error);
      alert('Error creating repository');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ borderBottom: '1px solid #333' }}>
      {/* Current Repo Button */}
      <button
        onClick={() => setShowRepos(!showRepos)}
        style={{
          width: '100%',
          padding: '10px 12px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '12px' }}>📦</span>
          {selectedRepo ? (
            <span style={{ fontSize: '12px', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRepo}</span>
          ) : (
            <span style={{ fontSize: '12px', color: '#888' }}>Select Repository</span>
          )}
        </div>
        <svg
          style={{
            width: '12px',
            height: '12px',
            transition: 'transform 0.2s',
            transform: showRepos ? 'rotate(180deg)' : 'rotate(0deg)',
            color: '#888'
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Repository List Dropdown */}
      {showRepos && (
        <div style={{
          backgroundColor: '#1a1a1a',
          borderTop: '1px solid #333'
        }}>
          <div style={{
            maxHeight: '256px',
            overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#888'
              }}>
                Loading repositories...
              </div>
            ) : repos.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#888'
              }}>
                No repositories found
              </div>
            ) : (
              repos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => handleRepoSelect(repo)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    backgroundColor: selectedRepo === repo.full_name ? '#2a2a2a' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #333',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedRepo === repo.full_name ? '#2a2a2a' : 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px' }}>
                      {repo.private ? '🔒' : '📂'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {repo.name}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#888',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {repo.full_name}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create New Repository Button */}
          <button
            onClick={() => {
              setShowRepos(false);
              setShowCreateModal(true);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#0a0a0a',
              border: 'none',
              borderTop: '1px solid #4a9eff',
              color: '#4a9eff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e40af'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
          >
            + Create New Repository
          </button>
        </div>
      )}

      {/* Create Repository Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#171717',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#ffffff'
            }}>
              Create New Repository
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: '#888',
                marginBottom: '8px'
              }}>
                Repository Name
              </label>
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="my-awesome-project"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRepo()}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#888'
              }}>
                <input
                  type="checkbox"
                  checked={newRepoPrivate}
                  onChange={(e) => setNewRepoPrivate(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Private Repository
              </label>
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRepoName('');
                  setNewRepoPrivate(false);
                }}
                disabled={creating}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#888',
                  fontSize: '12px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !creating && (e.currentTarget.style.backgroundColor = '#2a2a2a')}
                onMouseLeave={(e) => !creating && (e.currentTarget.style.backgroundColor = '#0a0a0a')}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRepo}
                disabled={creating || !newRepoName.trim()}
                style={{
                  padding: '10px 16px',
                  backgroundColor: creating || !newRepoName.trim() ? '#0a0a0a' : '#1e40af',
                  border: creating || !newRepoName.trim() ? '1px solid #333' : '1px solid #2563eb',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: creating || !newRepoName.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!creating && newRepoName.trim()) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creating && newRepoName.trim()) {
                    e.currentTarget.style.backgroundColor = '#1e40af';
                  }
                }}
              >
                {creating ? 'Creating...' : 'Create Repository'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
