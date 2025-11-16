// components/LiveRecording.tsx
// Live audio recording with AssemblyAI real-time transcription

'use client';

import { useState, useRef, useEffect } from 'react';

interface LiveRecordingProps {
  userId: string;
  projectId?: string;
}

export default function LiveRecording({
  userId,
  projectId = 'general'
}: LiveRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Request microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
    return () => {
      cleanup();
    };
  }, []);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, partialTranscript]);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
    } catch (err: any) {
      setPermissionGranted(false);
      setError('Microphone permission denied. Please allow microphone access to use live recording.');
    }
  };

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
    } catch (err: any) {
      setPermissionGranted(false);
      setError('Microphone permission denied. Please allow microphone access to use live recording.');
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      setTranscript('');
      setPartialTranscript('');
      setDuration(0);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Setup audio level visualization
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start audio level monitoring
      monitorAudioLevel();

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // Send to AssemblyAI real-time API
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            event.data.arrayBuffer().then(buffer => {
              // Convert to base64 for AssemblyAI
              const base64 = btoa(
                String.fromCharCode(...new Uint8Array(buffer))
              );
              websocketRef.current?.send(JSON.stringify({
                audio_data: base64
              }));
            });
          }
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      // Connect to AssemblyAI real-time WebSocket
      await connectToAssemblyAI();

      // Start recording
      mediaRecorder.start(250); // Send data every 250ms
      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

    } catch (err: any) {
      setError(`Failed to start recording: ${err.message}`);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (websocketRef.current) {
      // Send end of stream message
      websocketRef.current.send(JSON.stringify({ terminate_session: true }));
      websocketRef.current.close();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setAudioLevel(0);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }

    // Save the recording
    saveRecording();
  };

  const connectToAssemblyAI = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Get token from API
      fetch('/api/transcribe/realtime-token')
        .then(res => res.json())
        .then(data => {
          const ws = new WebSocket(
            `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${data.token}`
          );

          websocketRef.current = ws;

          ws.onopen = () => {
            console.log('AssemblyAI WebSocket connected');
            resolve();
          };

          ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.message_type === 'PartialTranscript') {
              setPartialTranscript(message.text);
            } else if (message.message_type === 'FinalTranscript') {
              setTranscript(prev => prev + ' ' + message.text);
              setPartialTranscript('');
            } else if (message.message_type === 'SessionBegins') {
              console.log('Session started:', message.session_id);
            }
          };

          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('Real-time transcription connection failed');
            reject(error);
          };

          ws.onclose = () => {
            console.log('AssemblyAI WebSocket closed');
          };
        })
        .catch(err => {
          setError('Failed to get transcription token');
          reject(err);
        });
    });
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current || !isRecording) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 255) * 100 * 2));

      if (isRecording) {
        requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  };

  const saveRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setError('No audio recorded');
      return;
    }

    setIsSaving(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      const formData = new FormData();
      formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
      formData.append('userId', userId);
      formData.append('projectId', projectId);
      formData.append('transcript', transcript.trim());

      const response = await fetch('/api/transcribe/save-live-recording', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save recording');
      }

      const result = await response.json();

      // Reset for next recording
      audioChunksRef.current = [];
      setTranscript('');
      setPartialTranscript('');
      setDuration(0);

      alert('Recording saved successfully!');

    } catch (err: any) {
      setError(`Failed to save recording: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!permissionGranted) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#888'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
        <div style={{ fontSize: '16px', marginBottom: '16px', color: '#fff' }}>
          Microphone Access Required
        </div>
        <div style={{ fontSize: '14px', marginBottom: '24px' }}>
          {error || 'Please allow microphone access to use live recording.'}
        </div>
        <button
          onClick={requestMicrophonePermission}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4a9eff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            minHeight: '44px'
          }}
        >
          Request Permission
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Recording Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '24px',
        backgroundColor: '#0f0f0f',
        border: '1px solid #333',
        borderRadius: '12px'
      }}>
        {/* Timer */}
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: isRecording ? '#ff4444' : '#888',
          fontFamily: 'monospace'
        }}>
          {formatTime(duration)}
        </div>

        {/* Audio Level Meter */}
        {isRecording && (
          <div style={{
            width: '100%',
            maxWidth: '300px',
            height: '8px',
            backgroundColor: '#333',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${audioLevel}%`,
              backgroundColor: '#4a9eff',
              transition: 'width 0.1s ease'
            }} />
          </div>
        )}

        {/* Record Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSaving}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isRecording ? '#ff4444' : '#4a9eff',
            color: '#fff',
            fontSize: '48px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isRecording ? '0 0 20px rgba(255, 68, 68, 0.5)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          {isSaving ? '⏳' : isRecording ? '⏹' : '🎤'}
        </button>

        {/* Status Text */}
        <div style={{
          fontSize: '14px',
          color: '#888'
        }}>
          {isSaving ? 'Saving recording...' : isRecording ? 'Recording in progress...' : 'Click to start recording'}
        </div>
      </div>

      {/* Transcript Display */}
      <div style={{
        backgroundColor: '#0f0f0f',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '20px',
        minHeight: '300px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#888',
          marginBottom: '12px',
          fontWeight: 'bold'
        }}>
          Live Transcript
        </div>
        <div
          ref={transcriptRef}
          style={{
            fontSize: '14px',
            color: '#ccc',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap'
          }}
        >
          {transcript}
          {partialTranscript && (
            <span style={{ color: '#666', fontStyle: 'italic' }}>
              {' '}{partialTranscript}
            </span>
          )}
          {!transcript && !partialTranscript && (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              Start recording to see live transcription...
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#2a1a1a',
          border: '1px solid #ff4444',
          borderRadius: '8px',
          color: '#ff6666',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Info */}
      <div style={{
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Recording will be saved to project: {projectId}
      </div>
    </div>
  );
}
