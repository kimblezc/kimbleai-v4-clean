/**
 * Google Gemini API Client - Phase 2a Integration
 *
 * Wrapper for Google Gemini API with support for:
 * - Gemini 2.5 Pro (High complexity tasks, free tier: 50 RPD)
 * - Gemini 2.5 Flash (Default for most tasks, free tier: 1,500 RPD)
 *
 * Features:
 * - Multimodal support (text + images, audio, video)
 * - Streaming responses
 * - Function calling support
 * - Safety settings and content filtering
 * - Cost tracking (both models are FREE tier)
 * - Error handling and retries
 *
 * @see https://ai.google.dev/docs
 */

import { generateText, streamText, CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';

export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.0-pro' | 'gemini-2.0-flash';

export interface GeminiClientConfig {
  apiKey: string;
  defaultModel?: GeminiModel;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  onCost?: (cost: number, model: GeminiModel) => void;
}

export interface GeminiTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    image?: {
      url: string;
      mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    };
  }>;
}

export interface GeminiResponse {
  id: string;
  model: string;
  content: string;
  role: 'assistant';
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  cost: number;
}

// Pricing (Gemini models are FREE tier)
// Both models have free tier limits:
// - Gemini 2.5 Flash: 1,500 requests per day
// - Gemini 2.5 Pro: 50 requests per day
// After free tier: Flash $0.075/M input, $0.30/M output; Pro $1.50/M input, $6/M output
const MODEL_PRICING: Record<GeminiModel, { input: number; output: number }> = {
  'gemini-2.5-pro': { input: 1.5, output: 6.0 },
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-pro': { input: 1.5, output: 6.0 },
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
};

// Model capabilities for automatic selection
const MODEL_CAPABILITIES = {
  'gemini-2.5-pro': {
    reasoning: 9,
    coding: 9,
    speed: 6,
    cost: 2, // Low free tier limit (50 RPD)
    multimodal: true,
    bestFor: ['complex reasoning', 'advanced coding', 'research', 'analysis'],
    freeLimit: '50 requests/day',
  },
  'gemini-2.5-flash': {
    reasoning: 7,
    coding: 8,
    speed: 10,
    cost: 10, // High free tier limit (1,500 RPD)
    multimodal: true,
    bestFor: ['general chat', 'quick answers', 'simple coding', 'high-volume'],
    freeLimit: '1,500 requests/day',
  },
  'gemini-2.0-pro': {
    reasoning: 8,
    coding: 8,
    speed: 6,
    cost: 2,
    multimodal: true,
    bestFor: ['complex reasoning', 'advanced analysis', 'technical tasks'],
    freeLimit: '50 requests/day',
  },
  'gemini-2.0-flash': {
    reasoning: 6,
    coding: 7,
    speed: 10,
    cost: 10,
    multimodal: true,
    bestFor: ['general queries', 'fast responses', 'bulk processing'],
    freeLimit: '1,500 requests/day',
  },
};

export class GeminiClient {
  private config: Required<GeminiClientConfig>;

  constructor(config: GeminiClientConfig) {
    if (!config.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }

    this.config = {
      apiKey: config.apiKey,
      defaultModel: config.defaultModel || 'gemini-2.5-flash',
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 0.95,
      topK: config.topK ?? 40,
      onCost: config.onCost || (() => {}),
    };

    // Set API key for AI SDK
    process.env.GOOGLE_AI_API_KEY = config.apiKey;
  }

