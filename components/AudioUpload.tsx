// components/AudioUpload.tsx
// Audio upload component with M4A support and Whisper transcription with progress tracking

'use client';

import { useState, useRef, useEffect } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

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
  const [showCostWarning, setShowCostWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [costDetails, setCostDetails] = useState({ size: 0, hours: 0, cost: 0 });
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleAssemblyAIUpload = async (file: File) => {
    // Cost estimation and user confirmation
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedHours = fileSizeMB / 30; // Rough estimate: 30MB per hour
    const estimatedCost = estimatedHours * 0.41; // $0.41/hour with minimal features

    // Show cost warning for files that will cost more than $1
    if (estimatedCost > 1.00) {
      setCostDetails({ size: fileSizeMB, hours: estimatedHours, cost: estimatedCost });
      setPendingFile(file);
      setShowCostWarning(true);
      return;
    }

    // Proceed directly if cost is low
    await processTranscription(file);
  };

  const handleCostWarningConfirm = async () => {
    setShowCostWarning(false);
    if (pendingFile) {
      await processTranscription(pendingFile);
      setPendingFile(null);
    }
  };

  const handleCostWarningCancel = () => {
    setShowCostWarning(false);
    setPendingFile(null);
    setError('Transcription cancelled by user');
  };

  const processTranscription = async (file: File) => {

    setUploading(true);
    setError('');
    setTranscription('');
    setProgressState({ progress: 0, eta: 0, status: 'initializing' });

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('userId', userId);
      formData.append('projectId', projectId);

      console.log(`[AUDIO-CLIENT] Processing with AssemblyAI: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

      const response = await fetch('/api/transcribe/assemblyai', {
        method: 'POST',
        body: formData,
      });

      console.log(`[AUDIO-CLIENT] Response status: ${response.status}`, response.headers.get('content-type'));

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start AssemblyAI transcription');
      }

      // Start polling for AssemblyAI progress
      const jobId = data.jobId;
      const estimatedMinutes = Math.max(2, Math.round(file.size / (1024 * 1024) * 1.5)); // ~1.5 min per MB
      setProgressState({
        progress: 0,
        eta: estimatedMinutes * 60, // Convert to seconds
        status: 'starting',
        jobId
      });

      // Use adaptive polling - less frequent for very large files to reduce server load
      const pollInterval = file.size > 500 * 1024 * 1024 ? 5000 : 3000; // 5s for >500MB, 3s otherwise
      progressIntervalRef.current = setInterval(() => {
        pollAssemblyAIProgress(jobId);
      }, pollInterval);

      console.log(`[AUDIO-CLIENT] Started AssemblyAI job ${jobId} for ${file.name} (ETA: ~${estimatedMinutes}min)`);

    } catch (err: any) {
      console.error('[AUDIO-CLIENT] AssemblyAI upload error:', err);
      console.error('[AUDIO-CLIENT] Error stack:', err.stack);
      setError(`Upload failed: ${err.message || 'Unknown error'}. Check browser console for details.`);
      setUploading(false);
    }
  };

  const handleWhisperUpload = async (file: File) => {
    setUploading(true);
    setError('');
    setTranscription('');
    setProgressState({ progress: 0, eta: 0, status: 'initializing' });

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('userId', userId);
      formData.append('projectId', projectId);

      console.log(`[AUDIO-CLIENT] Processing with OpenAI Whisper: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

      const response = await fetch('/api/audio/transcribe-progress', {
        method: 'POST',
        body: formData,
      });

      console.log(`[AUDIO-CLIENT] Response status: ${response.status}`, response.headers.get('content-type'));

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Whisper transcription');
      }

      // Start polling for Whisper progress
      const jobId = data.jobId;
      const estimatedMinutes = Math.max(1, Math.round(file.size / (1024 * 1024) * 0.5)); // ~0.5 min per MB for Whisper
      setProgressState({
        progress: 0,
        eta: estimatedMinutes * 60,
        status: 'starting',
        jobId
      });

      progressIntervalRef.current = setInterval(() => {
        pollWhisperProgress(jobId);
      }, 1500); // Poll every 1.5 seconds for Whisper

      console.log(`[AUDIO-CLIENT] Started Whisper job ${jobId} for ${file.name} (ETA: ~${estimatedMinutes}min)`);

    } catch (err: any) {
      console.error('[AUDIO-CLIENT] Whisper upload error:', err);
      console.error('[AUDIO-CLIENT] Error stack:', err.stack);
      setError(`Whisper upload failed: ${err.message || 'Unknown error'}. Check browser console for details.`);
      setUploading(false);
    }
  };

  const pollWhisperProgress = async (jobId: string) => {
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

          console.log('[AUDIO-CLIENT] Whisper transcription successful:', data.result);
        } else if (data.status === 'failed') {
          setError(data.error || 'Whisper transcription failed');
          setUploading(false);

          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('[AUDIO-CLIENT] Whisper progress poll error:', err);
    }
  };

  const pollAssemblyAIProgress = async (jobId: string) => {
    try {
      const response = await fetch(`/api/transcribe/assemblyai?jobId=${jobId}`);
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

          console.log('[AUDIO-CLIENT] AssemblyAI transcription successful:', data.result);
        } else if (data.status === 'failed') {
          setError(data.error || 'AssemblyAI transcription failed');
          setUploading(false);

          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('[AUDIO-CLIENT] AssemblyAI progress poll error:', err);
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

    const fileSizeMB = file.size / (1024 * 1024);

    // Cost-effective routing: Use OpenAI Whisper for smaller files (<100MB)
    // AssemblyAI for very large files (>100MB) where Whisper would fail
    if (fileSizeMB < 100) {
      console.log(`Processing file: ${file.name} (${fileSizeMB.toFixed(1)}MB) via OpenAI Whisper (cost-effective)`);
      return handleWhisperUpload(file);
    } else {
      console.log(`Processing file: ${file.name} (${fileSizeMB.toFixed(1)}MB) via AssemblyAI (large file)`);
      return handleAssemblyAIUpload(file);
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
        Smart Audio Transcription
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
              {progressState.status === 'uploading' && 'Uploading to transcription service...'}
              {progressState.status === 'transcribing' && 'AI transcription in progress...'}
              {progressState.status === 'processing' && 'Analyzing audio with AI features...'}
              {progressState.status === 'saving' && 'Saving results...'}
              {progressState.status === 'preparing_chunks' && 'Preparing file chunks for large file...'}
              {progressState.status === 'processing_chunks' && 'Processing audio chunks...'}
              {progressState.status.startsWith('processing_chunk_') && `Processing chunk ${progressState.status.split('_')[2]}...`}
              {progressState.status === 'combining_results' && 'Combining chunk results...'}
              {progressState.status === 'preparing_file' && 'Preparing audio file...'}
              {progressState.status === 'uploading_to_whisper' && 'Uploading to OpenAI Whisper...'}
              {progressState.status === 'uploading_to_assemblyai' && 'Uploading to AssemblyAI...'}
              {progressState.status === 'saving_to_database' && 'Saving transcription...'}
              {progressState.status === 'generating_embeddings' && 'Generating embeddings...'}
              {progressState.status === 'starting' && 'Starting transcription...'}
              {progressState.status === 'queued' && 'Queued for processing...'}
              {progressState.status === 'completed' && 'Transcription complete!'}
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
              color: '#aaa',
              marginBottom: '4px'
            }}>
              <span>{progressState.progress}% complete</span>
              {progressState.eta > 0 && (
                <span>
                  ETA: {progressState.eta < 60
                    ? `${progressState.eta}s`
                    : progressState.eta < 3600
                    ? `${Math.floor(progressState.eta / 60)}m ${progressState.eta % 60}s`
                    : `${Math.floor(progressState.eta / 3600)}h ${Math.floor((progressState.eta % 3600) / 60)}m`
                  }
                </span>
              )}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#666',
              textAlign: 'center'
            }}>
              Large files may take several minutes to process • AI analysis includes speaker detection, sentiment & summaries
            </div>
          </div>
        ) : (
          <div style={{ color: '#888' }}>
            <div style={{ marginBottom: '8px', fontSize: '16px' }}>
              Drop audio file here or click to select
            </div>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>
              Smart routing: OpenAI Whisper (&lt;100MB) • AssemblyAI (100MB-2GB+)
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Supports M4A, MP3, WAV • Cost-optimized • Daily limits: $5 / 10 hours
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

      {/* Cost Warning Dialog */}
      <ConfirmDialog
        isOpen={showCostWarning}
        onClose={handleCostWarningCancel}
        onConfirm={handleCostWarningConfirm}
        title="⚠️ Cost Warning"
        message={`File: ${pendingFile?.name || ''} (${costDetails.size.toFixed(1)}MB)\nEstimated duration: ${costDetails.hours.toFixed(1)} hours\nEstimated cost: $${costDetails.cost.toFixed(2)}\n\nDaily limit: 10 hours / $5.00\n\nProceed with transcription?`}
        variant="warning"
      />
    </div>
  );
}
