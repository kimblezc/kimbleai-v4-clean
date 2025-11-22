/**
 * DeepSeek API Client - Phase 2b Bulk Processing
 *
 * OpenAI-compatible API client for DeepSeek V3.2
 * Optimized for high-volume document and email processing
 *
 * Features:
 * - Batch processing up to 100+ documents
 * - Cost-effective: $0.27/$1.10 per 1M tokens
 * - OpenAI-compatible API format
 * - Streaming support
 * - Error handling and retries
 * - Cost tracking
 * - Rate limiting
 *
 * @see https://api.deepseek.com/docs
 */

interface DeepSeekConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  enableRateLimiting?: boolean;
  onCost?: (cost: number) => void;
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: DeepSeekMessage;
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface BulkProcessingResult {
  documentId: string;
  filename: string;
  status: 'success' | 'failed' | 'skipped';
  result?: string;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  processingTime?: number;
}

interface BulkProcessingRequest {
  documents: Array<{
    id: string;
    name: string;
    content: string;
  }>;
  task: 'summarize' | 'extract' | 'categorize' | 'analyze';
  instructions?: string;
  temperature?: number;
  maxTokens?: number;
  concurrency?: number;
}

// Pricing per million tokens (input/output)
const MODEL_PRICING = {
  'deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
};

// Rate limiting configuration
interface RateLimitState {
  requestsThisMinute: number;
  lastResetTime: number;
  requestsThisDay: number;
  lastDayResetTime: number;
}

export class DeepSeekClient {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private enableRateLimiting: boolean;
  private onCost?: (cost: number) => void;
  private rateLimitState: RateLimitState;

  // Rate limits
  private readonly REQUESTS_PER_MINUTE = 60;
  private readonly REQUESTS_PER_DAY = 10000;

