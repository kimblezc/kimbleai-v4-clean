'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Button } from '../../../components/ui/Button';

interface DriveAudioFile {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  canTranscribe: boolean;
}

interface Transcription {
  id: string;
  text: string;
  duration: number;
  durationMinutes: string;
  language: string;
  filename: string;
  cost: string;
  segments: any[];
}

export default function AudioTranscribePage() {
  const { data: session } = useSession();
  const [audioFiles, setAudioFiles] = useState<DriveAudioFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load audio files from Google Drive
  const loadAudioFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/audio/transcribe-from-drive?userId=zach');
      const data = await response.json();

      if (data.success) {
        setAudioFiles(data.files);
      } else {
        setError(data.error || 'Failed to load audio files');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Transcribe a file from Google Drive
  const transcribeFile = async (file: DriveAudioFile) => {
    setTranscribing(file.id);
    setError(null);
    setTranscription(null);

    try {
      const response = await fetch('/api/audio/transcribe-from-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          userId: 'zach',
          projectId: 'general'
        })
      });

      const data = await response.json();

      if (data.success) {
        setTranscription(data.transcription);
      } else {
        setError(data.error || 'Transcription failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTranscribing(null);
    }
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
          <h2 className="text-xl text-white">Please sign in to access audio transcription</h2>
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
            <h1 className="text-3xl font-bold text-white mb-2">Audio Transcription</h1>
            <p className="text-gray-400">
              Transcribe audio files from Google Drive using OpenAI Whisper
            </p>
          </div>
          <Button onClick={loadAudioFiles} variant="secondary" disabled={loading}>
            {loading ? 'Loading...' : '🔄 Refresh Files'}
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            📋 How It Works
          </h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>✓ Lists audio files from your Google Drive</li>
            <li>✓ Downloads and transcribes directly (no Supabase upload needed)</li>
            <li>✓ Supports files up to 25MB (Whisper API limit)</li>
            <li>✓ Cost: $0.006 per minute of audio</li>
            <li>✓ Budget enforcement prevents overspending</li>
            <li>✓ Stores transcriptions with semantic search embeddings</li>
          </ul>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Transcription Result */}
        {transcription && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-300 mb-3">
              ✅ Transcription Complete
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">File:</span>
                  <span className="text-white ml-2">{transcription.filename}</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white ml-2">{transcription.durationMinutes} minutes</span>
                </div>
                <div>
                  <span className="text-gray-400">Language:</span>
                  <span className="text-white ml-2">{transcription.language}</span>
                </div>
                <div>
                  <span className="text-gray-400">Cost:</span>
                  <span className="text-white ml-2">{transcription.cost}</span>
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Transcription Text:</h4>
                <div className="bg-black/40 rounded p-4 max-h-96 overflow-y-auto">
                  <p className="text-gray-300 whitespace-pre-wrap">{transcription.text}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Files List */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            🎵 Audio Files in Google Drive ({audioFiles.length})
          </h3>

          {loading ? (
            <p className="text-gray-400">Loading files from Google Drive...</p>
          ) : audioFiles.length === 0 ? (
            <p className="text-gray-400">No audio files found in your Google Drive</p>
          ) : (
            <div className="space-y-3">
              {audioFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-black/40 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎵</span>
                      <div>
                        <h4 className="text-white font-medium">{file.name}</h4>
                        <p className="text-sm text-gray-400">
                          {file.sizeFormatted} • Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!file.canTranscribe && (
                      <span className="text-xs text-yellow-400">
                        ⚠️ Too large (max 25MB)
                      </span>
                    )}
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View in Drive
                    </a>
                    <Button
                      onClick={() => transcribeFile(file)}
                      disabled={!file.canTranscribe || transcribing === file.id}
                      size="sm"
                    >
                      {transcribing === file.id ? (
                        <>⏳ Transcribing...</>
                      ) : (
                        <>🎤 Transcribe</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