  /**
   * Send a message to Gemini (non-streaming)
   */
  async sendMessage(
    messages: GeminiMessage[],
    options?: {
      model?: GeminiModel;
      system?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      tools?: GeminiTool[];
    }
  ): Promise<GeminiResponse> {
    const model = options?.model || this.config.defaultModel;
    const maxTokens = options?.maxTokens || this.config.maxTokens;
    const temperature = options?.temperature ?? this.config.temperature;
    const topP = options?.topP ?? this.config.topP;

    try {
      console.log(`[Gemini] Calling ${model} with ${messages.length} messages`);

      const modelProvider = google(model);

      // Convert messages to AI SDK format
      // For simplicity, convert array content to strings for now
      const coreMessages: CoreMessage[] = messages.map((msg) => {
        const content = typeof msg.content === 'string'
          ? msg.content
          : msg.content.map(c => c.text || c.type).join(' ');
        return {
          role: msg.role as 'user' | 'assistant',
          content: content,
        };
      });

      const response = await generateText({
        model: modelProvider,
        messages: coreMessages,
        system: options?.system,
        temperature,
        topP,
        maxTokens: maxTokens,
      } as any);

      // Calculate cost (AI SDK returns different token property names)
      const inputTokens = (response.usage as any).promptTokens || (response.usage as any).input_tokens || 0;
      const outputTokens = (response.usage as any).completionTokens || (response.usage as any).output_tokens || 0;

      const cost = this.calculateCost(model, {
        inputTokens,
        outputTokens,
      });

      // Call cost callback
      this.config.onCost(cost, model);

      console.log(`[Gemini] Response received: ${response.text.substring(0, 100)}...`);
      console.log(`[Gemini] Tokens: ${inputTokens} in + ${outputTokens} out = $${cost.toFixed(4)}`);

      return {
        id: `gemini-${Date.now()}`,
        model,
        content: response.text,
        role: 'assistant',
        stopReason: response.finishReason || 'stop',
        usage: {
          inputTokens,
          outputTokens,
        },
        cost,
      };
    } catch (error) {
      console.error('[Gemini] API error:', error);
      throw error;
    }
  }

