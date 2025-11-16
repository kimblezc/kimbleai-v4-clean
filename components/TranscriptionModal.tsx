// components/TranscriptionModal.tsx
// Transcription modal with tab navigation: Upload Files | Live Recording

'use client';

import { useState } from 'react';
import MultiFileAudioUpload from './MultiFileAudioUpload';
import LiveRecording from './LiveRecording';

interface Project {
  id: string;
  name: string;
}

interface TranscriptionModalProps {
  isOpen: boolean;
  userId: string;
  projects: Project[];
  onClose: () => void;
}

type TabType = 'upload' | 'live';

export default function TranscriptionModal({
  isOpen,
  userId,
  projects,
  onClose
}: TranscriptionModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0a0a0a',
          border: '1px solid #333',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>
              Audio Transcription
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#888' }}>
              Upload and transcribe multiple audio files
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #333',
            backgroundColor: '#0f0f0f'
          }}
        >
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: activeTab === 'upload' ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '2px solid #4a9eff' : '2px solid transparent',
              color: activeTab === 'upload' ? '#4a9eff' : '#888',
              fontSize: '14px',
              fontWeight: activeTab === 'upload' ? '600' : '400',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: activeTab === 'live' ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'live' ? '2px solid #4a9eff' : '2px solid transparent',
              color: activeTab === 'live' ? '#4a9eff' : '#888',
              fontSize: '14px',
              fontWeight: activeTab === 'live' ? '600' : '400',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Live Recording
          </button>
        </div>

        {/* Project Selector */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #333',
            backgroundColor: '#0f0f0f'
          }}
        >
          <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px', fontWeight: '500' }}>
            Save to Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              minHeight: '44px',
              cursor: 'pointer'
            }}
          >
            <option value="">General (No Project)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
            Transcriptions will be saved as conversations in the selected project
          </p>
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          {activeTab === 'upload' ? (
            <>
              <MultiFileAudioUpload
                userId={userId}
                projectId={selectedProjectId || 'general'}
                onComplete={(results) => {
                  const completed = results.filter(r => r.status === 'completed');
                  if (completed.length > 0) {
                    console.log(`Transcribed ${completed.length} file(s) successfully`);
                  }
                }}
              />

              {/* Info Section */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px'
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#fff', fontWeight: '600' }}>
                  How It Works
                </h3>
                <ul style={{
                  margin: 0,
                  padding: '0 0 0 20px',
                  color: '#888',
                  fontSize: '12px',
                  lineHeight: '1.8'
                }}>
                  <li>Upload multiple audio files (M4A, MP3, WAV)</li>
                  <li>Small files (&lt;25MB): OpenAI Whisper</li>
                  <li>Large files (25MB-5GB): AssemblyAI</li>
                  <li>Each transcription saves as a conversation</li>
                  <li>Download all transcriptions as text file</li>
                </ul>
              </div>
            </>
          ) : (
            <LiveRecording
              userId={userId}
              projectId={selectedProjectId || 'general'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
