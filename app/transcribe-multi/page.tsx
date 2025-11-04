// app/transcribe-multi/page.tsx
// Multi-file audio transcription demo page

'use client';

import { useEffect, useState } from 'react';
import MultiFileAudioUpload from '@/components/MultiFileAudioUpload';

export default function TranscribeMultiPage() {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Get user from session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user?.id) {
          setUserId(data.user.id);
        } else {
          setUserId('demo-user');
        }
      })
      .catch(() => {
        setUserId('demo-user');
      });
  }, []);

  if (!userId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#888'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '32px',
            color: '#fff',
            fontWeight: 'bold'
          }}>
            Multi-File Transcription
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: '#888'
          }}>
            Upload and transcribe multiple audio files simultaneously
          </p>
        </div>

        {/* Upload Component */}
        <MultiFileAudioUpload
          userId={userId}
          projectId="multi-transcribe"
          onComplete={(results) => {
            console.log('Batch transcription complete:', results);
            const completed = results.filter(r => r.status === 'completed');
            if (completed.length > 0) {
              alert(`Successfully transcribed ${completed.length} file(s)!`);
            }
          }}
        />

        {/* Info Section */}
        <div style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px'
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: '#fff'
          }}>
            How It Works
          </h3>
          <ul style={{
            margin: 0,
            padding: '0 0 0 20px',
            color: '#888',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <li>Upload multiple audio files at once (drag & drop or click)</li>
            <li>Files &lt;100MB use OpenAI Whisper (fast & cost-effective)</li>
            <li>Files &gt;100MB use AssemblyAI (handles large files)</li>
            <li>Each file processes independently with progress tracking</li>
            <li>Download all transcriptions as a single text file</li>
            <li>Supports M4A, MP3, WAV formats</li>
          </ul>
        </div>

        {/* Cost Info */}
        <div style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#1a1a2a',
          border: '1px solid #4a4aff',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#8a8aff', marginBottom: '4px' }}>
                Pricing
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                OpenAI: ~$0.006/min • AssemblyAI: ~$0.0068/min
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: '#8a8aff', marginBottom: '4px' }}>
                Daily Limit
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                10 hours / $5.00
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
