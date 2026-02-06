/**
 * OpenAI Realtime API - Voice Chat Integration
 *
 * Connects to OpenAI's Realtime API via WebRTC for low-latency voice conversations.
 * Based on OpenAI's recommended WebRTC approach for client-side connections.
 *
 * @see https://platform.openai.com/docs/guides/realtime-webrtc
 */

export interface RealtimeConfig {
  model?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  instructions?: string;
  turnDetection?: {
    type: 'server_vad' | 'none';
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
  };
}

export interface RealtimeEvents {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string, audio?: ArrayBuffer) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export class RealtimeVoiceChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private config: RealtimeConfig;
  private events: RealtimeEvents;
  private connected: boolean = false;

  constructor(config: RealtimeConfig = {}, events: RealtimeEvents = {}) {
    this.config = {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      turnDetection: {
        type: 'server_vad',
        threshold: 0.5,
        prefixPaddingMs: 300,
        silenceDurationMs: 500,
      },
      ...config,
    };
    this.events = events;
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(): Promise<void> {
    try {
      // Get ephemeral token from our backend
      const tokenResponse = await fetch('/api/voice/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.config.model }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get realtime token');
      }

      const { client_secret } = await tokenResponse.json();

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up audio playback
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;

      this.pc.ontrack = (e) => {
        if (this.audioElement) {
          this.audioElement.srcObject = e.streams[0];
        }
      };

      // Get user microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Add audio track
      this.localStream.getTracks().forEach((track) => {
        this.pc?.addTrack(track, this.localStream!);
      });

      // Create data channel for events
      this.dc = this.pc.createDataChannel('oai-events');
      this.setupDataChannel();

      // Create and set offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Send offer to OpenAI
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = this.config.model;

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${client_secret.value}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await this.pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      this.connected = true;
      this.events.onConnected?.();

      // Configure session after connection
      this.configureSession();
    } catch (error) {
      console.error('[Realtime] Connection error:', error);
      this.events.onError?.(error instanceof Error ? error : new Error('Connection failed'));
      throw error;
    }
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dc) return;

    this.dc.onopen = () => {
      console.log('[Realtime] Data channel open');
    };

    this.dc.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        this.handleServerEvent(event);
      } catch (error) {
        console.error('[Realtime] Failed to parse event:', error);
      }
    };

    this.dc.onerror = (e) => {
      console.error('[Realtime] Data channel error:', e);
    };
  }

  /**
   * Handle server events
   */
  private handleServerEvent(event: any): void {
    switch (event.type) {
      case 'session.created':
        console.log('[Realtime] Session created');
        break;

      case 'session.updated':
        console.log('[Realtime] Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        this.events.onSpeechStart?.();
        break;

      case 'input_audio_buffer.speech_stopped':
        this.events.onSpeechEnd?.();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.events.onTranscript?.(event.transcript, true);
        break;

      case 'response.audio_transcript.delta':
        this.events.onTranscript?.(event.delta, false);
        break;

      case 'response.audio_transcript.done':
        this.events.onResponse?.(event.transcript);
        break;

      case 'response.done':
        console.log('[Realtime] Response complete');
        break;

      case 'error':
        console.error('[Realtime] Server error:', event.error);
        this.events.onError?.(new Error(event.error?.message || 'Server error'));
        break;

      default:
        console.log('[Realtime] Event:', event.type);
    }
  }

  /**
   * Configure session settings
   */
  private configureSession(): void {
    this.sendEvent({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.config.instructions || 'You are a helpful AI assistant.',
        voice: this.config.voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: this.config.turnDetection,
      },
    });
  }

  /**
   * Send event to server
   */
  sendEvent(event: any): void {
    if (this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    } else {
      console.warn('[Realtime] Data channel not ready');
    }
  }

  /**
   * Send a text message
   */
  sendText(text: string): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });

    this.sendEvent({ type: 'response.create' });
  }

  /**
   * Interrupt current response
   */
  interrupt(): void {
    this.sendEvent({ type: 'response.cancel' });
  }

  /**
   * Mute/unmute microphone
   */
  setMuted(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.pc?.connectionState === 'connected';
  }

  /**
   * Disconnect from realtime API
   */
  disconnect(): void {
    this.connected = false;

    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    this.events.onDisconnected?.();
  }
}

/**
 * Voice Activity Detection helper
 */
export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private threshold: number;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private isSpeaking: boolean = false;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private animationFrame: number | null = null;

  constructor(
    threshold: number = 0.02,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void
  ) {
    this.threshold = threshold;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
  }

  async start(stream: MediaStream): Promise<void> {
    this.stream = stream;
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    this.detectVoice();
  }

  private detectVoice(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const check = () => {
      this.analyser!.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;

      if (average > this.threshold) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.onSpeechStart?.();
        }

        // Clear silence timeout
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
      } else if (this.isSpeaking && !this.silenceTimeout) {
        // Start silence timeout
        this.silenceTimeout = setTimeout(() => {
          this.isSpeaking = false;
          this.onSpeechEnd?.();
        }, 500);
      }

      this.animationFrame = requestAnimationFrame(check);
    };

    check();
  }

  stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.stream = null;
    this.isSpeaking = false;
  }
}
