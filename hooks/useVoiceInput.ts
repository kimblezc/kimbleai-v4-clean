import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Voice Input Hook using Web Speech API
 * Provides real-time speech-to-text transcription for chat input
 *
 * Features:
 * - Real-time transcription as you speak
 * - Interim and final results
 * - Auto-restart on silence
 * - Browser compatibility detection
 * - Error handling
 *
 * Browser Support:
 * - Chrome/Edge: Full support
 * - Safari: Full support (iOS 14.5+)
 * - Firefox: Limited support
 */

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
}

// Type definition for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    onTranscript,
    continuous = true,
    interimResults = true,
    language = 'en-US',
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  // Configure recognition
  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimText += transcriptPart;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
        onTranscript?.(finalTranscript.trim(), true);
      }

      if (interimText) {
        setInterimTranscript(interimText);
        onTranscript?.(interimText, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceInput] Recognition error:', event.error);

      // Handle different error types
      switch (event.error) {
        case 'no-speech':
          // Don't show error for no-speech, just restart
          if (isListening && continuous) {
            restartRecognition();
          }
          break;
        case 'aborted':
          // User stopped listening, don't show error
          break;
        case 'not-allowed':
          setError('Microphone permission denied. Please allow microphone access.');
          setIsListening(false);
          break;
        case 'network':
          setError('Network error. Please check your connection.');
          setIsListening(false);
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening (handles silence timeout)
      if (isListening && continuous) {
        restartRecognition();
      } else {
        setIsListening(false);
      }
    };

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

  }, [continuous, interimResults, language, isListening, onTranscript]);

  const restartRecognition = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    // Small delay before restart to avoid rapid restarts
    restartTimeoutRef.current = setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('[VoiceInput] Restart error:', err);
      }
    }, 100);
  }, [isListening]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) return;

    try {
      setError(null);
      recognitionRef.current.start();
    } catch (err: any) {
      // Already started error is expected and can be ignored
      if (err.name !== 'InvalidStateError') {
        console.error('[VoiceInput] Start error:', err);
        setError('Failed to start speech recognition');
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (err) {
      console.error('[VoiceInput] Stop error:', err);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
