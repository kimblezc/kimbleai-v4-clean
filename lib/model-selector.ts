// lib/model-selector.ts
// Intelligent model selection based on task type and complexity

export interface ModelConfig {
  model: string;
  reasoningLevel?: 'minimal' | 'low' | 'medium' | 'high';
  maxTokens?: number;
  temperature?: number;
  description: string;
  useCases: string[];
  costMultiplier: number; // relative to gpt-4o-mini baseline
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // === GEMINI MODELS (Google) - FREE TIER ===
  'gemini-2.5-flash': {
    model: 'gemini-2.5-flash',
    maxTokens: 8096,
    temperature: 0.7,
    description: 'Google Gemini 2.5 Flash - DEFAULT MODEL (Free: 1,500 RPD) - Fast, multimodal, best for general tasks',
    useCases: ['general chat', 'quick answers', 'simple tasks', 'image analysis', 'high-volume requests'],
    costMultiplier: 0 // FREE tier (1,500 requests/day)
  },
  'gemini-2.5-pro': {
    model: 'gemini-2.5-pro',
    maxTokens: 8096,
    temperature: 0.7,
    description: 'Google Gemini 2.5 Pro - Premium model (Free: 50 RPD) - Advanced reasoning, complex analysis',
    useCases: ['complex reasoning', 'advanced analysis', 'detailed research', 'coding', 'technical problems'],
    costMultiplier: 1 // FREE tier (50 requests/day), then $1.50/$6 per million tokens
  },

  // === CLAUDE MODELS (Anthropic) ===
  'claude-sonnet-4-5': {
    model: 'claude-sonnet-4-5',
    maxTokens: 8096,
    temperature: 1.0,
    description: 'Claude Sonnet 4.5 - Best overall quality, creative writing, complex analysis',
    useCases: ['creative writing', 'complex analysis', 'detailed research', 'nuanced reasoning', 'long-form content'],
    costMultiplier: 8 // $3/$15 per million tokens
  },
  'claude-3-5-haiku': {
    model: 'claude-3-5-haiku',
    maxTokens: 8096,
    temperature: 1.0,
    description: 'Claude 3.5 Haiku - Fast, cost-effective, great for simple tasks',
    useCases: ['quick answers', 'simple questions', 'basic chat', 'file processing', 'categorization'],
    costMultiplier: 2 // $1/$5 per million tokens - most cost-effective
  },
  'claude-opus-4': {
    model: 'claude-opus-4',
    maxTokens: 8096,
    temperature: 1.0,
    description: 'Claude Opus 4 - Most powerful model for hardest tasks',
    useCases: ['extremely complex analysis', 'advanced research', 'multi-step reasoning', 'expert-level tasks'],
    costMultiplier: 15 // $15/$75 per million tokens - most expensive
  },

  // === GPT MODELS (OpenAI) ===

  // GPT-5 Models (Released August 2025)
  'gpt-5': {
    model: 'gpt-5',
    reasoningLevel: 'high',
    maxTokens: 128000, // 128K output, 272K input
    temperature: 1.0,
    description: 'GPT-5 - Smartest model with maximum reasoning',
    useCases: ['complex analysis', 'advanced reasoning', 'research', 'deep technical questions', 'coding'],
    costMultiplier: 16.67 // $1.25/$10 per million tokens
  },
  'gpt-5-mini': {
    model: 'gpt-5-mini',
    reasoningLevel: 'medium',
    maxTokens: 128000,
    temperature: 1.0,
    description: 'GPT-5 Mini - Balanced next-gen performance at lower cost',
    useCases: ['general chat', 'quick answers', 'routine tasks', 'code generation'],
    costMultiplier: 3.33 // $0.25/$2 per million tokens
  },
  'gpt-5-nano': {
    model: 'gpt-5-nano',
    reasoningLevel: 'low',
    maxTokens: 128000,
    temperature: 1.0,
    description: 'GPT-5 Nano - Fastest and most cost-effective GPT-5 variant',
    useCases: ['simple queries', 'basic tasks', 'high-volume applications'],
    costMultiplier: 0.67 // $0.05/$0.40 per million tokens
  },

