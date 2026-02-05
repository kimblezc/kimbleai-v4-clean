/**
 * AI Service - Unified interface for all AI operations
 *
 * Features:
 * - Smart model routing (automatic or manual)
 * - Cost tracking and budget enforcement
 * - Streaming responses
 * - Multimodal support (text, images, audio, video)
 * - Context gathering and RAG
 * - Error handling and retries
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText, embed } from 'ai';
import { ModelRouter, TaskType, type RoutingContext } from './model-router';
import { CostTracker, type UsageMetrics } from './cost-tracker';
import { createClient } from '@supabase/supabase-js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'audio';
    url: string;
    mimeType?: string;
    analysis?: string;
  }>;
}

export interface ChatOptions {
  model?: string;        // Manual override
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  conversationId?: string;
  projectId?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
  reasoning?: string;  // Why this model was selected
}

export class AIService {
  private router: ModelRouter;
  private costTracker: CostTracker;
  private supabase: ReturnType<typeof createClient>;

  // AI SDK providers
  private openai;
  private anthropic;
  private google;

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.router = new ModelRouter();
    this.costTracker = new CostTracker(supabaseClient);
    this.supabase = supabaseClient;

    // Initialize providers
    this.openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
  }

  /**
   * Enable manual model selection
   */
  setManualModel(model: string) {
    this.router.setManualMode(model);
  }

  /**
   * Enable automatic model selection
   */
  setAutoModel() {
    this.router.setAutoMode();
  }

  /**
   * Chat completion (streaming or non-streaming)
   */
  async chat(params: {
    userId: string;
    messages: ChatMessage[];
    options?: ChatOptions;
  }) {
    const { userId, messages, options = {} } = params;

    // Determine task type from message content
    const taskType = this.inferTaskType(messages);

    // Calculate input size
    const inputSize = messages.reduce((sum, msg) => sum + msg.content.length, 0);

    // Route to best model
    const routingContext: RoutingContext = {
      taskType,
      inputSize,
      userPreference: options.model,
      requiresSpeed: options.stream,
    };

    const selection = this.router.selectModel(routingContext);

    // Log model selection
    console.log('[AI Service] Model selected:', {
      provider: selection.provider,
      model: selection.model,
      reason: selection.reason,
      taskType,
    });

    // Check budget before proceeding
    const estimatedCost = this.router.estimateCost(routingContext);
    const withinBudget = await this.costTracker.checkBudget(userId, estimatedCost);

    if (!withinBudget) {
      throw new Error('Budget exceeded. Please increase your monthly budget or wait until next month.');
    }

    // Get the appropriate model provider
    const model = this.getModel(selection.provider, selection.model);

    // Convert messages to AI SDK format with model context
    const formattedMessages = await this.formatMessages(messages);

    // Add system message with model info (helps AI respond correctly when asked about itself)
    const systemMessage = {
      role: 'system' as const,
      content: `You are KimbleAI, powered by ${selection.model} from ${selection.provider}. When asked about your model, respond with: "I'm running on ${selection.provider}'s ${selection.model} model." Be helpful, concise, and accurate.`,
    };
    const messagesWithSystem = [systemMessage, ...formattedMessages];

    try {
      const startTime = Date.now();

      if (options.stream) {
        // Streaming response
        const result = await streamText({
          model,
          messages: messagesWithSystem,
          temperature: options.temperature,
          ...(options.maxTokens && { maxTokens: options.maxTokens }),
        });

        // Track usage (async, non-blocking)
        this.trackStreamingUsage(
          userId,
          selection,
          result,
          startTime,
          options.conversationId,
          options.projectId
        );

        // Return stream with model selection info for Task 6 (show model used)
        return {
          ...result,
          modelUsed: selection.model,
          providerUsed: selection.provider,
          selectionReason: selection.reason,
        };
      } else {
        // Non-streaming response
        const result = await generateText({
          model,
          messages: messagesWithSystem,
          temperature: options.temperature,
          ...(options.maxTokens && { maxTokens: options.maxTokens }),
        });

        // Calculate cost
        const durationMs = Date.now() - startTime;
        const usage = result.usage as any; // Type assertion for SDK version compatibility
        const metrics: UsageMetrics = {
          tokensInput: usage.promptTokens || 0,
          tokensOutput: usage.completionTokens || 0,
          tokensTotal: usage.totalTokens || 0,
          durationMs,
          costUsd: this.costTracker.calculateCost(
            selection.provider,
            selection.model,
            {
              tokensInput: usage.promptTokens || 0,
              tokensOutput: usage.completionTokens || 0,
            }
          ).totalCost,
        };

        // Log usage
        await this.costTracker.logUsage({
          userId,
          provider: selection.provider,
          model: selection.model,
          operation: 'chat',
          metrics,
          conversationId: options.conversationId,
          projectId: options.projectId,
        });

        // Log routing decision
        await this.costTracker.logRouting({
          userId,
          taskType,
          inputSize,
          selectedModel: selection.model,
          selectionReason: selection.reason,
          wasManual: !!options.model,
          metrics,
        });

        // Check for budget alerts
        await this.costTracker.checkAndAlertBudget(userId, metrics.costUsd);

        return {
          content: result.text,
          model: selection.model,
          tokensUsed: result.usage.totalTokens,
          costUsd: metrics.costUsd,
          reasoning: selection.reason,
        };
      }
    } catch (error) {
      console.error('[AI Service] Chat error:', error);
      throw error;
    }
  }

  /**
   * Analyze image (vision)
   */
  async analyzeImage(params: {
    userId: string;
    imageUrl: string;
    prompt: string;
    options?: ChatOptions;
  }): Promise<ChatResponse> {
    const { userId, imageUrl, prompt, options = {} } = params;

    // Route to best vision model
    const selection = this.router.selectModel({
      taskType: 'vision',
      inputSize: prompt.length,
      userPreference: options.model,
    });

    const model = this.getModel(selection.provider, selection.model);

    const startTime = Date.now();

    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imageUrl },
          ],
        },
      ],
      temperature: options.temperature,
    });

    const durationMs = Date.now() - startTime;

    // Calculate cost (vision models charge per image + tokens)
    const usage = result.usage as any; // Type assertion for SDK version compatibility
    const metrics: UsageMetrics = {
      tokensInput: usage.promptTokens || 0,
      tokensOutput: usage.completionTokens || 0,
      tokensTotal: usage.totalTokens || 0,
      durationMs,
      costUsd: this.costTracker.calculateCost(
        selection.provider,
        selection.model,
        {
          tokensInput: usage.promptTokens || 0,
          tokensOutput: usage.completionTokens || 0,
        }
      ).totalCost,
    };

    // Log usage
    await this.costTracker.logUsage({
      userId,
      provider: selection.provider,
      model: selection.model,
      operation: 'vision',
      metrics,
      conversationId: options.conversationId,
      projectId: options.projectId,
    });

    return {
      content: result.text,
      model: selection.model,
      tokensUsed: usage.totalTokens || 0,
      costUsd: metrics.costUsd,
      reasoning: selection.reason,
    };
  }

  /**
   * Transcribe audio
   */
  async transcribeAudio(params: {
    userId: string;
    audioBuffer: Buffer;
    durationSeconds: number;
    options?: {
      language?: string;
      diarize?: boolean;
      speakerDiarization?: boolean; // Alias for diarize
      projectId?: string;
    };
  }): Promise<{
    transcript: string;
    durationSeconds: number;
    speakers?: Array<{ speaker: string; text: string }>;
    words?: Array<{ word: string; start: number; end: number }>;
    confidence: number;
    costUsd: number;
  }> {
    const { userId, audioBuffer, durationSeconds, options = {} } = params;

    // Support both diarize and speakerDiarization
    const enableDiarization = options.diarize || options.speakerDiarization || false;

    // Route to best transcription service
    const selection = this.router.selectModel({
      taskType: 'transcription',
      inputSize: durationSeconds,
    });

    const startTime = Date.now();

    let transcript: string;
    let speakers: Array<{ speaker: string; text: string }> | undefined;
    let words: Array<{ word: string; start: number; end: number }> | undefined;
    let confidence: number;

    if (selection.provider === 'deepgram') {
      // Use Deepgram Nova-3
      const result = await this.transcribeWithDeepgram(
        audioBuffer,
        options.language || 'en',
        enableDiarization
      );

      transcript = result.transcript;
      speakers = result.speakers;
      confidence = result.confidence;

      // Extract word timings if available
      words = result.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      }));
    } else {
      // Fallback to OpenAI Whisper
      const result = await this.transcribeWithWhisper(audioBuffer, options.language);
      transcript = result.transcript;
      confidence = 0.95;  // Whisper doesn't provide confidence
    }

    const durationMs = Date.now() - startTime;

    // Calculate cost
    const costBreakdown = this.costTracker.calculateCost(
      selection.provider,
      selection.model,
      { durationMs: durationSeconds * 1000 }
    );

    // Log usage
    await this.costTracker.logUsage({
      userId,
      provider: selection.provider,
      model: selection.model,
      operation: 'transcription',
      metrics: {
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        durationMs,
        costUsd: costBreakdown.totalCost,
      },
      projectId: options.projectId,
    });

    return {
      transcript,
      durationSeconds,
      speakers,
      words,
      confidence,
      costUsd: costBreakdown.totalCost,
    };
  }

  /**
   * Generate embedding (with cost tracking)
   */
  async generateEmbedding(params: {
    userId: string;
    text: string;
  }): Promise<{
    embedding: number[];
    costUsd: number;
  }> {
    const { userId, text } = params;

    const model = this.openai.embedding('text-embedding-3-small');

    const startTime = Date.now();

    const result = await embed({
      model,
      value: text,
    });

    const durationMs = Date.now() - startTime;

    // Calculate cost (embeddings are cheap: $0.00002 / 1K tokens)
    const tokens = Math.ceil(text.length / 4);
    const costUsd = (tokens / 1000) * 0.00002;

    // Log usage
    await this.costTracker.logUsage({
      userId,
      provider: 'openai',
      model: 'text-embedding-3-small',
      operation: 'embedding',
      metrics: {
        tokensInput: tokens,
        tokensOutput: 0,
        tokensTotal: tokens,
        durationMs,
        costUsd,
      },
    });

    return {
      embedding: result.embedding,
      costUsd,
    };
  }

  /**
   * Extract text from file (PDF, images, documents)
   */
  async extractTextFromFile(params: {
    userId: string;
    fileUrl: string;
    mimeType: string;
  }): Promise<{
    text: string;
    costUsd: number;
  }> {
    const { userId, fileUrl, mimeType } = params;

    // For images (PDFs, screenshots, photos), use vision model
    if (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf'
    ) {
      const result = await this.analyzeImage({
        userId,
        imageUrl: fileUrl,
        prompt: 'Extract all text from this image/document. Return only the extracted text, preserving formatting and structure where possible.',
      });

      return {
        text: result.content,
        costUsd: result.costUsd,
      };
    }

    // For text files, fetch and return content
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      const response = await fetch(fileUrl);
      const text = await response.text();

      return {
        text,
        costUsd: 0, // No AI cost for text files
      };
    }

    // For other file types, return empty
    return {
      text: '',
      costUsd: 0,
    };
  }

  /**
   * Summarize text
   */
  async summarizeText(params: {
    userId: string;
    text: string;
    maxLength?: number;
  }): Promise<{
    summary: string;
    costUsd: number;
  }> {
    const { userId, text, maxLength = 500 } = params;

    // Route to best model for summarization
    const selection = this.router.selectModel({
      taskType: 'chat',
      inputSize: text.length,
    });

    const model = this.getModel(selection.provider, selection.model);

    const startTime = Date.now();

    const maxTokens = Math.ceil(maxLength / 4);
    const result = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a text summarization assistant. Summarize the following text in ${maxLength} characters or less. Focus on the key points and main ideas.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      ...(maxTokens && { maxTokens }),
    });

    const durationMs = Date.now() - startTime;

    const usage = result.usage as any; // Type assertion for SDK version compatibility
    const metrics: UsageMetrics = {
      tokensInput: usage.promptTokens || 0,
      tokensOutput: usage.completionTokens || 0,
      tokensTotal: usage.totalTokens || 0,
      durationMs,
      costUsd: this.costTracker.calculateCost(
        selection.provider,
        selection.model,
        {
          tokensInput: usage.promptTokens || 0,
          tokensOutput: usage.completionTokens || 0,
        }
      ).totalCost,
    };

    // Log usage
    await this.costTracker.logUsage({
      userId,
      provider: selection.provider,
      model: selection.model,
      operation: 'summarization',
      metrics,
    });

    return {
      summary: result.text,
      costUsd: metrics.costUsd,
    };
  }

  /**
   * Batch generate embeddings
   */
  async generateEmbeddings(params: { userId: string; texts: string[] }): Promise<Array<{ embedding: number[]; costUsd: number }>> {
    const { userId, texts } = params;
    // Process in batches of 20 (OpenAI limit)
    const batchSize = 20;
    const embeddings: Array<{ embedding: number[]; costUsd: number }> = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding({ userId, text }))
      );
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Semantic search across all content
   */
  async semanticSearch(params: {
    userId: string;
    query: string;
    projectId?: string;
    contentTypes?: Array<'message' | 'file' | 'audio' | 'knowledge'>;
    limit?: number;
  }): Promise<Array<{
    id: string;
    type: string;
    content: string;
    createdAt: Date;
    similarity: number;
  }>> {
    const { userId, query, projectId, limit = 20 } = params;

    // Generate embedding for query
    const embeddingResult = await this.generateEmbedding({ userId, text: query });

    // Search database
    const { data, error } = await (this.supabase as any).rpc('search_all_content', {
      query_embedding: embeddingResult.embedding,
      user_id_filter: userId,
      project_id_filter: projectId,
      similarity_threshold: 0.7,
      max_results: limit,
    });

    if (error) throw error;

    return data || [];
  }

  /**
   * Get model info for UI
   */
  getAvailableModels() {
    return this.router.getAvailableModels();
  }

  /**
   * Get recommended models for task
   */
  getRecommendedModels(taskType: TaskType) {
    return this.router.getRecommendedModels(taskType);
  }

  /**
   * Get cost breakdown
   */
  async getCostAnalytics(userId: string) {
    return {
      budgetStatus: await this.costTracker.getBudgetStatus(userId),
      byProvider: await this.costTracker.getCostBreakdownByProvider(userId),
      byModel: await this.costTracker.getCostBreakdownByModel(userId),
      dailyTrend: await this.costTracker.getDailyCostTrend(userId),
      routingStats: await this.costTracker.getRoutingStats(userId),
    };
  }

  // =====================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================

  /**
   * Infer task type from messages
   */
  private inferTaskType(messages: ChatMessage[]): TaskType {
    const lastMessage = messages[messages.length - 1];

    // Check for images
    if (lastMessage.attachments?.some(a => a.type === 'image')) {
      // Check if it's code-related
      if (lastMessage.content.match(/code|screenshot|ui|interface/i)) {
        return 'code-vision';
      }
      return 'vision';
    }

    // Check for reasoning keywords
    if (lastMessage.content.match(/analyze|calculate|solve|prove|reason|explain why/i)) {
      return 'reasoning';
    }

    // Check for creative keywords
    if (lastMessage.content.match(/write|create|story|poem|idea|brainstorm/i)) {
      return 'creative';
    }

    // Default to chat
    return 'chat';
  }

  /**
   * Get model from provider
   * Updated 2026-02-04 with GPT-5.2 as default
   */
  private getModel(provider: string, modelName: string) {
    switch (provider) {
      case 'openai':
        return this.openai(modelName);
      case 'anthropic':
        return this.anthropic(modelName);
      case 'google':
        return this.google(modelName);
      default:
        return this.openai('gpt-5.2');
    }
  }

  /**
   * Format messages for AI SDK
   */
  private async formatMessages(messages: ChatMessage[]) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Track streaming usage (async)
   */
  private async trackStreamingUsage(
    userId: string,
    selection: any,
    result: any,
    startTime: number,
    conversationId?: string,
    projectId?: string
  ) {
    try {
      // Wait for stream to finish
      const fullText = await result.text;
      const durationMs = Date.now() - startTime;

      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const tokensUsed = Math.ceil(fullText.length / 4);

      const metrics: UsageMetrics = {
        tokensInput: 0,  // Not available in streaming
        tokensOutput: tokensUsed,
        tokensTotal: tokensUsed,
        durationMs,
        costUsd: this.costTracker.calculateCost(
          selection.provider,
          selection.model,
          { tokensOutput: tokensUsed }
        ).totalCost,
      };

      await this.costTracker.logUsage({
        userId,
        provider: selection.provider,
        model: selection.model,
        operation: 'chat',
        metrics,
        conversationId,
        projectId,
      });
    } catch (error) {
      console.error('[AI Service] Error tracking streaming usage:', error);
    }
  }

  /**
   * Transcribe with Deepgram Nova-3
   */
  private async transcribeWithDeepgram(
    audioBuffer: Buffer,
    language: string,
    speakerDiarization: boolean
  ): Promise<{
    transcript: string;
    speakers?: Array<{ speaker: string; text: string }>;
    words?: Array<any>;
    confidence: number;
  }> {
    const { createClient } = await import('@deepgram/sdk');

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-3',
        language,
        smart_format: true,
        diarize: speakerDiarization,
        punctuate: true,
        paragraphs: true,
      }
    );

    if (!result) {
      throw new Error('Transcription failed: no result returned');
    }

    const channel = result.results?.channels[0];
    const alternative = channel?.alternatives[0];

    const transcript = alternative?.transcript || '';
    const confidence = alternative?.confidence || 0;
    const words = alternative?.words;

    let speakers: Array<{ speaker: string; text: string }> | undefined;

    if (speakerDiarization && alternative?.words) {
      // Group words by speaker
      speakers = [];
      let currentSpeaker: number | null = null;
      let currentText = '';

      for (const word of alternative.words) {
        const wordSpeaker = word.speaker ?? null;
        if (wordSpeaker !== currentSpeaker) {
          if (currentSpeaker !== null) {
            speakers.push({
              speaker: `Speaker ${currentSpeaker}`,
              text: currentText.trim(),
            });
          }
          currentSpeaker = wordSpeaker;
          currentText = '';
        }
        currentText += word.punctuated_word + ' ';
      }

      if (currentSpeaker !== null) {
        speakers.push({
          speaker: `Speaker ${currentSpeaker}`,
          text: currentText.trim(),
        });
      }
    }

    return { transcript, speakers, words, confidence };
  }

  /**
   * Transcribe with OpenAI Whisper
   */
  private async transcribeWithWhisper(
    audioBuffer: Buffer,
    language?: string
  ): Promise<{ transcript: string }> {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Convert buffer to File object (using Uint8Array to ensure proper ArrayBuffer type)
    const arrayBuffer = new Uint8Array(audioBuffer).buffer;
    const file = new File([arrayBuffer], 'audio.mp3', { type: 'audio/mpeg' });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
    });

    return { transcript: transcription.text };
  }
}

// Export singleton
let aiServiceInstance: AIService | null = null;

export function getAIService(supabaseClient: any): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService(supabaseClient);
  }
  return aiServiceInstance;
}
