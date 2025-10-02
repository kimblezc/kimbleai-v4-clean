// lib/openai-cost-wrapper.ts
// OpenAI API wrapper with automatic cost monitoring and throttling

import OpenAI from 'openai';
import { CostMonitor } from './cost-monitor';

export interface CostMonitoredOpenAIConfig {
  apiKey: string;
  userId: string;
  enforceThrottling?: boolean;
  autoTrack?: boolean;
}

export class CostMonitoredOpenAI {
  private openai: OpenAI;
  private costMonitor: CostMonitor;
  private userId: string;
  private enforceThrottling: boolean;
  private autoTrack: boolean;

  constructor(config: CostMonitoredOpenAIConfig) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.costMonitor = CostMonitor.getInstance();
    this.userId = config.userId;
    this.enforceThrottling = config.enforceThrottling ?? true;
    this.autoTrack = config.autoTrack ?? true;
  }

  // Check if service is paused before making API call
  private async checkServiceStatus(): Promise<void> {
    if (this.enforceThrottling) {
      const isPaused = await this.costMonitor.isServicePaused(this.userId, 'openai');
      if (isPaused) {
        throw new Error('OpenAI service is currently paused due to cost limits. Please check your cost monitor dashboard.');
      }
    }
  }

  // Check per-request limits
  private async checkPerRequestLimits(estimatedTokens: number): Promise<void> {
    if (!this.enforceThrottling) return;

    const limits = await this.costMonitor.getUserLimits(this.userId);
    if (limits.perRequest.enabled) {
      if (estimatedTokens > limits.perRequest.maxTokens) {
        throw new Error(`Request would exceed per-request token limit (${estimatedTokens} > ${limits.perRequest.maxTokens})`);
      }

      // Estimate cost based on tokens (rough estimate for pre-check)
      const estimatedCost = estimatedTokens * 0.00001; // Conservative estimate
      if (estimatedCost > limits.perRequest.maxCost) {
        throw new Error(`Request would exceed per-request cost limit ($${estimatedCost.toFixed(4)} > $${limits.perRequest.maxCost})`);
      }
    }
  }

  // Record usage after API call
  private async recordUsage(
    model: string,
    operation: 'completion' | 'embedding' | 'transcription' | 'tts',
    inputTokens: number,
    outputTokens: number,
    duration?: number,
    characters?: number,
    metadata?: any
  ): Promise<void> {
    if (!this.autoTrack) return;

    try {
      const costs = this.costMonitor.calculateOpenAICost(model, inputTokens, outputTokens, duration, characters);

      await this.costMonitor.recordUsage({
        userId: this.userId,
        service: 'openai',
        model,
        operation,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        inputCost: costs.inputCost,
        outputCost: costs.outputCost,
        totalCost: costs.totalCost,
        duration,
        characters,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          tracked_by: 'cost-wrapper'
        }
      });
    } catch (error) {
      console.error('[COST-WRAPPER] Failed to record usage:', error);
      // Don't throw - usage recording failure shouldn't break the API call
    }
  }

  // Estimate tokens for text (rough estimation)
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  // Chat Completions with cost monitoring
  async chatCompletions(params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    await this.checkServiceStatus();

    // Estimate input tokens
    const messageText = params.messages.map(m =>
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    ).join(' ');
    const estimatedInputTokens = this.estimateTokens(messageText);

    await this.checkPerRequestLimits(estimatedInputTokens + (params.max_completion_tokens || 1000));

    const startTime = Date.now();

    try {
      const completion = await this.openai.chat.completions.create(params);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Record actual usage
      if (completion.usage) {
        await this.recordUsage(
          params.model,
          'completion',
          completion.usage.prompt_tokens,
          completion.usage.completion_tokens,
          undefined,
          undefined,
          {
            conversation_context: params.messages.length,
            processing_time_ms: duration,
            max_tokens: params.max_completion_tokens,
            temperature: params.temperature,
            finish_reason: completion.choices[0]?.finish_reason
          }
        );
      }

      return completion;
    } catch (error) {
      // Record failed attempt (with estimated tokens)
      if (this.autoTrack) {
        await this.recordUsage(
          params.model,
          'completion',
          estimatedInputTokens,
          0,
          undefined,
          undefined,
          {
            error: true,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processing_time_ms: Date.now() - startTime
          }
        );
      }
      throw error;
    }
  }

  // Streaming chat completions with cost monitoring
  async chatCompletionsStream(params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming): Promise<any> {
    await this.checkServiceStatus();

    const messageText = params.messages.map(m =>
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    ).join(' ');
    const estimatedInputTokens = this.estimateTokens(messageText);

    await this.checkPerRequestLimits(estimatedInputTokens + (params.max_completion_tokens || 1000));

    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await this.openai.chat.completions.create(params);

      // Return a wrapped stream that tracks tokens
      return new Proxy(stream, {
        get: (target, prop) => {
          if (prop === Symbol.asyncIterator) {
            return async function* () {
              try {
                for await (const chunk of target) {
                  // Track tokens from chunk
                  if (chunk.usage) {
                    inputTokens = chunk.usage.prompt_tokens;
                    outputTokens = chunk.usage.completion_tokens;
                  }
                  yield chunk;
                }
              } finally {
                // Record usage when stream completes
                const duration = Date.now() - startTime;
                await this.recordUsage(
                  params.model,
                  'completion',
                  inputTokens || estimatedInputTokens,
                  outputTokens,
                  undefined,
                  undefined,
                  {
                    streaming: true,
                    conversation_context: params.messages.length,
                    processing_time_ms: duration,
                    max_tokens: params.max_completion_tokens,
                    temperature: params.temperature
                  }
                );
              }
            };
          }
          return target[prop as keyof typeof target];
        }
      });
    } catch (error) {
      // Record failed attempt
      if (this.autoTrack) {
        await this.recordUsage(
          params.model,
          'completion',
          estimatedInputTokens,
          0,
          undefined,
          undefined,
          {
            error: true,
            streaming: true,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processing_time_ms: Date.now() - startTime
          }
        );
      }
      throw error;
    }
  }

  // Embeddings with cost monitoring
  async embeddings(params: OpenAI.Embeddings.EmbeddingCreateParams): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
    await this.checkServiceStatus();

    // Estimate tokens
    const inputText = Array.isArray(params.input) ? params.input.join(' ') : params.input;
    const estimatedTokens = this.estimateTokens(inputText);

    await this.checkPerRequestLimits(estimatedTokens);

    const startTime = Date.now();

    try {
      const embedding = await this.openai.embeddings.create(params);

      const duration = Date.now() - startTime;

      // Record usage
      await this.recordUsage(
        params.model,
        'embedding',
        embedding.usage.prompt_tokens,
        0, // Embeddings don't have output tokens
        undefined,
        undefined,
        {
          dimensions: params.dimensions,
          processing_time_ms: duration,
          input_type: Array.isArray(params.input) ? 'array' : 'string',
          input_count: Array.isArray(params.input) ? params.input.length : 1
        }
      );

      return embedding;
    } catch (error) {
      // Record failed attempt
      if (this.autoTrack) {
        await this.recordUsage(
          params.model,
          'embedding',
          estimatedTokens,
          0,
          undefined,
          undefined,
          {
            error: true,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processing_time_ms: Date.now() - startTime
          }
        );
      }
      throw error;
    }
  }

  // Audio transcription with cost monitoring
  async audioTranscription(params: OpenAI.Audio.Transcriptions.TranscriptionCreateParams): Promise<OpenAI.Audio.Transcriptions.Transcription> {
    await this.checkServiceStatus();

    const startTime = Date.now();

    try {
      const transcription = await this.openai.audio.transcriptions.create(params);

      const duration = Date.now() - startTime;

      // For Whisper, we estimate based on audio duration (if available)
      const audioDurationSeconds = transcription.duration || 60; // Default if not available

      await this.recordUsage(
        'whisper-1',
        'transcription',
        0, // Whisper doesn't report tokens
        0,
        audioDurationSeconds,
        undefined,
        {
          language: params.language,
          response_format: params.response_format,
          processing_time_ms: duration,
          audio_duration_seconds: audioDurationSeconds,
          transcript_length: transcription.text.length
        }
      );

      return transcription;
    } catch (error) {
      // Record failed attempt
      if (this.autoTrack) {
        await this.recordUsage(
          'whisper-1',
          'transcription',
          0,
          0,
          undefined,
          undefined,
          {
            error: true,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processing_time_ms: Date.now() - startTime
          }
        );
      }
      throw error;
    }
  }

  // Text-to-speech with cost monitoring
  async speechCreate(params: OpenAI.Audio.Speech.SpeechCreateParams): Promise<Response> {
    await this.checkServiceStatus();

    const inputLength = params.input.length;
    await this.checkPerRequestLimits(inputLength / 4); // Rough estimation

    const startTime = Date.now();

    try {
      const response = await this.openai.audio.speech.create(params);

      const duration = Date.now() - startTime;

      await this.recordUsage(
        params.model,
        'tts',
        0,
        0,
        undefined,
        inputLength,
        {
          voice: params.voice,
          response_format: params.response_format,
          speed: params.speed,
          processing_time_ms: duration,
          input_characters: inputLength
        }
      );

      return response;
    } catch (error) {
      // Record failed attempt
      if (this.autoTrack) {
        await this.recordUsage(
          params.model,
          'tts',
          0,
          0,
          undefined,
          inputLength,
          {
            error: true,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processing_time_ms: Date.now() - startTime
          }
        );
      }
      throw error;
    }
  }

  // Get the underlying OpenAI client (for advanced usage)
  getClient(): OpenAI {
    return this.openai;
  }

  // Get cost monitor instance
  getCostMonitor(): CostMonitor {
    return this.costMonitor;
  }

  // Manual usage recording (for custom operations)
  async recordCustomUsage(
    model: string,
    operation: string,
    inputTokens: number,
    outputTokens: number,
    metadata?: any
  ): Promise<void> {
    await this.recordUsage(
      model,
      operation as any,
      inputTokens,
      outputTokens,
      undefined,
      undefined,
      { ...metadata, manual: true }
    );
  }
}

// Helper function to create a cost-monitored OpenAI client
export function createCostMonitoredOpenAI(config: CostMonitoredOpenAIConfig): CostMonitoredOpenAI {
  return new CostMonitoredOpenAI(config);
}

// Export for backward compatibility
export default CostMonitoredOpenAI;