  // o1 Reasoning Models
  'o1': {
    model: 'o1',
    maxTokens: 100000,
    temperature: 1.0,
    description: 'GPT o1 - Advanced reasoning model for complex problem solving',
    useCases: ['complex math', 'advanced coding', 'scientific reasoning', 'multi-step logic', 'research'],
    costMultiplier: 25 // $15/$60 per million tokens
  },
  'o1-mini': {
    model: 'o1-mini',
    maxTokens: 65536,
    temperature: 1.0,
    description: 'GPT o1-mini - Fast reasoning model for coding and STEM',
    useCases: ['code generation', 'debugging', 'math problems', 'STEM questions', 'quick reasoning'],
    costMultiplier: 5 // $3/$12 per million tokens
  },
  'o1-preview': {
    model: 'o1-preview',
    maxTokens: 128000,
    temperature: 1.0,
    description: 'GPT o1-preview - Preview of advanced reasoning capabilities',
    useCases: ['experimental reasoning', 'complex problem solving', 'research tasks'],
    costMultiplier: 20 // $15/$60 per million tokens
  },

  // GPT-4 Models
  'gpt-4o': {
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'OpenAI GPT-4o - Excellent for code generation and technical reasoning',
    useCases: ['code generation', 'debugging', 'technical explanations', 'structured output', 'API integration'],
    costMultiplier: 6 // $2.50/$10 per million tokens
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'OpenAI GPT-4o Mini - Balanced performance for general tasks',
    useCases: ['general chat', 'project planning', 'summaries', 'data extraction'],
    costMultiplier: 1 // $0.15/$0.60 per million tokens - baseline
  }
};

// Keep GPT5_MODELS for testing/future use
export const GPT5_MODELS: Record<string, ModelConfig> = {
  'gpt-5': {
    model: 'gpt-5',
    reasoningLevel: 'high',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'Full GPT-5 with maximum reasoning capabilities',
    useCases: ['complex analysis', 'advanced reasoning', 'research', 'deep technical questions'],
    costMultiplier: 10 // $1.25/$10 vs current pricing
  },
  'gpt-5-medium': {
    model: 'gpt-5',
    reasoningLevel: 'medium',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'GPT-5 with medium reasoning for balanced performance',
    useCases: ['code generation', 'detailed explanations', 'project planning'],
    costMultiplier: 8
  },
  'gpt-5-low': {
    model: 'gpt-5',
    reasoningLevel: 'low',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'GPT-5 with low reasoning for faster responses',
    useCases: ['general chat', 'simple questions', 'creative writing'],
    costMultiplier: 6
  },
  'gpt-5-mini': {
    model: 'gpt-5-mini',
    reasoningLevel: 'medium',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'Faster, cost-effective GPT-5 variant',
    useCases: ['routine tasks', 'file processing', 'quick answers'],
    costMultiplier: 3
  },
  'gpt-5-nano': {
    model: 'gpt-5-nano',
    reasoningLevel: 'minimal',
    maxTokens: 2048,
    temperature: 0.7,
    description: 'Lightweight GPT-5 for simple tasks',
    useCases: ['categorization', 'simple extraction', 'basic chat'],
    costMultiplier: 1
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'Fallback model for compatibility',
    useCases: ['fallback', 'legacy compatibility'],
    costMultiplier: 1 // baseline
  }
};

export interface TaskContext {
  messageContent: string;
  hasFileContext?: boolean;
  hasCodeContent?: boolean;
  isComplexReasoning?: boolean;
  userPreference?: 'speed' | 'quality' | 'cost';
  projectCategory?: string;
  conversationLength?: number;
}

