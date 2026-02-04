/**
 * Smart Model Router - Automatically selects the best AI model for each task
 *
 * Updated: 2026-02-04 with latest models
 *
 * Strategy:
 * - GPT-5.2: Best general intelligence, complex tasks, agentic workflows
 * - GPT-5.2-Codex: Specialized for coding, refactoring, migrations
 * - Gemini 3 Pro: Complex reasoning with 1M context window
 * - Gemini 3 Flash: Fast general-purpose with good reasoning
 * - Claude Opus 4.5: Best for coding, agents, computer use
 * - Claude Sonnet 4.5: Code screenshots, UI analysis, balanced
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
   * Updated 2026-02-04 with latest models
   */
  private routeByTask(context: RoutingContext): ModelSelection {
    const { taskType, inputSize, budgetConstraint, qualityThreshold, requiresSpeed } = context;

    switch (taskType) {
      case 'chat':
        return this.routeChat(inputSize, qualityThreshold, budgetConstraint);

      case 'reasoning':
        // Use GPT-5.2 for complex reasoning (best general intelligence)
        return this.getModelInfo('gpt-5.2');

      case 'creative':
        // GPT-5.2 excels at creative tasks
        return this.getModelInfo('gpt-5.2');

      case 'vision':
        return this.routeVision(inputSize, budgetConstraint);

      case 'code-vision':
        // Claude Sonnet 4.5 is best for code screenshots and UI analysis
        return this.getModelInfo('claude-sonnet-4.5');

      case 'bulk':
        // Gemini 3 Flash for bulk (fast and cheap)
        return this.getModelInfo('gemini-3-flash');

      case 'transcription':
        return this.routeTranscription(requiresSpeed);

      case 'voice-chat':
        // Real-time voice requires OpenAI Realtime API
        return this.getModelInfo('gpt-realtime');

      case 'embedding':
        // OpenAI text-embedding-3-small
        return this.getModelInfo('text-embedding-3-small');

      default:
        // Default to GPT-5.2 (best general intelligence)
        return this.getModelInfo('gpt-5.2');
    }
  }

  /**
   * Route chat based on quality and budget
   * Updated 2026-02-04 with GPT-5.2 as default
   */
  private routeChat(
    inputSize: number,
    qualityThreshold: RoutingContext['qualityThreshold'] = 'standard',
    budgetConstraint?: number
  ): ModelSelection {
    // For very long inputs, use Gemini 3 Pro (1M token context)
    if (inputSize > 100000) {
      return this.getModelInfo('gemini-3-pro');
    }

    // Quality-based routing
    if (qualityThreshold === 'maximum') {
      return this.getModelInfo('gpt-5.2-pro');
    }

    if (qualityThreshold === 'high') {
      // Check budget
      if (budgetConstraint && budgetConstraint < 0.01) {
        // Budget too low for GPT-5.2-pro, use standard GPT-5.2
        return this.getModelInfo('gpt-5.2');
      }
      return this.getModelInfo('gpt-5.2-pro');
    }

    // Standard quality - use GPT-5.2 (best general intelligence)
    return this.getModelInfo('gpt-5.2');
  }

  /**
   * Route vision based on cost
   * Updated 2026-02-04 with Gemini 3 Flash
   */
  private routeVision(inputSize: number, budgetConstraint?: number): ModelSelection {
    // If budget is tight, always use Gemini 3 Flash (fast and cheap)
    if (budgetConstraint && budgetConstraint < 0.005) {
      return this.getModelInfo('gemini-3-flash');
    }

    // For batch operations (multiple images), use Gemini 3 Flash
    if (inputSize > 1000000) {  // > 1MB suggests multiple images
      return this.getModelInfo('gemini-3-flash');
    }

    // Default to Gemini 3 Flash (best cost/quality for vision)
    return this.getModelInfo('gemini-3-flash');
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
   * Updated 2026-02-04 with latest models
   */
  private getModelInfo(model: string): ModelSelection {
    const models: Record<string, ModelSelection> = {
      // OpenAI GPT-5.2 Series (Latest - December 2025)
      'gpt-5.2': {
        provider: 'openai',
        model: 'gpt-5.2',
        reason: 'Best general intelligence, agentic tool-calling, complex tasks',
        estimatedCost: 1.75,  // $1.75/1M input tokens
        features: ['reasoning', 'agentic', 'multimodal', 'long context', 'tool-calling'],
      },
      'gpt-5.2-pro': {
        provider: 'openai',
        model: 'gpt-5.2-pro',
        reason: 'Smartest and most trustworthy for difficult questions',
        estimatedCost: 5.00,
        features: ['highest quality', 'reasoning', 'complex tasks', 'trustworthy'],
      },
      'gpt-5.2-codex': {
        provider: 'openai',
        model: 'gpt-5.2-codex',
        reason: 'Most advanced agentic coding model for software engineering',
        estimatedCost: 2.50,
        features: ['coding', 'refactoring', 'migrations', 'long-horizon', 'agentic'],
      },
      // OpenAI Legacy Models (still available)
      'gpt-4o': {
        provider: 'openai',
        model: 'gpt-4o',
        reason: 'Good balance of cost and quality (being deprecated)',
        estimatedCost: 2.50,
        features: ['general chat', 'creative writing', 'vision', 'fast inference'],
      },
      'gpt-realtime': {
        provider: 'openai',
        model: 'gpt-4o-realtime-preview',
        reason: 'Real-time voice conversation with low latency',
        estimatedCost: 32.00,
        features: ['voice', 'real-time', 'emotions', 'interruptions'],
      },
      // Anthropic Claude 4.5 Series (Latest)
      'claude-sonnet-4.5': {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        reason: 'Best coding, 1M token context, excellent for UI analysis',
        estimatedCost: 3.00,  // $3/1M input tokens
        features: ['vision', 'code analysis', '1M context', 'safety', 'coding'],
      },
      'claude-opus-4.5': {
        provider: 'anthropic',
        model: 'claude-opus-4-5-20251101',
        reason: 'Best for coding, agents, computer use',
        estimatedCost: 5.00,  // $5/1M input tokens
        features: ['coding', 'agents', 'computer use', 'highest quality', 'vision'],
      },
      'claude-haiku-4.5': {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        reason: 'Fastest Claude model, cost-effective',
        estimatedCost: 1.00,  // $1/1M input tokens
        features: ['fast', 'cheap', 'general tasks', 'text'],
      },
      // Aliases for backward compatibility
      'claude-sonnet': {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        reason: 'Best coding, 1M token context, excellent for UI analysis',
        estimatedCost: 3.00,
        features: ['vision', 'code analysis', '1M context', 'safety', 'coding'],
      },
      'claude-opus': {
        provider: 'anthropic',
        model: 'claude-opus-4-5-20251101',
        reason: 'Best for coding, agents, computer use',
        estimatedCost: 5.00,
        features: ['coding', 'agents', 'computer use', 'highest quality', 'vision'],
      },
      // Google Gemini 3 Series (Latest - Preview)
      'gemini-3-pro': {
        provider: 'google',
        model: 'gemini-3-pro-preview',
        reason: 'Complex agentic workflows, adaptive thinking, 1M context',
        estimatedCost: 2.50,
        features: ['reasoning', 'agentic', '1M context', 'multimodal', 'grounding'],
      },
      'gemini-3-flash': {
        provider: 'google',
        model: 'gemini-3-flash-preview',
        reason: 'Pro-level intelligence at Flash speed and pricing',
        estimatedCost: 1.25,
        features: ['fast', 'reasoning', 'multimodal', 'vision', 'cheap'],
      },
      // Aliases for backward compatibility
      'gemini-flash': {
        provider: 'google',
        model: 'gemini-3-flash-preview',
        reason: 'Pro-level intelligence at Flash speed and pricing',
        estimatedCost: 1.25,
        features: ['fast', 'reasoning', 'multimodal', 'vision', 'cheap'],
      },
      'gemini-pro': {
        provider: 'google',
        model: 'gemini-3-pro-preview',
        reason: 'Complex agentic workflows, adaptive thinking, 1M context',
        estimatedCost: 2.50,
        features: ['1M context', 'reasoning', 'agentic', 'multimodal'],
      },
      // Audio Models
      'deepgram-nova-3': {
        provider: 'deepgram',
        model: 'nova-3',
        reason: 'Fastest and most accurate transcription',
        estimatedCost: 0.0043,
        features: ['54% better WER', '20s for 1hr audio', 'speaker diarization'],
      },
      'whisper-1': {
        provider: 'openai',
        model: 'whisper-1',
        reason: 'Best multilingual transcription',
        estimatedCost: 0.006,
        features: ['99 languages', 'translation', 'batch processing'],
      },
      // Embedding Models
      'text-embedding-3-small': {
        provider: 'openai',
        model: 'text-embedding-3-small',
        reason: 'Standard embedding model',
        estimatedCost: 0.02,
        features: ['1536 dimensions', 'semantic search', 'fast'],
      },
    };

    return models[model] || models['gpt-5.2'];
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
   * Updated 2026-02-04 with latest models
   */
  getAvailableModels(): ModelSelection[] {
    return [
      this.getModelInfo('gpt-5.2'),
      this.getModelInfo('gpt-5.2-pro'),
      this.getModelInfo('gpt-5.2-codex'),
      this.getModelInfo('claude-opus-4.5'),
      this.getModelInfo('claude-sonnet-4.5'),
      this.getModelInfo('claude-haiku-4.5'),
      this.getModelInfo('gemini-3-pro'),
      this.getModelInfo('gemini-3-flash'),
    ];
  }

  /**
   * Get recommended models for a task type
   * Updated 2026-02-04 with latest models
   */
  getRecommendedModels(taskType: TaskType): ModelSelection[] {
    const recommendations: Record<TaskType, string[]> = {
      chat: ['gpt-5.2', 'gemini-3-flash', 'claude-sonnet-4.5'],
      reasoning: ['gpt-5.2', 'gpt-5.2-pro', 'gemini-3-pro'],
      creative: ['gpt-5.2', 'claude-sonnet-4.5'],
      vision: ['gemini-3-flash', 'gpt-5.2', 'claude-sonnet-4.5'],
      'code-vision': ['claude-sonnet-4.5', 'gpt-5.2-codex', 'claude-opus-4.5'],
      bulk: ['gemini-3-flash', 'claude-haiku-4.5'],
      transcription: ['deepgram-nova-3', 'whisper-1'],
      'voice-chat': ['gpt-realtime'],
      embedding: ['text-embedding-3-small'],
    };

    return (recommendations[taskType] || ['gpt-5.2']).map(model => this.getModelInfo(model));
  }
}

// Singleton instance
export const modelRouter = new ModelRouter();

// Export types
export type { ModelSelection, RoutingContext };
