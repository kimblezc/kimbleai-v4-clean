'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TimeZoneDisplay from '@/components/TimeZoneDisplay';

interface SessionLog {
  id: string;
  session_id: string;
  device_name: 'laptop' | 'pc' | 'other';
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  project_path: string;
  git_branch: string | null;
  git_commit_hash: string | null;
  title: string;
  summary: string | null;
  tags: string[];
  files_modified: string[];
  git_commits: any[];
  todos: any[];
  key_decisions: string[];
  next_steps: string[];
  blockers: string[];
  created_at: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'laptop' | 'pc'>('all');
  const [selectedSession, setSelectedSession] = useState<SessionLog | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const user = localStorage.getItem('kimbleai_current_user');
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadSessions(user);
  }, [deviceFilter]);

  const loadSessions = async (userId: string) => {
    try {
      setLoading(true);
      const url = `/api/sessions?userId=${userId}&device=${deviceFilter}&limit=100`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'In progress';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'laptop':
        return '💻';
      case 'pc':
        return '🖥️';
      default:
        return '📱';
    }
  };

  const getDeviceColor = (device: string) => {
    switch (device) {
      case 'laptop':
        return 'text-blue-400';
      case 'pc':
        return 'text-green-400';
      default:
        return 'text-purple-400';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: 'white',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            📋 Session Logs
          </h1>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1f1f1f',
              border: '1px solid #333',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ← Back to Main
          </button>
        </div>

        {/* Time Zone Display */}
        <TimeZoneDisplay />

        {/* Device Filter */}
        <div style={{
          marginTop: '1.5rem',
          display: 'flex',
          gap: '0.5rem'
        }}>
          {(['all', 'laptop', 'pc'] as const).map((device) => (
            <button
              key={device}
              onClick={() => setDeviceFilter(device)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: deviceFilter === device ? '#2563eb' : '#1f1f1f',
                border: '1px solid',
                borderColor: deviceFilter === device ? '#3b82f6' : '#333',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {device === 'all' ? '🌐 All' : `${getDeviceIcon(device)} ${device}`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: selectedSession ? '1fr 1fr' : '1fr',
        gap: '2rem'
      }}>
        {/* Sessions List */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              Loading sessions...
            </div>
          ) : error ? (
            <div style={{
              padding: '2rem',
              backgroundColor: '#1f1f1f',
              border: '1px solid #ef4444',
              borderRadius: '0.5rem',
              color: '#ef4444'
            }}>
              {error}
            </div>
          ) : sessions.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: '#1f1f1f',
              border: '1px solid #333',
              borderRadius: '0.5rem'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <div style={{ color: '#666', marginBottom: '0.5rem' }}>
                No sessions found
              </div>
              <div style={{ color: '#444', fontSize: '0.875rem' }}>
                Sessions will appear here as you work
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: selectedSession?.id === session.id ? '#1f2937' : '#1f1f1f',
                    border: '1px solid',
                    borderColor: selectedSession?.id === session.id ? '#3b82f6' : '#333',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSession?.id !== session.id) {
                      e.currentTarget.style.backgroundColor = '#252525';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSession?.id !== session.id) {
                      e.currentTarget.style.backgroundColor = '#1f1f1f';
                    }
                  }}
                >
                  {/* Session Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.75rem'
                  }}>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>
                          {getDeviceIcon(session.device_name)}
                        </span>
                        <span className={getDeviceColor(session.device_name)} style={{
                          fontWeight: 'bold',
                          textTransform: 'capitalize'
                        }}>
                          {session.device_name}
                        </span>
                      </div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.25rem'
                      }}>
                        {session.title}
                      </h3>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        {formatDate(session.started_at)}
                      </div>
                    </div>
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: session.ended_at ? '#1f2937' : '#065f46',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      color: session.ended_at ? '#9ca3af' : '#10b981'
                    }}>
                      {formatDuration(session.duration_minutes)}
                    </div>
                  </div>

                  {/* Summary */}
                  {session.summary && (
                    <p style={{
                      color: '#9ca3af',
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {session.summary}
                    </p>
                  )}

                  {/* Stats */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.75rem',
                    color: '#666'
                  }}>
                    {session.files_modified?.length > 0 && (
                      <span>📝 {session.files_modified.length} files</span>
                    )}
                    {session.git_commits?.length > 0 && (
                      <span>📌 {session.git_commits.length} commits</span>
                    )}
                    {session.todos?.length > 0 && (
                      <span>✓ {session.todos.length} todos</span>
                    )}
                  </div>

                  {/* Tags */}
                  {session.tags?.length > 0 && (
                    <div style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      {session.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '0.125rem 0.5rem',
                            backgroundColor: '#374151',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            color: '#9ca3af'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Detail Panel */}
        {selectedSession && (
          <div style={{
            position: 'sticky',
            top: '2rem',
            height: 'fit-content',
            maxHeight: 'calc(100vh - 4rem)',
            overflow: 'auto',
            backgroundColor: '#1f1f1f',
            border: '1px solid #333',
            borderRadius: '0.5rem',
            padding: '1.5rem'
          }}>
            {/* Detail Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #333'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {getDeviceIcon(selectedSession.device_name)}
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {selectedSession.title}
                  </h2>
                </div>
                <div style={{ color: '#666', fontSize: '0.875rem' }}>
                  {formatDate(selectedSession.started_at)}
                  {selectedSession.ended_at && ` - ${formatDate(selectedSession.ended_at)}`}
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '1.25rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            {selectedSession.summary && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Summary
                </h3>
                <p style={{ color: '#d1d5db', lineHeight: '1.6' }}>
                  {selectedSession.summary}
                </p>
              </div>
            )}

            {/* Git Info */}
            {(selectedSession.git_branch || selectedSession.git_commit_hash) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Git Context
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}>
                  {selectedSession.git_branch && (
                    <div>
                      <span style={{ color: '#666' }}>Branch:</span>{' '}
                      <span style={{ color: '#10b981' }}>{selectedSession.git_branch}</span>
                    </div>
                  )}
                  {selectedSession.git_commit_hash && (
                    <div>
                      <span style={{ color: '#666' }}>Commit:</span>{' '}
                      <span style={{ color: '#3b82f6' }}>{selectedSession.git_commit_hash}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Files Modified */}
            {selectedSession.files_modified?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Files Modified ({selectedSession.files_modified.length})
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  maxHeight: '200px',
                  overflow: 'auto',
                  padding: '0.5rem',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '0.25rem'
                }}>
                  {selectedSession.files_modified.map((file, idx) => (
                    <div key={idx} style={{ color: '#9ca3af' }}>
                      📝 {file}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Decisions */}
            {selectedSession.key_decisions?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Key Decisions
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {selectedSession.key_decisions.map((decision, idx) => (
                    <li key={idx} style={{
                      padding: '0.5rem',
                      backgroundColor: '#0a0a0a',
                      borderRadius: '0.25rem',
                      color: '#d1d5db',
                      fontSize: '0.875rem'
                    }}>
                      💡 {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {selectedSession.next_steps?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Next Steps
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {selectedSession.next_steps.map((step, idx) => (
                    <li key={idx} style={{
                      padding: '0.5rem',
                      backgroundColor: '#0a0a0a',
                      borderRadius: '0.25rem',
                      color: '#d1d5db',
                      fontSize: '0.875rem'
                    }}>
                      ▶️ {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Blockers */}
            {selectedSession.blockers?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#ef4444',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Blockers
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {selectedSession.blockers.map((blocker, idx) => (
                    <li key={idx} style={{
                      padding: '0.5rem',
                      backgroundColor: '#7f1d1d',
                      borderRadius: '0.25rem',
                      color: '#fca5a5',
                      fontSize: '0.875rem'
                    }}>
                      🚫 {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {selectedSession.tags?.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase'
                }}>
                  Tags
                </h3>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {selectedSession.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#374151',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        color: '#9ca3af'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
