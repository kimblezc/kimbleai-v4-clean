// components/MultiFileAudioUpload.tsx
// Minimalist multi-file audio transcription with batch processing

'use client';

import { useState, useRef } from 'react';

interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface FileJob {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'transcribing' | 'completed' | 'failed';
  progress: number;
  transcription?: string;
  utterances?: Utterance[];
  speakerCount?: number;
  error?: string;
  jobId?: string;
  service?: 'whisper' | 'assemblyai';
}

interface MultiFileAudioUploadProps {
  userId: string;
  projectId?: string;
  onComplete?: (results: FileJob[]) => void;
}

export default function MultiFileAudioUpload({
  userId,
  projectId = 'general',
  onComplete
}: MultiFileAudioUploadProps) {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const addFiles = async (files: File[]) => {
    const audioFiles = files.filter(f =>
      f.type.startsWith('audio/') ||
      f.name.endsWith('.m4a') ||
      f.name.endsWith('.mp3') ||
      f.name.endsWith('.wav')
    );

    if (audioFiles.length === 0) {
      alert('No valid audio files selected');
      return;
    }

    // Validate file sizes - AssemblyAI supports up to 5GB
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (AssemblyAI limit)
    const tooLargeFiles = audioFiles.filter(f => f.size > MAX_FILE_SIZE);

    if (tooLargeFiles.length > 0) {
      const fileList = tooLargeFiles.map(f =>
        `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`
      ).join('\n');
      alert(`❌ File too large. Maximum size: 5GB for transcription.\n\n${fileList}\n\nPlease split or compress these files.`);
      return;
    }

    const newJobs: FileJob[] = audioFiles.map(file => ({
      id: generateId(),
      file,
      status: 'pending',
      progress: 0
    }));

    setJobs(prev => [...prev, ...newJobs]);

    // Auto-start transcription immediately after adding files
    // Process new jobs after state update completes
    setTimeout(() => {
      setProcessing(true);
      processNewJobs(newJobs);
    }, 100);
  };

  const processNewJobs = async (newJobs: FileJob[]) => {
    for (const job of newJobs) {
      await processFile(job);
    }
    setProcessing(false);

    if (onComplete) {
      onComplete(jobs);
    }
  };

  const processAllFiles = async () => {
    setProcessing(true);

    for (const job of jobs) {
      if (job.status === 'completed' || job.status === 'failed') continue;

      await processFile(job);
    }

    setProcessing(false);

    if (onComplete) {
      onComplete(jobs);
    }
  };

  const processFile = async (job: FileJob) => {
    updateJob(job.id, { status: 'uploading', progress: 10 });

    try {
      const fileSizeMB = job.file.size / (1024 * 1024);

      const formData = new FormData();
      formData.append('audio', job.file);
      formData.append('userId', userId);
      formData.append('projectId', projectId);

      // Hybrid routing: <25MB → Whisper, 25MB-5GB → AssemblyAI
      const endpoint = fileSizeMB < 25
        ? '/api/audio/transcribe-progress'  // OpenAI Whisper: <25MB
        : '/api/transcribe/assemblyai';      // AssemblyAI: 25MB-5GB

      const service = fileSizeMB < 25 ? 'whisper' : 'assemblyai';

      updateJob(job.id, { status: 'uploading', progress: 30, service });

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const jobId = data.jobId;

      updateJob(job.id, {
        status: 'transcribing',
        progress: 50,
        jobId
      });

      // Poll for completion
      await pollForCompletion(job.id, jobId, endpoint);

    } catch (err: any) {
      updateJob(job.id, {
        status: 'failed',
        error: err.message,
        progress: 0
      });
    }
  };

  const pollForCompletion = async (
    fileJobId: string,
    transcriptionJobId: string,
    endpoint: string
  ) => {
    const maxAttempts = 200; // ~10 minutes with 3s intervals
    let attempts = 0;

    const poll = async (): Promise<void> => {
      if (attempts++ > maxAttempts) {
        updateJob(fileJobId, {
          status: 'failed',
          error: 'Timeout',
          progress: 0
        });
        return;
      }

      try {
        // Route status polling based on which service was used
        const statusEndpoint = endpoint.includes('whisper') || endpoint.includes('transcribe-progress')
          ? `/api/audio/transcribe-progress?jobId=${transcriptionJobId}`
          : `/api/transcribe/assemblyai?jobId=${transcriptionJobId}`;

        const response = await fetch(statusEndpoint);
        const data = await response.json();

        if (data.status === 'completed' && data.result) {
          // Extract speaker-labeled data if available (AssemblyAI)
          const utterances = data.result.utterances || [];
          const speakerCount = utterances.length > 0
            ? new Set(utterances.map((u: any) => u.speaker)).size
            : 0;

          updateJob(fileJobId, {
            status: 'completed',
            progress: 100,
            transcription: data.result.text,
            utterances: utterances,
            speakerCount: speakerCount
          });
          return;
        }

        if (data.status === 'failed') {
          updateJob(fileJobId, {
            status: 'failed',
            error: data.error || 'Transcription failed',
            progress: 0
          });
          return;
        }

        // Update progress
        updateJob(fileJobId, {
          progress: data.progress || 60
        });

        // Continue polling
        await new Promise(resolve => setTimeout(resolve, 3000));
        return poll();

      } catch (err) {
        // Continue polling on error
        await new Promise(resolve => setTimeout(resolve, 3000));
        return poll();
      }
    };

    return poll();
  };

  const updateJob = (id: string, updates: Partial<FileJob>) => {
    setJobs(prev => prev.map(j =>
      j.id === id ? { ...j, ...updates } : j
    ));
  };

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const clearCompleted = () => {
    setJobs(prev => prev.filter(j => j.status !== 'completed'));
  };

  const clearAll = () => {
    if (processing) {
      alert('Cannot clear while processing');
      return;
    }
    setJobs([]);
  };

  const downloadAllTranscriptions = () => {
    const completed = jobs.filter(j => j.status === 'completed' && j.transcription);

    if (completed.length === 0) {
      alert('No completed transcriptions to download');
      return;
    }

    const text = completed.map(j =>
      `=== ${j.file.name} ===\n\n${j.transcription}\n\n`
    ).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcriptions-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Individual file download functions
  const downloadPlainText = (job: FileJob) => {
    if (!job.transcription) return;

    const blob = new Blob([job.transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.file.name.replace(/\.[^/.]+$/, '')}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSpeakerJSON = (job: FileJob) => {
    if (!job.utterances || job.utterances.length === 0) return;

    const jsonData = {
      filename: job.file.name,
      speakerCount: job.speakerCount || 0,
      service: job.service || 'unknown',
      utterances: job.utterances.map(u => ({
        speaker: u.speaker,
        text: u.text,
        start: u.start,
        end: u.end,
        timestamp: formatTimestampForDownload(u.start)
      }))
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.file.name.replace(/\.[^/.]+$/, '')}-speakers.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSRT = (job: FileJob) => {
    if (!job.utterances || job.utterances.length === 0) return;

    const srtContent = job.utterances.map((utterance, idx) => {
      const startTime = formatSRTTimestamp(utterance.start);
      const endTime = formatSRTTimestamp(utterance.end);
      return `${idx + 1}\n${startTime} --> ${endTime}\nSpeaker ${utterance.speaker}: ${utterance.text}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.file.name.replace(/\.[^/.]+$/, '')}-subtitles.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMetadata = (job: FileJob) => {
    if (!job.transcription) return;

    const metadata = {
      filename: job.file.name,
      fileSize: job.file.size,
      service: job.service || 'unknown',
      speakerCount: job.speakerCount || 0,
      utteranceCount: job.utterances?.length || 0,
      transcriptLength: job.transcription.length,
      hasTimestamps: (job.utterances && job.utterances.length > 0) || false,
      processedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.file.name.replace(/\.[^/.]+$/, '')}-metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper functions for timestamp formatting
  const formatTimestampForDownload = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatSRTTimestamp = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const totalFiles = jobs.length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const pending = jobs.filter(j => j.status === 'pending').length;

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #333'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
          Multi-File Transcription
        </h3>
        {totalFiles > 0 && (
          <div style={{ fontSize: '12px', color: '#888' }}>
            {completed}/{totalFiles} complete
            {failed > 0 && ` • ${failed} failed`}
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '40px',
          border: '2px dashed #444',
          borderRadius: '8px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: processing ? '#2a2a2a' : '#0f0f0f',
          marginBottom: '16px'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.m4a"
          multiple
          onChange={handleFilesSelect}
          style={{ display: 'none' }}
        />
        <div style={{ color: '#888' }}>
          <div style={{ marginBottom: '8px', fontSize: '16px' }}>
            {totalFiles === 0
              ? 'Drop audio files here or click to select'
              : `${totalFiles} file${totalFiles > 1 ? 's' : ''} added`
            }
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Supports M4A, MP3, WAV • Multiple files supported
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {totalFiles > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <button
            onClick={processAllFiles}
            disabled={processing || pending === 0}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: processing ? '#333' : '#4a9eff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {processing ? 'Processing...' : `Transcribe ${pending} File${pending > 1 ? 's' : ''}`}
          </button>
          {completed > 0 && (
            <button
              onClick={downloadAllTranscriptions}
              style={{
                padding: '10px 16px',
                backgroundColor: '#2a2a2a',
                color: '#4a9eff',
                border: '1px solid #4a9eff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Download All
            </button>
          )}
          <button
            onClick={clearCompleted}
            disabled={completed === 0}
            style={{
              padding: '10px 16px',
              backgroundColor: '#2a2a2a',
              color: '#888',
              border: '1px solid #444',
              borderRadius: '6px',
              cursor: completed === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Clear Done
          </button>
          <button
            onClick={clearAll}
            disabled={processing}
            style={{
              padding: '10px 16px',
              backgroundColor: '#2a2a2a',
              color: '#ff6666',
              border: '1px solid #ff4444',
              borderRadius: '6px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* File List */}
      {totalFiles > 0 && (
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {jobs.map(job => (
            <div
              key={job.id}
              style={{
                padding: '12px',
                backgroundColor: '#0f0f0f',
                border: '1px solid #333',
                borderRadius: '6px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#fff',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginRight: '8px'
                }}>
                  {job.file.name}
                  <span style={{
                    fontSize: '12px',
                    color: '#888',
                    marginLeft: '8px'
                  }}>
                    ({job.file.size < 1024 * 1024
                      ? `${(job.file.size / 1024).toFixed(0)} KB`
                      : job.file.size < 1024 * 1024 * 1024
                      ? `${(job.file.size / 1024 / 1024).toFixed(1)} MB`
                      : `${(job.file.size / 1024 / 1024 / 1024).toFixed(2)} GB`
                    })
                    {job.service && (
                      <span style={{ marginLeft: '8px', color: job.service === 'whisper' ? '#4a9eff' : '#ff9a4a' }}>
                        • {job.service === 'whisper' ? 'OpenAI Whisper' : 'AssemblyAI'}
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    fontSize: '12px',
                    color: job.status === 'completed' ? '#66ff66' :
                           job.status === 'failed' ? '#ff6666' :
                           job.status === 'pending' ? '#888' : '#4a9eff'
                  }}>
                    {job.status === 'pending' && 'Pending'}
                    {job.status === 'uploading' && 'Uploading...'}
                    {job.status === 'transcribing' && 'Transcribing...'}
                    {job.status === 'completed' && 'Done'}
                    {job.status === 'failed' && 'Failed'}
                  </div>
                  {job.status === 'pending' && !processing && (
                    <button
                      onClick={() => removeJob(job.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        color: '#888',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {(job.status === 'uploading' || job.status === 'transcribing') && (
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#333',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    width: `${job.progress}%`,
                    height: '100%',
                    backgroundColor: '#4a9eff',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}

              {/* Error Message */}
              {job.status === 'failed' && job.error && (
                <div style={{
                  fontSize: '12px',
                  color: '#ff6666',
                  marginTop: '4px'
                }}>
                  Error: {job.error}
                </div>
              )}

              {/* Transcription Preview */}
              {job.status === 'completed' && job.transcription && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#1a2a1a',
                  border: '1px solid #44ff44',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#ccc',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {/* Speaker count badge */}
                  {job.speakerCount && job.speakerCount > 0 && (
                    <div style={{
                      fontSize: '10px',
                      color: '#4a9eff',
                      marginBottom: '6px',
                      fontWeight: 'bold'
                    }}>
                      {job.speakerCount} Speaker{job.speakerCount > 1 ? 's' : ''} Detected
                    </div>
                  )}

                  {/* Display speaker-labeled format if available */}
                  {job.utterances && job.utterances.length > 0 ? (
                    <div style={{ fontFamily: 'monospace', lineHeight: '1.6' }}>
                      {job.utterances.slice(0, 3).map((utterance, idx) => {
                        const minutes = Math.floor(utterance.start / 60000);
                        const seconds = Math.floor((utterance.start % 60000) / 1000);
                        const timestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                        return (
                          <div key={idx} style={{ marginBottom: '4px' }}>
                            <span style={{ color: '#888' }}>[{timestamp}]</span>{' '}
                            <span style={{ color: '#4a9eff' }}>Speaker {utterance.speaker}:</span>{' '}
                            <span>{utterance.text.substring(0, 80)}{utterance.text.length > 80 && '...'}</span>
                          </div>
                        );
                      })}
                      {job.utterances.length > 3 && (
                        <div style={{ color: '#888', fontStyle: 'italic', marginTop: '6px' }}>
                          + {job.utterances.length - 3} more utterances...
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {job.transcription.substring(0, 200)}
                      {job.transcription.length > 200 && '...'}
                    </>
                  )}
                </div>
              )}

              {/* Individual Download Buttons */}
              {job.status === 'completed' && job.transcription && (
                <div style={{
                  marginTop: '8px',
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => downloadPlainText(job)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      backgroundColor: '#2a2a2a',
                      color: '#4a9eff',
                      border: '1px solid #4a9eff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Download plain text transcript"
                  >
                    📄 TXT
                  </button>
                  {job.utterances && job.utterances.length > 0 && (
                    <>
                      <button
                        onClick={() => downloadSpeakerJSON(job)}
                        style={{
                          padding: '6px 10px',
                          fontSize: '11px',
                          backgroundColor: '#2a2a2a',
                          color: '#66ff66',
                          border: '1px solid #44aa44',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Download speaker-labeled JSON with timestamps"
                      >
                        🎤 Speakers JSON
                      </button>
                      <button
                        onClick={() => downloadSRT(job)}
                        style={{
                          padding: '6px 10px',
                          fontSize: '11px',
                          backgroundColor: '#2a2a2a',
                          color: '#ff9a4a',
                          border: '1px solid #cc7733',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Download SRT subtitles with speaker labels"
                      >
                        📺 SRT
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => downloadMetadata(job)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      backgroundColor: '#2a2a2a',
                      color: '#ff66ff',
                      border: '1px solid #aa44aa',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Download metadata JSON with file info"
                  >
                    📊 Metadata
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
