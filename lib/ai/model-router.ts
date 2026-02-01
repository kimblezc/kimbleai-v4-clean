/**
 * Smart Model Router - Automatically selects the best AI model for each task
 *
 * Strategy:
 * - GPT-5: Complex reasoning, high accuracy needs, code generation
 * - GPT-4.5: General chat, creative writing, balanced cost/quality
 * - Gemini 2.5 Flash: Bulk operations, vision (75% cheaper), video
 * - Claude Sonnet 4.5: Code screenshots, UI analysis
 * - Deepgram Nova-3: Audio transcription (fastest, most accurate)
 * - OpenAI Realtime API: Real-time voice chat mode
 */

export type TaskType =
  | 'chat'              // General conversation
  | 'reasoning'         // Complex problem-solving
  | 'creative'          // Writing, brainstorming
  | 'vision'            // Image analysis
  | 'code-vision'       // Code screenshot analysis
  | 'bulk'              // Batch processing
  | 'transcription'     // Audio transcription
  | 'voice-chat'        // Real-time voice
  | 'embedding';        // Vector embeddings

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'deepgram';

export interface ModelSelection {
  provider: ModelProvider;
  model: string;
  reason: string;
  estimatedCost: number;  // USD per 1M tokens (or per minute for audio)
  features: string[];
}

export interface RoutingContext {
  taskType: TaskType;
  inputSize: number;        // Characters, tokens, or bytes
  userPreference?: string;  // Manual override
  budgetConstraint?: number; // Max cost in USD
  qualityThreshold?: 'standard' | 'high' | 'maximum';
  requiresSpeed?: boolean;   // Prioritize latency over cost
}

export class ModelRouter {
  private manualOverride: boolean = false;
  private manualModel: string | null = null;

  /**
   * Enable manual model selection (override smart routing)
   */
  setManualMode(model: string) {
    this.manualOverride = true;
    this.manualModel = model;
  }

  /**
   * Disable manual mode, return to smart routing
   */
  setAutoMode() {
    this.manualOverride = false;
    this.manualModel = null;
  }

  /**
   * Select the optimal model for a given task
   */
  selectModel(context: RoutingContext): ModelSelection {
    // Manual override takes precedence
    if (this.manualOverride && this.manualModel) {
      return this.getModelInfo(this.manualModel);
    }

    // User preference (but still validate it's appropriate)
    if (context.userPreference) {
      const selection = this.getModelInfo(context.userPreference);
      if (this.isModelAppropriate(selection, context)) {
        return selection;
      }
    }

    // Smart routing based on task type
    return this.routeByTask(context);
  }

  /**
   * Route based on task type and constraints
   */
  private routeByTask(context: RoutingContext): ModelSelection {
    const { taskType, inputSize, budgetConstraint, qualityThreshold, requiresSpeed } = context;

    switch (taskType) {
      case 'chat':
        return this.routeChat(inputSize, qualityThreshold, budgetConstraint);

      case 'reasoning':
        // Always use GPT-5 for complex reasoning
        return this.getModelInfo('gpt-5');

      case 'creative':
        // GPT-4.5 excels at creative tasks
        return this.getModelInfo('gpt-4.5');

      case 'vision':
        return this.routeVision(inputSize, budgetConstraint);

      case 'code-vision':
        // Claude Sonnet 4.5 is best for code screenshots
        return this.getModelInfo('claude-sonnet-4.5');

      case 'bulk':
        // Always use Gemini 2.5 Flash for bulk (cheapest)
        return this.getModelInfo('gemini-2.5-flash');

      case 'transcription':
        return this.routeTranscription(requiresSpeed);

      case 'voice-chat':
        // Real-time voice requires OpenAI Realtime API
        return this.getModelInfo('gpt-realtime');

      case 'embedding':
        // Always use OpenAI text-embedding-3-small
        return this.getModelInfo('text-embedding-3-small');

      default:
        // Default to GPT-4.5 (best balance)
        return this.getModelInfo('gpt-4.5');
    }
  }

