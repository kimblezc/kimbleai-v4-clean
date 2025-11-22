/**
 * ElevenLabs TTS Client - Phase 3 Integration
 *
 * Text-to-speech using ElevenLabs Turbo v2.5
 * FREE tier: 10,000 characters/month
 *
 * Features:
 * - High-quality voice synthesis
 * - Multiple voice options
 * - Streaming audio support
 * - Usage tracking
 * - Cost monitoring
 *
 * @see https://elevenlabs.io/docs
 */

interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  model?: 'eleven_turbo_v2_5' | 'eleven_multilingual_v2' | 'eleven_monolingual_v1';
  onUsage?: (charactersUsed: number) => void;
}

interface VoiceSettings {
  stability: number;        // 0-1, voice consistency
  similarity_boost: number; // 0-1, voice similarity
  style?: number;          // 0-1, emotional range
  use_speaker_boost?: boolean;
}

interface TTSRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
}

interface TTSResponse {
  audio: ArrayBuffer;
  charactersUsed: number;
  requestId: string;
}

// Default voice IDs (popular ElevenLabs voices)
const DEFAULT_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',      // Calm, conversational
  adam: 'pNInz6obpgDQGcFmaJgB',        // Deep, authoritative
  sam: 'yoZ06aMxZJJ28mfd3POQ',         // Dynamic, energetic
  bella: 'EXAVITQu4vr4xnSDxMaL',       // Soft, pleasant
  antoni: 'ErXwobaYiN019PkySvjV',      // Warm, friendly
};

// Pricing: FREE tier 10K chars/month, then $5 for 30K chars
const PRICING = {
  freeTier: 10000,           // 10K characters free per month
  paidTier: 30000,           // 30K characters for $5/month
  costPerChar: 5 / 30000,    // $0.00017 per character after free tier
};

export class ElevenLabsClient {
  private apiKey: string;
  private baseURL: string;
  private defaultVoiceId: string;
  private defaultModel: string;
  private onUsage?: (charactersUsed: number) => void;
  private monthlyUsage: number;

  constructor(config: ElevenLabsConfig) {
    if (!config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    this.defaultVoiceId = config.voiceId || DEFAULT_VOICES.rachel;
    this.defaultModel = config.model || 'eleven_turbo_v2_5';
    this.onUsage = config.onUsage;
    this.monthlyUsage = 0;
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(request: TTSRequest): Promise<TTSResponse> {
    const voiceId = request.voiceId || this.defaultVoiceId;
    const modelId = request.modelId || this.defaultModel;

    const voiceSettings: VoiceSettings = request.voiceSettings || {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    };

    try {
      console.log(`[ElevenLabs] Converting text to speech: "${request.text.substring(0, 50)}..."`);
      console.log(`[ElevenLabs] Voice: ${voiceId}, Model: ${modelId}`);

      const response = await fetch(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: request.text,
            model_id: modelId,
            voice_settings: voiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `ElevenLabs API error: ${response.status} - ${error.detail?.message || 'Unknown error'}`
        );
      }

      const audio = await response.arrayBuffer();
      const charactersUsed = request.text.length;

      // Track usage
      this.monthlyUsage += charactersUsed;
      if (this.onUsage) {
        this.onUsage(charactersUsed);
      }

      console.log(`[ElevenLabs] Success: ${charactersUsed} characters, ${audio.byteLength} bytes audio`);

      return {
        audio,
        charactersUsed,
        requestId: response.headers.get('request-id') || 'unknown',
      };
    } catch (error) {
      console.error('[ElevenLabs] TTS error:', error);
      throw error;
    }
  }

  /**
   * Stream text to speech (for long texts)
   */
  async *streamTextToSpeech(request: TTSRequest): AsyncGenerator<ArrayBuffer, void, undefined> {
    const voiceId = request.voiceId || this.defaultVoiceId;
    const modelId = request.modelId || this.defaultModel;

    const voiceSettings: VoiceSettings = request.voiceSettings || {
      stability: 0.5,
      similarity_boost: 0.75,
    };

    try {
      console.log(`[ElevenLabs] Streaming TTS for: "${request.text.substring(0, 50)}..."`);

      const response = await fetch(
        `${this.baseURL}/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: request.text,
            model_id: modelId,
            voice_settings: voiceSettings,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs streaming error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value.buffer;
      }

      // Track usage
      const charactersUsed = request.text.length;
      this.monthlyUsage += charactersUsed;
      if (this.onUsage) {
        this.onUsage(charactersUsed);
      }

      console.log(`[ElevenLabs] Stream complete: ${charactersUsed} characters`);
    } catch (error) {
      console.error('[ElevenLabs] Streaming error:', error);
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('[ElevenLabs] Failed to get voices:', error);
      throw error;
    }
  }

  /**
   * Calculate cost for text
   */
  calculateCost(text: string): { characters: number; cost: number; withinFreeTier: boolean } {
    const characters = text.length;
    const withinFreeTier = this.monthlyUsage + characters <= PRICING.freeTier;
    const cost = withinFreeTier ? 0 : characters * PRICING.costPerChar;

    return {
      characters,
      cost,
      withinFreeTier,
    };
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): {
    monthlyUsage: number;
    freeTierLimit: number;
    percentageUsed: number;
    remainingFree: number;
    estimatedCost: number;
  } {
    const percentageUsed = (this.monthlyUsage / PRICING.freeTier) * 100;
    const remainingFree = Math.max(0, PRICING.freeTier - this.monthlyUsage);
    const overage = Math.max(0, this.monthlyUsage - PRICING.freeTier);
    const estimatedCost = overage * PRICING.costPerChar;

    return {
      monthlyUsage: this.monthlyUsage,
      freeTierLimit: PRICING.freeTier,
      percentageUsed,
      remainingFree,
      estimatedCost,
    };
  }

  /**
   * Reset monthly usage counter (call at start of each month)
   */
  resetMonthlyUsage(): void {
    this.monthlyUsage = 0;
    console.log('[ElevenLabs] Monthly usage counter reset');
  }

  /**
   * Check if ElevenLabs is available
   */
  static isAvailable(): boolean {
    return !!process.env.ELEVENLABS_API_KEY;
  }

  /**
   * Get default voices
   */
  static getDefaultVoices() {
    return DEFAULT_VOICES;
  }
}

// Singleton instance
let elevenLabsClient: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClient) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }

    elevenLabsClient = new ElevenLabsClient({
      apiKey,
      voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICES.rachel,
      model: 'eleven_turbo_v2_5',
      onUsage: (chars) => {
        console.log(`[ElevenLabs] Used ${chars} characters this request`);
      },
    });
  }

  return elevenLabsClient;
}

export { DEFAULT_VOICES, PRICING };
export type { ElevenLabsConfig, VoiceSettings, TTSRequest, TTSResponse };
