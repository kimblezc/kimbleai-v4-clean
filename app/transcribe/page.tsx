'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface DriveFile {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  isFolder?: boolean;
}

interface TranscriptionJob {
  jobId: string;
  fileId: string;
  fileName: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

export default function TranscribePage() {
  const { data: session } = useSession();
  const [currentPath, setCurrentPath] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
  const [items, setItems] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Map<string, TranscriptionJob>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [folderIdInput, setFolderIdInput] = useState('');
  const [dailyUsage, setDailyUsage] = useState<{ hours: number; cost: number } | null>(null);

  // Load items from folder
  const loadFolder = async (folderId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const id = folderId || 'root';
      const url = `/api/google/drive?action=list&userId=zach${id !== 'root' ? `&folderId=${id}` : ''}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        if (data.needsAuth) {
          setError('Not authenticated with Google. Please sign in to access Drive.');
        } else {
          setError(data.error);
        }
        setItems([]);
        return;
      }

      const allItems = data.files || [];
      setItems(allItems);

    } catch (err: any) {
      setError(err.message || 'Failed to load Drive files');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate into folder
  const openFolder = (folder: DriveFile) => {
    setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
    loadFolder(folder.id);
  };

  // Navigate back
  const goBack = () => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      const parentId = newPath[newPath.length - 1].id;
      loadFolder(parentId === 'root' ? undefined : parentId);
    }
  };

  // Go to folder by ID
  const goToFolderId = () => {
    if (!folderIdInput.trim()) return;
    setCurrentPath([...currentPath, { id: folderIdInput, name: 'Custom Folder' }]);
    loadFolder(folderIdInput);
    setFolderIdInput('');
  };

  const getShareableUrl = (fileId: string): string => {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  };

  const startTranscription = async (file: DriveFile) => {
    const newJob: TranscriptionJob = {
      jobId: `job_${Date.now()}`,
      fileId: file.id,
      fileName: file.name,
      status: 'queued',
      progress: 0,
    };

    setJobs(new Map(jobs.set(file.id, newJob)));
    setError(null);

    try {
      const audioUrl = getShareableUrl(file.id);

      const response = await fetch('/api/transcribe/assemblyai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          userId: 'zach',
          projectId: 'general',
          filename: file.name,
          fileSize: file.size,
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      newJob.jobId = data.jobId || newJob.jobId;
      newJob.status = 'processing';
      setJobs(new Map(jobs.set(file.id, newJob)));
      pollJobStatus(file.id, data.jobId || newJob.jobId);

    } catch (err: any) {
      newJob.status = 'error';
      newJob.error = err.message;
      setJobs(new Map(jobs.set(file.id, newJob)));
      setError(err.message);
    }
  };

  const pollJobStatus = async (fileId: string, jobId: string) => {
    const maxAttempts = 120;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/transcribe/status?jobId=${jobId}`);
        const data = await response.json();

        const job = jobs.get(fileId);
        if (!job) return;

        job.status = data.status;
        job.progress = data.progress || 0;
        job.result = data.result;
        job.error = data.error;

        setJobs(new Map(jobs.set(fileId, job)));

        if (data.status === 'completed' || data.status === 'error') {
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  };

  // Load daily usage stats
  const loadDailyUsage = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/audio/transcribe?userId=zach&date=${today}`);
      const data = await response.json();

      if (data.transcriptions) {
        const totalSeconds = data.transcriptions.reduce((sum: number, t: any) => sum + (t.duration || 0), 0);
        const hours = totalSeconds / 3600;
        const cost = hours * 0.41;
        setDailyUsage({ hours, cost });
      }
    } catch (err) {
      console.error('Failed to load usage:', err);
    }
  };

  useEffect(() => {
    if (session) {
      loadFolder();
      loadDailyUsage();
    }
  }, [session]);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f0f', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Please sign in to access transcription</h2>
          <button
            onClick={() => window.location.href = '/api/auth/signin'}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#4a9eff', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const audioFiles = items.filter(item =>
    !item.isFolder && (
      item.mimeType?.includes('audio/') ||
      item.name.toLowerCase().endsWith('.m4a') ||
      item.name.toLowerCase().endsWith('.mp3') ||
      item.name.toLowerCase().endsWith('.wav')
    )
  );

  const folders = items.filter(item => item.isFolder);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Audio Transcription from Drive</h1>
          <p style={{ color: '#9ca3af' }}>Browse Google Drive and transcribe audio files with speaker diarization</p>
        </div>

        {/* Info */}
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <div style={{ color: '#60a5fa', fontWeight: '500' }}>✓ Multi-GB files</div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>No size limit</div>
            </div>
            <div>
              <div style={{ color: '#60a5fa', fontWeight: '500' }}>✓ Speaker diarization</div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>Who said what</div>
            </div>
            <div>
              <div style={{ color: '#60a5fa', fontWeight: '500' }}>✓ Auto-integrated</div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>Searchable knowledge base</div>
            </div>
            <div>
              <div style={{ color: '#60a5fa', fontWeight: '500' }}>
                {dailyUsage ? `Used: ${dailyUsage.hours.toFixed(1)}h / 50h` : '✓ $0.41/hour'}
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {dailyUsage ? `$${dailyUsage.cost.toFixed(2)} / $25 daily` : 'Budget enforced'}
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {currentPath.length > 1 && (
            <button
              onClick={goBack}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                color: '#fff',
                cursor: 'pointer',
                marginRight: '0.5rem'
              }}
            >
              ← Back
            </button>
          )}
          <div style={{ color: '#9ca3af' }}>
            {currentPath.map((path, idx) => (
              <span key={path.id}>
                {idx > 0 && ' / '}
                <span style={{ color: idx === currentPath.length - 1 ? '#fff' : '#9ca3af' }}>
                  {path.name}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Jump to Folder ID */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
            💡 To jump to a folder: Open it in Drive, copy the ID from the URL (after <code style={{ backgroundColor: '#1f2937', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>/folders/</code>)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Paste Google Drive folder ID (e.g., 1abc...xyz)"
              value={folderIdInput}
              onChange={(e) => setFolderIdInput(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
            <button
              onClick={goToFolderId}
              disabled={!folderIdInput.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: folderIdInput.trim() ? '#4a9eff' : '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#fff',
                cursor: folderIdInput.trim() ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem'
              }}
            >
              Go to Folder
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
            <p style={{ color: '#f87171', marginBottom: error.includes('authenticated') ? '1rem' : '0' }}>❌ {error}</p>
            {error.includes('authenticated') && (
              <button
                onClick={() => window.location.href = '/api/auth/signin?callbackUrl=/transcribe'}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#4a9eff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Sign in with Google
              </button>
            )}
          </div>
        )}

        {/* Folders */}
        {folders.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>📁 Folders ({folders.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => openFolder(folder)}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(17, 24, 39, 0.5)',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4a9eff'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{folder.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio Files */}
        <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.5)', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>🎵 Audio Files ({audioFiles.length})</h3>
            <button
              onClick={() => loadFolder(currentPath[currentPath.length - 1].id === 'root' ? undefined : currentPath[currentPath.length - 1].id)}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#9ca3af' }}>Loading from Google Drive...</p>
          ) : audioFiles.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No audio files in this folder. Try browsing other folders or use the folder ID input above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {audioFiles.map((file) => {
                const job = jobs.get(file.id);
                const isProcessing = job && (job.status === 'queued' || job.status === 'processing');
                const isCompleted = job && job.status === 'completed';
                const isError = job && job.status === 'error';

                return (
                  <div
                    key={file.id}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      border: `1px solid ${isCompleted ? '#10b981' : isError ? '#ef4444' : '#374151'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>🎵</span>
                          <div>
                            <h4 style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{file.name}</h4>
                            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                              {file.sizeFormatted} • {new Date(file.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {job && (
                          <div style={{ marginLeft: '2.75rem', marginTop: '0.5rem' }}>
                            {isProcessing && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ width: '12rem', backgroundColor: '#374151', borderRadius: '9999px', height: '0.5rem' }}>
                                    <div
                                      style={{
                                        backgroundColor: '#3b82f6',
                                        height: '0.5rem',
                                        borderRadius: '9999px',
                                        transition: 'width 0.3s',
                                        width: `${job.progress}%`
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{job.progress}%</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                                  ⏳ {job.status === 'queued' ? 'Queued...' : 'Transcribing...'}
                                </p>
                              </div>
                            )}
                            {isCompleted && (
                              <div style={{ fontSize: '0.875rem', color: '#34d399' }}>
                                ✅ Complete • Added to knowledge base
                              </div>
                            )}
                            {isError && (
                              <div style={{ fontSize: '0.875rem', color: '#f87171' }}>
                                ❌ {job.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#60a5fa', fontSize: '0.875rem', textDecoration: 'none' }}
                        >
                          View
                        </a>
                        <button
                          onClick={() => startTranscription(file)}
                          disabled={isProcessing}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: isProcessing ? '#374151' : '#10b981',
                            border: 'none',
                            borderRadius: '0.375rem',
                            color: '#fff',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          {isProcessing ? '⏳ Processing...' : isCompleted ? '🔄 Re-transcribe' : '🎤 Transcribe'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