  /**
   * Route chat based on quality and budget
   */
  private routeChat(
    inputSize: number,
    qualityThreshold: RoutingContext['qualityThreshold'] = 'standard',
    budgetConstraint?: number
  ): ModelSelection {
    // For very long inputs, use Gemini 2.5 (1M token context)
    if (inputSize > 100000) {
      return this.getModelInfo('gemini-2.5-pro');
    }

    // Quality-based routing
    if (qualityThreshold === 'maximum') {
      return this.getModelInfo('gpt-5');
    }

    if (qualityThreshold === 'high') {
      // Check budget
      if (budgetConstraint && budgetConstraint < 0.01) {
        // Budget too low for GPT-5, use GPT-4.5
        return this.getModelInfo('gpt-4.5');
      }
      return this.getModelInfo('gpt-5');
    }

    // Standard quality - use GPT-4.5
    return this.getModelInfo('gpt-4.5');
  }

  /**
   * Route vision based on cost
   */
  private routeVision(inputSize: number, budgetConstraint?: number): ModelSelection {
    // If budget is tight, always use Gemini 2.5 Flash (75% cheaper)
    if (budgetConstraint && budgetConstraint < 0.005) {
      return this.getModelInfo('gemini-2.5-flash');
    }

    // For batch operations (multiple images), use Gemini
    if (inputSize > 1000000) {  // > 1MB suggests multiple images
      return this.getModelInfo('gemini-2.5-flash');
    }

    // Default to Gemini 2.5 Flash (best cost/quality for vision)
    return this.getModelInfo('gemini-2.5-flash');
  }

  /**
   * Route transcription based on speed requirement
   */
  private routeTranscription(requiresSpeed?: boolean): ModelSelection {
    if (requiresSpeed) {
      // Deepgram Nova-3 is fastest (20s for 1hr audio)
      return this.getModelInfo('deepgram-nova-3');
    }

    // Default to Deepgram Nova-3 (best accuracy + speed)
    return this.getModelInfo('deepgram-nova-3');
  }

  /**
   * Get model information
   */
  private getModelInfo(model: string): ModelSelection {
    const models: Record<string, ModelSelection> = {
      'gpt-5': {
        provider: 'openai',
        model: 'gpt-5',
        reason: 'Highest accuracy and reasoning capabilities',
        estimatedCost: 5.00,
        features: ['complex reasoning', 'multimodal', 'code generation', 'math'],
      },
      'gpt-4.5': {
        provider: 'openai',
        model: 'gpt-4.5',
        reason: 'Best balance of cost and quality',
        estimatedCost: 2.50,
        features: ['general chat', 'creative writing', 'EQ', 'fast inference'],
      },
      'gpt-4o': {
        provider: 'openai',
        model: 'gpt-4o',
        reason: 'Multimodal with good vision',
        estimatedCost: 5.00,
        features: ['text', 'images', 'audio', 'vision'],
      },
      'gpt-realtime': {
        provider: 'openai',
        model: 'gpt-realtime',
        reason: 'Real-time voice conversation with low latency',
        estimatedCost: 32.00,  // Per 1M audio tokens ($0.04/min)
        features: ['voice', 'real-time', 'emotions', 'interruptions'],
      },
      'claude-sonnet-4.5': {
        provider: 'anthropic',
        model: 'claude-sonnet-4.5',
        reason: 'Best vision for code and UI analysis',
        estimatedCost: 3.00,
        features: ['vision', 'code analysis', 'long context 200K', 'safety'],
      },
      'claude-opus-4.5': {
        provider: 'anthropic',
        model: 'claude-opus-4.5',
        reason: 'Most capable Claude model',
        estimatedCost: 15.00,
        features: ['complex tasks', 'vision', 'long context', 'highest quality'],
      },
      'gemini-2.5-flash': {
        provider: 'google',
        model: 'gemini-2.5-flash',
        reason: 'Fastest and cheapest multimodal model',
        estimatedCost: 1.25,
        features: ['text', 'images', 'video', 'audio', 'fast', 'cheap'],
      },
      'gemini-2.5-pro': {
        provider: 'google',
        model: 'gemini-2.5-pro',
        reason: 'Longest context window (1M tokens)',
        estimatedCost: 2.50,
        features: ['1M context', 'multimodal', 'deep think mode', 'video'],
      },
      'deepgram-nova-3': {
        provider: 'deepgram',
        model: 'nova-3',
        reason: 'Fastest and most accurate transcription',
        estimatedCost: 0.0043,  // Per minute
        features: ['54% better WER', '20s for 1hr audio', 'speaker diarization'],
      },
      'whisper-1': {
        provider: 'openai',
        model: 'whisper-1',
        reason: 'Best multilingual transcription',
        estimatedCost: 0.006,  // Per minute
        features: ['99 languages', 'translation', 'batch processing'],
      },
      'text-embedding-3-small': {
        provider: 'openai',
        model: 'text-embedding-3-small',
        reason: 'Standard embedding model',
        estimatedCost: 0.02,
        features: ['1536 dimensions', 'semantic search', 'fast'],
      },
    };

    return models[model] || models['gpt-4.5'];
  }

