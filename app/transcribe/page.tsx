'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';

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
  cost?: string;
  result?: any;
  error?: string;
}

export default function TranscribePage() {
  const { data: session } = useSession();
  const [audioFiles, setAudioFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Map<string, TranscriptionJob>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Load audio files from Google Drive
  const loadAudioFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google/drive?action=search&q=mimeType contains \'audio/\'');
      const data = await response.json();

      if (data.files) {
        const audioFiles = data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          size: parseInt(file.size || '0'),
          sizeFormatted: formatFileSize(parseInt(file.size || '0')),
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
        }));
        setAudioFiles(audioFiles);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create shareable download URL for Drive file
  const getShareableUrl = (fileId: string): string => {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  };

  // Start transcription
  const startTranscription = async (file: DriveFile) => {
    const jobId = `job_${Date.now()}`;

    // Add to jobs map
    const newJob: TranscriptionJob = {
      jobId,
      fileId: file.id,
      fileName: file.name,
      status: 'queued',
      progress: 0,
    };

    setJobs(new Map(jobs.set(file.id, newJob)));
    setError(null);

    try {
      // Get shareable URL
      const audioUrl = getShareableUrl(file.id);

      // Estimate cost
      const fileSizeMB = file.size / (1024 * 1024);
      const estimatedHours = fileSizeMB / 30; // ~30MB per hour
      const estimatedCost = estimatedHours * 0.41;

      console.log(`Starting transcription: ${file.name}, ${fileSizeMB.toFixed(2)}MB, ~${estimatedHours.toFixed(2)}h, ~$${estimatedCost.toFixed(2)}`);

      // Submit to AssemblyAI
      const response = await fetch('/api/transcribe/assemblyai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioUrl,
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

      // Update job with AssemblyAI job ID
      newJob.jobId = data.jobId || jobId;
      newJob.status = 'processing';
      setJobs(new Map(jobs.set(file.id, newJob)));

      // Start polling for status
      pollJobStatus(file.id, data.jobId || jobId);

    } catch (err: any) {
      newJob.status = 'error';
      newJob.error = err.message;
      setJobs(new Map(jobs.set(file.id, newJob)));
      setError(err.message);
    }
  };

  // Poll job status
  const pollJobStatus = async (fileId: string, jobId: string) => {
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
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

        if (data.status === 'completed') {
          console.log(`Transcription completed: ${job.fileName}`);
          return;
        } else if (data.status === 'error') {
          console.error(`Transcription failed: ${data.error}`);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          job.status = 'error';
          job.error = 'Timeout - transcription took too long';
          setJobs(new Map(jobs.set(fileId, job)));
        }
      } catch (error) {
        console.error('Poll error:', error);
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
      loadAudioFiles();
    }
  }, [session]);

  if (!session) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl text-white">Please sign in to access transcription</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Audio Transcription from Drive</h1>
            <p className="text-gray-400">
              Transcribe audio files from Google Drive with speaker diarization
            </p>
          </div>
          <Button onClick={loadAudioFiles} variant="secondary" disabled={loading}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-300 font-medium">✓ Multi-GB files supported</span>
              <p className="text-gray-400 text-xs mt-1">No file size limit</p>
            </div>
            <div>
              <span className="text-blue-300 font-medium">✓ Speaker diarization</span>
              <p className="text-gray-400 text-xs mt-1">Identifies who said what</p>
            </div>
            <div>
              <span className="text-blue-300 font-medium">✓ Auto-integrated</span>
              <p className="text-gray-400 text-xs mt-1">Searchable in knowledge base</p>
            </div>
            <div>
              <span className="text-blue-300 font-medium">✓ Cost: $0.41/hour</span>
              <p className="text-gray-400 text-xs mt-1">Budget enforced automatically</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Files List */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            🎵 Audio Files in Google Drive ({audioFiles.length})
          </h3>

          {loading ? (
            <p className="text-gray-400">Loading from Google Drive...</p>
          ) : audioFiles.length === 0 ? (
            <p className="text-gray-400">No audio files found in your Google Drive</p>
          ) : (
            <div className="space-y-3">
              {audioFiles.map((file) => {
                const job = jobs.get(file.id);
                const isProcessing = job && (job.status === 'queued' || job.status === 'processing');
                const isCompleted = job && job.status === 'completed';
                const isError = job && job.status === 'error';

                return (
                  <div
                    key={file.id}
                    className={`bg-black/40 rounded-lg p-4 border ${
                      isCompleted ? 'border-green-700' : isError ? 'border-red-700' : 'border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      {/* File Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">🎵</span>
                          <div>
                            <h4 className="text-white font-medium">{file.name}</h4>
                            <p className="text-sm text-gray-400">
                              {file.sizeFormatted} • {new Date(file.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Job Status */}
                        {job && (
                          <div className="ml-11 mt-2">
                            {isProcessing && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-48 bg-gray-700 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full transition-all"
                                      style={{ width: `${job.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-400">{job.progress}%</span>
                                </div>
                                <p className="text-xs text-blue-400">⏳ {job.status === 'queued' ? 'Queued...' : 'Transcribing...'}</p>
                              </div>
                            )}
                            {isCompleted && (
                              <div className="text-sm text-green-400">
                                ✅ Transcription complete • Auto-added to knowledge base
                              </div>
                            )}
                            {isError && (
                              <div className="text-sm text-red-400">
                                ❌ Error: {job.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View
                        </a>
                        <Button
                          onClick={() => startTranscription(file)}
                          disabled={isProcessing}
                          size="sm"
                        >
                          {isProcessing ? '⏳ Processing...' : isCompleted ? '🔄 Re-transcribe' : '🎤 Transcribe'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