export class ModelSelector {
  private static analyzeComplexity(content: string): 'simple' | 'medium' | 'complex' {
    const complexIndicators = [
      'analyze', 'explain why', 'compare', 'evaluate', 'research', 'deep dive',
      'comprehensive', 'detailed analysis', 'pros and cons', 'implications',
      'strategy', 'algorithm', 'architecture', 'design pattern', 'best practices'
    ];

    const codeIndicators = [
      'function', 'class', 'import', 'export', 'const', 'let', 'var',
      'if (', 'for (', 'while (', '=>', 'async', 'await', 'Promise'
    ];

    const simpleIndicators = [
      'what is', 'how to', 'quick question', 'simple', 'just need',
      'one word', 'yes or no', 'brief', 'short answer'
    ];

    const lowerContent = content.toLowerCase();

    // Check for simple indicators first
    if (simpleIndicators.some(indicator => lowerContent.includes(indicator))) {
      return 'simple';
    }

    // Check for complex indicators
    const complexCount = complexIndicators.filter(indicator =>
      lowerContent.includes(indicator)
    ).length;

    const codeCount = codeIndicators.filter(indicator =>
      content.includes(indicator)
    ).length;

    if (complexCount >= 2 || codeCount >= 3) {
      return 'complex';
    } else if (complexCount >= 1 || codeCount >= 1) {
      return 'medium';
    }

    // Length-based complexity
    if (content.length > 500) return 'medium';
    if (content.length > 1000) return 'complex';

    return 'simple';
  }

  private static detectTaskType(context: TaskContext): string[] {
    const { messageContent, hasFileContext, hasCodeContent, projectCategory } = context;
    const content = messageContent.toLowerCase();
    const taskTypes: string[] = [];

    // Code-related tasks
    if (hasCodeContent ||
        ['function', 'class', 'bug', 'debug', 'refactor', 'api'].some(term => content.includes(term))) {
      taskTypes.push('coding');
    }

    // Analysis tasks
    if (['analyze', 'analysis', 'evaluate', 'compare', 'research'].some(term => content.includes(term))) {
      taskTypes.push('analysis');
    }

    // File processing tasks
    if (hasFileContext || ['file', 'document', 'pdf', 'transcription'].some(term => content.includes(term))) {
      taskTypes.push('file_processing');
    }

    // Creative tasks
    if (['write', 'create', 'generate', 'creative', 'story', 'poem'].some(term => content.includes(term))) {
      taskTypes.push('creative');
    }

    // Math/reasoning tasks
    if (['calculate', 'solve', 'math', 'equation', 'algorithm', 'logic'].some(term => content.includes(term))) {
      taskTypes.push('reasoning');
    }

    // Project-specific tasks
    if (projectCategory) {
      switch (projectCategory) {
        case 'legal': taskTypes.push('analysis'); break;
        case 'dnd': taskTypes.push('creative'); break;
        case 'programming': taskTypes.push('coding'); break;
        case 'business': taskTypes.push('analysis'); break;
        default: taskTypes.push('general');
      }
    }

    return taskTypes.length > 0 ? taskTypes : ['general'];
  }