  /**
   * Check if model is appropriate for task
   */
  private isModelAppropriate(selection: ModelSelection, context: RoutingContext): boolean {
    const { taskType } = context;

    // Vision tasks need vision models
    if ((taskType === 'vision' || taskType === 'code-vision') &&
        !selection.features.includes('vision') &&
        !selection.features.includes('images')) {
      return false;
    }

    // Voice chat needs realtime
    if (taskType === 'voice-chat' && !selection.features.includes('voice')) {
      return false;
    }

    // Transcription needs audio models
    if (taskType === 'transcription' && selection.provider !== 'deepgram' && selection.provider !== 'openai') {
      return false;
    }

    return true;
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(context: RoutingContext): number {
    const selection = this.selectModel(context);
    const { inputSize } = context;

    // For text models (cost per 1M tokens)
    if (selection.provider === 'openai' || selection.provider === 'anthropic' || selection.provider === 'google') {
      // Rough estimate: 1 token ≈ 4 characters
      const estimatedTokens = inputSize / 4;
      return (estimatedTokens / 1_000_000) * selection.estimatedCost;
    }

    // For audio models (cost per minute)
    if (selection.provider === 'deepgram') {
      // inputSize is duration in seconds
      const minutes = inputSize / 60;
      return minutes * selection.estimatedCost;
    }

    return 0;
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelSelection[] {
    return [
      this.getModelInfo('gpt-5'),
      this.getModelInfo('gpt-4.5'),
      this.getModelInfo('gpt-4o'),
      this.getModelInfo('claude-sonnet-4.5'),
      this.getModelInfo('gemini-2.5-flash'),
      this.getModelInfo('gemini-2.5-pro'),
    ];
  }

  /**
   * Get recommended models for a task type
   */
  getRecommendedModels(taskType: TaskType): ModelSelection[] {
    const recommendations: Record<TaskType, string[]> = {
      chat: ['gpt-4.5', 'gpt-5', 'gemini-2.5-flash'],
      reasoning: ['gpt-5', 'claude-opus-4.5'],
      creative: ['gpt-4.5', 'claude-sonnet-4.5'],
      vision: ['gemini-2.5-flash', 'gpt-4o', 'claude-sonnet-4.5'],
      'code-vision': ['claude-sonnet-4.5', 'gpt-4o'],
      bulk: ['gemini-2.5-flash'],
      transcription: ['deepgram-nova-3', 'whisper-1'],
      'voice-chat': ['gpt-realtime'],
      embedding: ['text-embedding-3-small'],
    };

    return (recommendations[taskType] || ['gpt-4.5']).map(model => this.getModelInfo(model));
  }
}

// Singleton instance
export const modelRouter = new ModelRouter();

// Export types
export type { ModelSelection, RoutingContext };
