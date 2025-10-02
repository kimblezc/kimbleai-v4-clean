'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface DriveFolder {
  id: string;
  name: string;
}

interface DriveFile {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
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
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [audioFiles, setAudioFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Map<string, TranscriptionJob>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Load folders
  const loadFolders = async () => {
    try {
      const response = await fetch('/api/google/drive?action=folders&userId=zach');
      const data = await response.json();
      if (data.folders) {
        setFolders(data.folders);
      }
    } catch (err: any) {
      console.error('Failed to load folders:', err);
    }
  };

  // Load audio files from folder or search all
  const loadAudioFiles = async (folderId?: string) => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/google/drive?action=search&userId=zach';

      if (folderId) {
        url = `/api/google/drive?action=list&userId=zach&folderId=${folderId}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      let files = data.files || [];

      // Filter for audio files only
      files = files.filter((f: any) =>
        f.mimeType && (
          f.mimeType.includes('audio/') ||
          f.name.toLowerCase().endsWith('.m4a') ||
          f.name.toLowerCase().endsWith('.mp3') ||
          f.name.toLowerCase().endsWith('.wav')
        )
      );

      const audioFiles = files.map((file: any) => ({
        id: file.id,
        name: file.name,
        size: parseInt(file.size || '0'),
        sizeFormatted: formatFileSize(parseInt(file.size || '0')),
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
      }));

      setAudioFiles(audioFiles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get shareable URL
  const getShareableUrl = (fileId: string): string => {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  };

  // Start transcription
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

  // Poll status
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

  useEffect(() => {
    if (session) {
      loadFolders();
      loadAudioFiles();
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#fff', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Audio Transcription from Drive</h1>
          <p style={{ color: '#9ca3af' }}>Transcribe audio files from Google Drive with speaker diarization</p>
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
              <div style={{ color: '#60a5fa', fontWeight: '500' }}>✓ $0.41/hour</div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>Budget enforced</div>
            </div>
          </div>
        </div>

        {/* Folder Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
            Select Folder (optional):
          </label>
          <select
            value={selectedFolder}
            onChange={(e) => {
              setSelectedFolder(e.target.value);
              loadAudioFiles(e.target.value || undefined);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#fff',
              fontSize: '0.875rem'
            }}
          >
            <option value="">All Audio Files</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
            <p style={{ color: '#f87171' }}>❌ {error}</p>
          </div>
        )}

        {/* Files List */}
        <div style={{ backgroundColor: 'rgba(17, 24, 39, 0.5)', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>🎵 Audio Files ({audioFiles.length})</h3>
            <button
              onClick={() => loadAudioFiles(selectedFolder || undefined)}
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
            <p style={{ color: '#9ca3af' }}>Loading files from Google Drive...</p>
          ) : audioFiles.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No audio files found. Try selecting a different folder.</p>
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