  public static selectModel(context: TaskContext): ModelConfig {
    try {
      const complexity = this.analyzeComplexity(context.messageContent);
      const taskTypes = this.detectTaskType(context);
      const userPref = context.userPreference || 'quality';

      console.log(`[ModelSelector] Complexity: ${complexity}, Tasks: ${taskTypes.join(', ')}, Preference: ${userPref}`);

      let selectedModel: ModelConfig | undefined;

      // === GEMINI-FIRST STRATEGY (Phase 2a) ===
      // Gemini Flash is FREE tier (1,500 RPD) and excellent for 90% of use cases
      // Only use other models for specific high-complexity tasks

      // === COST-OPTIMIZED SELECTION ===
      if (userPref === 'cost') {
        // Gemini Flash is cheapest (FREE tier) - use for everything
        if (complexity === 'simple' || complexity === 'medium') {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // FREE tier
        } else {
          // For complex tasks, Flash is still free, so use it first
          selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // FREE tier
        }
      }

      // === SPEED-OPTIMIZED SELECTION ===
      else if (userPref === 'speed') {
        // Gemini Flash is fastest (free tier advantage)
        selectedModel = AVAILABLE_MODELS['gemini-2.5-flash'];
      }

      // === TASK-SPECIFIC SELECTION ===

      // IMAGE ANALYSIS: Gemini Flash excels at multimodal (images, vision tasks)
      else if (taskTypes.some(t => ['file_processing', 'analysis'].includes(t)) &&
               /image|photo|picture|vision/.test(context.messageContent.toLowerCase())) {
        selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // Fast multimodal
      }

      // REASONING & MATH: Gemini Pro for complex, Flash for simple
      else if (taskTypes.includes('reasoning')) {
        if (complexity === 'complex') {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-pro'] ?? AVAILABLE_MODELS['gpt-5'] ?? AVAILABLE_MODELS['o1'];
        } else {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // Flash handles most reasoning
        }
      }

      // CODING TASKS: Gemini Pro for complex, Flash for standard
      else if (taskTypes.includes('coding')) {
        if (complexity === 'complex') {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-pro'] ?? AVAILABLE_MODELS['gpt-5'] ?? AVAILABLE_MODELS['o1-mini'];
        } else {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // Flash is excellent for coding
        }
      }

      // CREATIVE WRITING: Claude or Gemini
      else if (taskTypes.includes('creative')) {
        if (complexity === 'complex') {
          selectedModel = AVAILABLE_MODELS['claude-sonnet-4-5'];
        } else {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // Flash works well for creative
        }
      }

      // ANALYSIS: Gemini Pro for complex, Flash for simple
      else if (taskTypes.includes('analysis')) {
        if (complexity === 'complex') {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-pro'] ?? AVAILABLE_MODELS['claude-sonnet-4-5'];
        } else {
          selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // Flash for simple analysis
        }
      }

      // FILE PROCESSING: Gemini Flash is fastest
      else if (taskTypes.includes('file_processing')) {
        selectedModel = AVAILABLE_MODELS['gemini-2.5-flash'];
      }

      // === DEFAULT SELECTION BY COMPLEXITY ===
      // Prioritize Gemini Flash for 90% of general requests
      else {
        switch (complexity) {
          case 'simple':
            selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // FREE, fast, excellent quality
            break;
          case 'medium':
            selectedModel = AVAILABLE_MODELS['gemini-2.5-flash']; // Flash handles medium complexity well
            break;
          case 'complex':
            // For complex tasks, try Pro first (still free tier), fallback to other models
            selectedModel = AVAILABLE_MODELS['gemini-2.5-pro'] ?? AVAILABLE_MODELS['gpt-5'] ?? AVAILABLE_MODELS['claude-sonnet-4-5'];
            break;
          default:
            selectedModel = AVAILABLE_MODELS['gemini-2.5-flash'];
        }
      }

      // Guaranteed safe fallback if somehow nothing was selected
      if (!selectedModel) {
        console.warn('[ModelSelector] No model selected, using fallback: gemini-2.5-flash');
        selectedModel = AVAILABLE_MODELS['gemini-2.5-flash'];
      }

      return selectedModel;
    } catch (error) {
      console.error('[ModelSelector] Error in selectModel:', error);
      // Return guaranteed safe fallback on any error (Gemini Flash - FREE tier)
      return AVAILABLE_MODELS['gemini-2.5-flash'] ?? {
        model: 'gemini-2.5-flash',
        maxTokens: 8096,
        temperature: 0.7,
        description: 'Gemini 2.5 Flash (emergency fallback)',
        useCases: [],
        costMultiplier: 0 // FREE tier
      };
    }
  }

  public static getModelExplanation(selectedModel: ModelConfig, context: TaskContext): string {
    const complexity = this.analyzeComplexity(context.messageContent);
    const taskTypes = this.detectTaskType(context);

    return `Selected ${selectedModel.model}${selectedModel.reasoningLevel ? ` (${selectedModel.reasoningLevel} reasoning)` : ''} for ${complexity} ${taskTypes.join('/')} task. ${selectedModel.description}`;
  }

  // Check if GPT-5 is available (fallback to GPT-4 if not)
  public static async isGPT5Available(apiKey: string): Promise<boolean> {
    try {
      // This would need to be implemented based on OpenAI's actual API
      // For now, assume it's available
      return true;
    } catch (error) {
      return false;
    }
  }

  public static getFallbackModel(originalModel: string): ModelConfig {
    // Map GPT-5 models to GPT-4 equivalents if GPT-5 unavailable
    const fallbackMap: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-5-mini': 'gpt-4o-mini',
      'gpt-5-nano': 'gpt-4o-mini'
    };

    const fallback = fallbackMap[originalModel] || 'gpt-4o-mini';

    return {
      model: fallback,
      maxTokens: 4096,
      temperature: 0.7,
      description: `Fallback to ${fallback}`,
      useCases: ['fallback'],
      costMultiplier: 1
    };
  }
}

export default ModelSelector;