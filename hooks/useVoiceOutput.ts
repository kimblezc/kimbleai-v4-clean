/**
 * Voice Output Hook
 * Reads AI responses aloud using ElevenLabs TTS
 *
 * Pairs with existing useVoiceInput hook for full voice conversation
 */

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface VoiceOutputOptions {
  voiceId?: string;
  autoPlay?: boolean;
}

interface VoiceOutputState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  usage: {
    monthlyUsage: number;
    freeTierLimit: number;
    percentageUsed: number;
    remainingFree: number;
    estimatedCost: number;
  } | null;
}

export function useVoiceOutput(options: VoiceOutputOptions = {}) {
  const [state, setState] = useState<VoiceOutputState>({
    isPlaying: false,
    isLoading: false,
    error: null,
    usage: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Speak text using TTS
   */
  const speak = useCallback(
    async (text: string, userId: string = 'zach') => {
      // Stop any current playback
      stop();

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        console.log(`[VoiceOutput] Converting to speech: "${text.substring(0, 50)}..."`);

        // Call TTS API
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            userId,
            voiceId: options.voiceId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'TTS conversion failed');
        }

        const data = await response.json();

        // Update usage stats
        setState((prev) => ({
          ...prev,
          isLoading: false,
          usage: data.usage,
        }));

        // Create audio element and play
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setState((prev) => ({ ...prev, isPlaying: true }));
          console.log('[VoiceOutput] Playing audio');
        };

        audio.onended = () => {
          setState((prev) => ({ ...prev, isPlaying: false }));
          console.log('[VoiceOutput] Playback finished');
        };

        audio.onerror = (e) => {
          console.error('[VoiceOutput] Playback error:', e);
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            error: 'Audio playback failed',
          }));
          toast.error('Failed to play audio');
        };

        if (options.autoPlay !== false) {
          await audio.play();
        }

        // Show usage info if approaching limit
        if (data.usage.percentageUsed > 80) {
          toast(`⚠️ TTS usage: ${Math.round(data.usage.percentageUsed)}% of free tier used`, {
            duration: 4000,
          });
        }

        return audio;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('[VoiceOutput] Request cancelled');
          return null;
        }

        console.error('[VoiceOutput] Error:', error);
        const errorMessage = error.message || 'Failed to convert text to speech';

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        toast.error(errorMessage);
        return null;
      }
    },
    [options.voiceId, options.autoPlay]
  );

  /**
   * Stop current playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
    console.log('[VoiceOutput] Stopped');
  }, []);

  /**
   * Toggle play/pause
   */
  const toggle = useCallback(() => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audioRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying]);

  return {
    speak,
    stop,
    toggle,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    error: state.error,
    usage: state.usage,
  };
}
