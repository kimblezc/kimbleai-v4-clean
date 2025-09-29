// components/AudioUpload.tsx
// Audio upload component with M4A support and Whisper transcription with progress tracking

'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioUploadProps {
  userId: string;
  projectId?: string;
  onTranscription?: (transcription: any) => void;
}

interface ProgressState {
  progress: number;
  eta: number;
  status: string;
  jobId?: string;
}

export default function AudioUpload({ userId, projectId = 'general', onTranscription }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [progressState, setProgressState] = useState<ProgressState>({
    progress: 0,
    eta: 0,
    status: 'idle'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const pollProgress = async (jobId: string) => {
    try {
      const response = await fetch(`/api/audio/transcribe-progress?jobId=${jobId}`);
      const data = await response.json();

      if (data.success) {
        setProgressState({
          progress: data.progress,
          eta: data.eta,
          status: data.status,
          jobId
        });

        if (data.status === 'completed' && data.result) {
          setTranscription(data.result.text);
          setUploading(false);

          if (onTranscription) {
            onTranscription(data.result);
          }

          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }

          console.log('[AUDIO] Transcription successful:', data.result);
        } else if (data.status === 'failed') {
          setError(data.error || 'Transcription failed');
          setUploading(false);

          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('[AUDIO] Progress poll error:', err);
    }
  };

  const handleAudioUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.m4a')) {
      setError('Please upload a valid audio file (M4A, MP3, WAV, etc.)');
      return;
    }

    setUploading(true);
    setError('');
    setTranscription('');
    setProgressState({ progress: 0, eta: 0, status: 'initializing' });

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('userId', userId);
      formData.append('projectId', projectId);

      const response = await fetch('/api/audio/transcribe-progress', {
        method: 'POST',
        body: formData,
      });

      // Read response as text first, then try to parse as JSON
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // Handle non-JSON responses (HTML error pages, etc.)
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start transcription');
      }

      // Start polling for progress
      const jobId = data.jobId;
      setProgressState({
        progress: 0,
        eta: data.estimatedDuration ? Math.round(data.estimatedDuration / 2.5) : 30,
        status: 'starting',
        jobId
      });

      progressIntervalRef.current = setInterval(() => {
        pollProgress(jobId);
      }, 1500); // Poll every 1.5 seconds

      console.log(`[AUDIO] Started transcription job ${jobId} for ${file.name}`);

    } catch (err: any) {
      console.error('[AUDIO] Upload error:', err);
      setError(err.message || 'Failed to upload and transcribe audio');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAudioUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleAudioUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #333'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        color: '#ffffff'
      }}>
        Audio Transcription
      </h3>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '40px',
          border: '2px dashed #444',
          borderRadius: '8px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: uploading ? '#2a2a2a' : '#0f0f0f',
          transition: 'all 0.3s'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.m4a"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div style={{ color: '#4a9eff' }}>
            <div style={{ marginBottom: '12px' }}>
              {progressState.status === 'initializing' && 'Initializing transcription...'}
              {progressState.status === 'preparing_file' && 'Preparing audio file...'}
              {progressState.status === 'uploading_to_whisper' && 'Uploading to Whisper...'}
              {progressState.status === 'transcribing' && 'Transcribing audio...'}
              {progressState.status === 'saving_to_database' && 'Saving transcription...'}
              {progressState.status === 'generating_embeddings' && 'Generating embeddings...'}
              {progressState.status === 'starting' && 'Starting transcription...'}
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#333',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                width: `${progressState.progress}%`,
                height: '100%',
                backgroundColor: '#4a9eff',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Progress Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#aaa'
            }}>
              <span>{progressState.progress}% complete</span>
              {progressState.eta > 0 && (
                <span>
                  ETA: {progressState.eta < 60
                    ? `${progressState.eta}s`
                    : `${Math.floor(progressState.eta / 60)}m ${progressState.eta % 60}s`
                  }
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: '#888' }}>
            <div style={{ marginBottom: '8px' }}>
              Drop M4A/audio file here or click to select
            </div>
            <div style={{ fontSize: '12px' }}>
              Supports M4A, MP3, WAV, and other audio formats
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#3a1a1a',
          border: '1px solid #ff4444',
          borderRadius: '6px',
          color: '#ff6666',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {transcription && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#1a2a1a',
          border: '1px solid #44ff44',
          borderRadius: '6px'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            color: '#66ff66',
            fontSize: '14px'
          }}>
            Transcription Complete:
          </h4>
          <div style={{
            color: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap'
          }}>
            {transcription}
          </div>
        </div>
      )}
    </div>
  );
}
