// components/AudioUpload.tsx
// Audio upload component with M4A support and Whisper transcription

'use client';

import { useState, useRef } from 'react';

interface AudioUploadProps {
  userId: string;
  projectId?: string;
  onTranscription?: (transcription: any) => void;
}

export default function AudioUpload({ userId, projectId = 'general', onTranscription }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('userId', userId);
      formData.append('projectId', projectId);

      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      setTranscription(data.transcription.text);
      
      if (onTranscription) {
        onTranscription(data.transcription);
      }

      console.log('[AUDIO] Transcription successful:', data.transcription);

    } catch (err: any) {
      console.error('[AUDIO] Upload error:', err);
      setError(err.message || 'Failed to upload and transcribe audio');
    } finally {
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
            Transcribing audio...
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