  constructor(config: DeepSeekConfig) {
    if (!config.apiKey) {
      throw new Error('DeepSeek API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
    this.timeout = config.timeout || 60000;
    this.maxRetries = config.maxRetries || 3;
    this.enableRateLimiting = config.enableRateLimiting !== false;
    this.onCost = config.onCost;

    this.rateLimitState = {
      requestsThisMinute: 0,
      lastResetTime: Date.now(),
      requestsThisDay: 0,
      lastDayResetTime: Date.now(),
    };
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.enableRateLimiting) return;

    const now = Date.now();
    const oneMinute = 60000;
    const oneDay = 86400000;

    // Reset minute counter if needed
    if (now - this.rateLimitState.lastResetTime > oneMinute) {
      this.rateLimitState.requestsThisMinute = 0;
      this.rateLimitState.lastResetTime = now;
    }

    // Reset day counter if needed
    if (now - this.rateLimitState.lastDayResetTime > oneDay) {
      this.rateLimitState.requestsThisDay = 0;
      this.rateLimitState.lastDayResetTime = now;
    }

    // Check limits
    if (this.rateLimitState.requestsThisMinute >= this.REQUESTS_PER_MINUTE) {
      const waitTime = oneMinute - (now - this.rateLimitState.lastResetTime);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s`);
    }

    if (this.rateLimitState.requestsThisDay >= this.REQUESTS_PER_DAY) {
      throw new Error('Daily rate limit exceeded. Please try again tomorrow.');
    }

    this.rateLimitState.requestsThisMinute++;
    this.rateLimitState.requestsThisDay++;
  }

  /**
   * Calculate cost for API call
   */
  private calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['deepseek-chat'];
    const inputCost = (promptTokens / 1000000) * pricing.input;
    const outputCost = (completionTokens / 1000000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Make API request to DeepSeek with retries
   */
  private async makeRequest(
    request: DeepSeekRequest,
    attempt: number = 0
  ): Promise<DeepSeekResponse> {
    try {
      await this.checkRateLimit();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `DeepSeek API error: ${response.status} - ${error.error?.message || 'Unknown error'}`
        );
      }

      const data: DeepSeekResponse = await response.json();

      // Track cost
      if (this.onCost && data.usage) {
        const cost = this.calculateCost(
          request.model,
          data.usage.prompt_tokens,
          data.usage.completion_tokens
        );
        this.onCost(cost);
      }

      return data;
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(
          `[DeepSeek] Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeRequest(request, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Process a single document with DeepSeek
   */
  async processDocument(
    document: { id: string; name: string; content: string },
    task: 'summarize' | 'extract' | 'categorize' | 'analyze',
    instructions?: string,
    temperature: number = 0.7,
    maxTokens: number = 2048
  ): Promise<string> {
    const taskPrompts = {
      summarize: `Please provide a concise summary of the following document. Focus on key points and main ideas.`,
      extract: `Extract the most important information from the following document. Organize it in a structured format.`,
      categorize: `Categorize and classify the content of the following document. Identify the main topic, subtopics, and relevant keywords.`,
      analyze: `Perform a detailed analysis of the following document. Include insights, patterns, and recommendations.`,
    };

    const systemPrompt = instructions || taskPrompts[task];

    const response = await this.makeRequest({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: document.content,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    return content;
  }

  /**
   * Process multiple documents in parallel with concurrency control
   */
  async processBulk(request: BulkProcessingRequest): Promise<BulkProcessingResult[]> {
    const concurrency = request.concurrency || 5;
    const results: BulkProcessingResult[] = [];

    console.log(
      `[DeepSeek] Starting bulk processing: ${request.documents.length} documents, concurrency=${concurrency}`
    );

    // Process documents with concurrency control
    const queue = [...request.documents];
    const processing = new Set<Promise<void>>();

    while (queue.length > 0 || processing.size > 0) {
      // Add new tasks up to concurrency limit
      while (queue.length > 0 && processing.size < concurrency) {
        const document = queue.shift()!;
        const promise = this.processDocumentWithErrorHandling(
          document,
          request.task,
          request.instructions,
          request.temperature,
          request.maxTokens,
          results
        ).finally(() => processing.delete(promise));

        processing.add(promise);
      }

      // Wait for at least one task to complete
      if (processing.size > 0) {
        await Promise.race(processing);
      }
    }

    console.log(`[DeepSeek] Bulk processing complete: ${results.length} documents processed`);
    return results;
  }

  /**
   * Process document with error handling
   */
  private async processDocumentWithErrorHandling(
    document: { id: string; name: string; content: string },
    task: string,
    instructions: string | undefined,
    temperature: number | undefined,
    maxTokens: number | undefined,
    results: BulkProcessingResult[]
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!document.content || document.content.trim().length === 0) {
        results.push({
          documentId: document.id,
          filename: document.name,
          status: 'skipped',
          error: 'Document content is empty',
        });
        return;
      }

      const result = await this.processDocument(
        document,
        task as any,
        instructions,
        temperature,
        maxTokens
      );

      const processingTime = Date.now() - startTime;

      results.push({
        documentId: document.id,
        filename: document.name,
        status: 'success',
        result,
        processingTime,
      });

      console.log(`[DeepSeek] Processed: ${document.name} (${processingTime}ms)`);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      results.push({
        documentId: document.id,
        filename: document.name,
        status: 'failed',
        error: errorMessage,
        processingTime,
      });

      console.error(`[DeepSeek] Failed to process ${document.name}: ${errorMessage}`);
    }
  }

  /**
   * Get statistics about rate limit usage
   */
  getStats(): {
    requestsThisMinute: number;
    requestsThisDay: number;
    rateLimitPerMinute: number;
    rateLimitPerDay: number;
  } {
    return {
      requestsThisMinute: this.rateLimitState.requestsThisMinute,
      requestsThisDay: this.rateLimitState.requestsThisDay,
      rateLimitPerMinute: this.REQUESTS_PER_MINUTE,
      rateLimitPerDay: this.REQUESTS_PER_DAY,
    };
  }
}

// Create and export singleton instance
let deepseekClient: DeepSeekClient | null = null;

export function getDeepSeekClient(): DeepSeekClient {
  if (!deepseekClient) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required');
    }

    deepseekClient = new DeepSeekClient({
      apiKey,
      enableRateLimiting: true,
      onCost: (cost) => {
        console.log(`[DeepSeek] Cost: $${cost.toFixed(4)}`);
      },
    });
  }

  return deepseekClient;
}

export type { DeepSeekConfig, DeepSeekMessage, DeepSeekRequest, DeepSeekResponse, BulkProcessingResult, BulkProcessingRequest };