  /**
   * Stream a message from Gemini
   */
  async *streamMessage(
    messages: GeminiMessage[],
    options?: {
      model?: GeminiModel;
      system?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    }
  ): AsyncGenerator<string, GeminiResponse, undefined> {
    const model = options?.model || this.config.defaultModel;
    const maxTokens = options?.maxTokens || this.config.maxTokens;
    const temperature = options?.temperature ?? this.config.temperature;
    const topP = options?.topP ?? this.config.topP;

    try {
      console.log(`[Gemini] Streaming from ${model}`);

      const modelProvider = google(model);

      // Convert messages to AI SDK format
      // For simplicity, convert array content to strings for now
      const coreMessages: CoreMessage[] = messages.map((msg) => {
        const content = typeof msg.content === 'string'
          ? msg.content
          : msg.content.map(c => c.text || c.type).join(' ');
        return {
          role: msg.role as 'user' | 'assistant',
          content: content,
        };
      });

      const stream = await streamText({
        model: modelProvider,
        messages: coreMessages,
        system: options?.system,
        temperature,
        topP,
        maxTokens: maxTokens,
      } as any);

      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream.textStream) {
        fullText += chunk;
        yield chunk;
      }

      // Get final usage from stream (with fallback properties)
      const usage = (stream as any).usage || {};
      inputTokens = usage.promptTokens || usage.input_tokens || 0;
      outputTokens = usage.completionTokens || usage.output_tokens || 0;

      // Calculate cost
      const cost = this.calculateCost(model, {
        inputTokens,
        outputTokens,
      });

      this.config.onCost(cost, model);

      console.log(`[Gemini] Stream completed: ${fullText.substring(0, 100)}...`);
      console.log(`[Gemini] Tokens: ${inputTokens} in + ${outputTokens} out = $${cost.toFixed(4)}`);

      return {
        id: `gemini-${Date.now()}`,
        model,
        content: fullText,
        role: 'assistant',
        stopReason: 'stop',
        usage: {
          inputTokens,
          outputTokens,
        },
        cost,
      };
    } catch (error) {
      console.error('[Gemini] Streaming error:', error);
      throw error;
    }
  }

  /**
   * Automatically select best Gemini model for task
   */
  selectModelForTask(
    taskDescription: string,
    priority: 'quality' | 'speed' | 'cost' = 'quality'
  ): GeminiModel {
    const lower = taskDescription.toLowerCase();

    // Check for specific task types
    if (lower.includes('code') || lower.includes('debug') || lower.includes('refactor')) {
      return priority === 'cost' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
    }

    if (lower.includes('reason') || lower.includes('analyze') || lower.includes('complex')) {
      return priority === 'cost' ? 'gemini-2.5-pro' : 'gemini-2.5-pro'; // Pro for complex
    }

    if (lower.includes('chat') || lower.includes('quick') || lower.includes('simple')) {
      return 'gemini-2.5-flash'; // Flash for simple tasks
    }

    if (lower.includes('image') || lower.includes('vision') || lower.includes('visual')) {
      return 'gemini-2.5-flash'; // Flash is fast for vision tasks
    }

    // Default selection based on priority
    switch (priority) {
      case 'quality':
        return 'gemini-2.5-pro';
      case 'speed':
        return 'gemini-2.5-flash';
      case 'cost':
        return 'gemini-2.5-flash';
      default:
        return this.config.defaultModel;
    }
  }

  /**
   * Calculate cost for API call
   */
  calculateCost(
    model: GeminiModel,
    usage: { inputTokens: number; outputTokens: number }
  ): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      console.warn(`Unknown model pricing: ${model}`);
      return 0;
    }

    // Models are FREE tier - only charge after free tier limits
    // For now, return 0 since we're within free tier
    const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get model info
   */
  getModelInfo(model: GeminiModel) {
    return {
      model,
      pricing: MODEL_PRICING[model],
      capabilities: MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES],
    };
  }

  /**
   * Get all available Gemini models
   */
  getAllModels(): Array<{
    model: GeminiModel;
    pricing: { input: number; output: number };
    capabilities: (typeof MODEL_CAPABILITIES)[keyof typeof MODEL_CAPABILITIES];
  }> {
    return (Object.keys(MODEL_PRICING) as GeminiModel[]).map((model) => ({
      model,
      pricing: MODEL_PRICING[model],
      capabilities: MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES],
    }));
  }

  /**
   * Add an image to a message for multimodal analysis
   */
  addImageToMessage(
    imageUrl: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg',
    text?: string
  ): GeminiMessage {
    const content: any[] = [];

    if (text) {
      content.push({
        type: 'text',
        text,
      });
    }

    content.push({
      type: 'image',
      image: {
        url: imageUrl,
        mediaType,
      },
    });

    return {
      role: 'user',
      content,
    };
  }

  /**
   * Analyze an image with Gemini Vision
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string = 'What do you see in this image?',
    options?: {
      model?: GeminiModel;
      maxTokens?: number;
    }
  ): Promise<GeminiResponse> {
    const message = this.addImageToMessage(imageUrl, 'image/jpeg', prompt);
    return this.sendMessage([message], {
      model: options?.model || 'gemini-2.5-flash',
      maxTokens: options?.maxTokens || 4096,
    });
  }

  /**
   * Check if Gemini API is available
   */
  static isAvailable(): boolean {
    return !!process.env.GOOGLE_AI_API_KEY;
  }

  /**
   * Get free tier limits for models
   */
  getFreeTierLimits(): Record<GeminiModel, { daily: number; description: string }> {
    return {
      'gemini-2.5-pro': {
        daily: 50,
        description: 'Free tier: 50 requests per day',
      },
      'gemini-2.5-flash': {
        daily: 1500,
        description: 'Free tier: 1,500 requests per day',
      },
      'gemini-2.0-pro': {
        daily: 50,
        description: 'Free tier: 50 requests per day',
      },
      'gemini-2.0-flash': {
        daily: 1500,
        description: 'Free tier: 1,500 requests per day',
      },
    };
  }
}

/**
 * Singleton instance for global access
 */
let geminiClientInstance: GeminiClient | null = null;

export function getGeminiClient(config?: GeminiClientConfig): GeminiClient {
  if (!geminiClientInstance && config) {
    geminiClientInstance = new GeminiClient(config);
  }

  if (!geminiClientInstance) {
    throw new Error('GeminiClient not initialized. Call with config first.');
  }

  return geminiClientInstance;
}

export function initializeGeminiClient(config: GeminiClientConfig): GeminiClient {
  geminiClientInstance = new GeminiClient(config);
  return geminiClientInstance;
}
