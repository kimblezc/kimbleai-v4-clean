/**
 * AI SDK Wrapper - Unified interface for all AI providers
 *
 * Uses Vercel AI SDK 4.0 to provide consistent streaming interface
 * across OpenAI, Anthropic, and Google AI models.
 *
 * @module lib/ai-sdk-wrapper
 * @version 1.0.0
 */

import { streamText, generateText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Supported providers
export type AIProvider = 'openai' | 'anthropic' | 'google';

// Supported models
export type AIModel =
  // OpenAI
  | 'gpt-5.1' | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano'
  | 'gpt-4o' | 'gpt-4o-mini'
  | 'gpt-4-turbo' | 'gpt-4'
  | 'o1' | 'o1-mini'
  // Anthropic
  | 'claude-opus-4.1' | 'claude-opus-4'
  | 'claude-sonnet-4.5' | 'claude-sonnet-4'
  | 'claude-haiku-4.5' | 'claude-haiku-3.5'
  // Google
  | 'gemini-2.5-pro' | 'gemini-2.5-flash'
  | 'gemini-2.0-pro' | 'gemini-2.0-flash';

// Model configuration
interface AIConfig {
  provider: AIProvider;
  model: AIModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// Default model mapping
const MODEL_CONFIGS: Record<AIModel, { provider: AIProvider; modelId: string }> = {
  // OpenAI
  'gpt-5.1': { provider: 'openai', modelId: 'gpt-5.1' },
  'gpt-5': { provider: 'openai', modelId: 'gpt-5' },
  'gpt-5-mini': { provider: 'openai', modelId: 'gpt-5-mini' },
  'gpt-5-nano': { provider: 'openai', modelId: 'gpt-5-nano' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'gpt-4-turbo': { provider: 'openai', modelId: 'gpt-4-turbo' },
  'gpt-4': { provider: 'openai', modelId: 'gpt-4' },
  'o1': { provider: 'openai', modelId: 'o1' },
  'o1-mini': { provider: 'openai', modelId: 'o1-mini' },

  // Anthropic
  'claude-opus-4.1': { provider: 'anthropic', modelId: 'claude-opus-4-20250514' },
  'claude-opus-4': { provider: 'anthropic', modelId: 'claude-opus-4-20250514' },
  'claude-sonnet-4.5': { provider: 'anthropic', modelId: 'claude-sonnet-4-5-20250514' },
  'claude-sonnet-4': { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' },
  'claude-haiku-4.5': { provider: 'anthropic', modelId: 'claude-haiku-4-5-20250514' },
  'claude-haiku-3.5': { provider: 'anthropic', modelId: 'claude-3-5-haiku-20241022' },

  // Google
  'gemini-2.5-pro': { provider: 'google', modelId: 'gemini-2.5-pro' },
  'gemini-2.5-flash': { provider: 'google', modelId: 'gemini-2.5-flash' },
  'gemini-2.0-pro': { provider: 'google', modelId: 'gemini-2.0-pro-002' },
  'gemini-2.0-flash': { provider: 'google', modelId: 'gemini-2.0-flash-001' },
};

/**
 * Get model provider instance
 */
function getModelProvider(model: AIModel) {
  const config = MODEL_CONFIGS[model];

  switch (config.provider) {
    case 'openai':
      return openai(config.modelId);
    case 'anthropic':
      return anthropic(config.modelId);
    case 'google':
      return google(config.modelId);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

/**
 * Stream text completion from AI model
 *
 * @example
 * ```typescript
 * const stream = await streamCompletion({
 *   model: 'gemini-2.5-flash',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   temperature: 0.7
 * });
 *
 * for await (const chunk of stream.textStream) {
 *   console.log(chunk);
 * }
 * ```
 */
export async function streamCompletion(config: AIConfig & { messages: CoreMessage[] }) {
  const { model, messages, temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = config;

  const modelProvider = getModelProvider(model);

  return streamText({
    model: modelProvider,
    messages,
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 4096,
    topP,
    frequencyPenalty,
    presencePenalty,
  });
}

/**
 * Generate text completion (non-streaming)
 *
 * @example
 * ```typescript
 * const result = await generateCompletion({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * console.log(result.text);
 * ```
 */
export async function generateCompletion(config: AIConfig & { messages: CoreMessage[] }) {
  const { model, messages, temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = config;

  const modelProvider = getModelProvider(model);

  return generateText({
    model: modelProvider,
    messages,
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 4096,
    topP,
    frequencyPenalty,
    presencePenalty,
  });
}

/**
 * Check if model is available and configured
 */
export function isModelAvailable(model: AIModel): boolean {
  const config = MODEL_CONFIGS[model];

  switch (config.provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY;
    case 'google':
      return !!process.env.GOOGLE_AI_API_KEY;
    default:
      return false;
  }
}

/**
 * Get list of all available models
 */
export function getAvailableModels(): AIModel[] {
  return Object.keys(MODEL_CONFIGS)
    .filter(model => isModelAvailable(model as AIModel))
    as AIModel[];
}

/**
 * Get model info
 */
export function getModelInfo(model: AIModel): { provider: AIProvider; modelId: string } | null {
  return MODEL_CONFIGS[model] || null;
}
