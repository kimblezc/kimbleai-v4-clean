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
  'gpt-4o': {
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'OpenAI GPT-4o - Most capable model for complex reasoning',
    useCases: ['complex analysis', 'advanced reasoning', 'research', 'deep technical questions'],
    costMultiplier: 10 // Most expensive but most capable
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'OpenAI GPT-4o Mini - Balanced performance and cost',
    useCases: ['code generation', 'detailed explanations', 'project planning'],
    costMultiplier: 3
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'GPT-4 Turbo - Fast and efficient for most tasks',
    useCases: ['general chat', 'simple questions', 'creative writing'],
    costMultiplier: 6
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    maxTokens: 4096,
    temperature: 0.7,
    description: 'GPT-3.5 Turbo - Cost-effective for simple tasks',
    useCases: ['routine tasks', 'file processing', 'quick answers', 'basic chat'],
    costMultiplier: 1 // Baseline cost
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
    const complexity = this.analyzeComplexity(context.messageContent);
    const taskTypes = this.detectTaskType(context);
    const userPref = context.userPreference || 'quality';

    // Priority selection logic - using GPT-5 models
    if (userPref === 'cost' && complexity === 'simple') {
      return GPT5_MODELS['gpt-5-nano'];
    }

    if (userPref === 'speed' && !taskTypes.includes('reasoning') && !taskTypes.includes('analysis')) {
      return GPT5_MODELS['gpt-5-mini'];
    }

    // Task-specific selection
    if (taskTypes.includes('coding') && complexity === 'complex') {
      return GPT5_MODELS['gpt-5']; // Best coding performance with GPT-5
    }

    if (taskTypes.includes('reasoning') || taskTypes.includes('analysis')) {
      return complexity === 'complex' ? GPT5_MODELS['gpt-5'] : GPT5_MODELS['gpt-5-medium'];
    }

    if (taskTypes.includes('file_processing')) {
      return GPT5_MODELS['gpt-5-mini']; // Good balance for file tasks
    }

    if (taskTypes.includes('creative')) {
      return complexity === 'simple' ? GPT5_MODELS['gpt-5-mini'] : GPT5_MODELS['gpt-5-medium'];
    }

    // Default selection based on complexity
    switch (complexity) {
      case 'simple':
        return GPT5_MODELS['gpt-5-nano'];
      case 'medium':
        return GPT5_MODELS['gpt-5-mini'];
      case 'complex':
        return GPT5_MODELS['gpt-5-low']; // Balance performance and cost
      default:
        return GPT5_MODELS['gpt-4o-mini']; // Fallback to GPT-4 if GPT-5 fails
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