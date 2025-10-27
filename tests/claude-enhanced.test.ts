/**
 * Claude Enhanced Features Test Suite
 * Tests for Phase 4 Claude API enhancements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeClient } from '../lib/claude-client';
import {
  formatClaudeResponse,
  extractStructuredData,
  optimizePromptForClaude,
  chunkTextForExtendedContext,
  buildClaudeSystemPrompt,
  createClaudeTool,
  validateClaudeResponse,
  analyzeCachingEfficiency,
  extractReasoning,
} from '../lib/claude-utils';

describe('Claude Extended Context Support', () => {
  it('should handle large context chunking', () => {
    const largeText = 'A'.repeat(150000); // ~150K characters
    const chunks = chunkTextForExtendedContext(largeText, {
      maxChunkSize: 100000,
      overlapSize: 1000,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(100000);
    // Verify overlap
    const overlap = chunks[0].slice(-1000);
    expect(chunks[1].startsWith(overlap)).toBe(true);
  });

  it('should preserve paragraph boundaries when chunking', () => {
    const text = 'Paragraph 1.\n\n' + 'A'.repeat(100000) + '\n\nParagraph 2.';
    const chunks = chunkTextForExtendedContext(text, {
      maxChunkSize: 50000,
      preserveParagraphs: true,
    });

    // Should break at paragraph boundaries
    chunks.forEach((chunk) => {
      expect(chunk.endsWith('\n\n') || chunk === chunks[chunks.length - 1]).toBe(true);
    });
  });
});

describe('Claude Citation Extraction', () => {
  const mockResponse: any = {
    id: 'test-123',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'This is based on [Source: research paper] and <cite>scientific study</cite>. According to experts, this is correct.',
      },
    ],
    model: 'claude-sonnet-4-5',
    stopReason: 'end_turn',
    stopSequence: null,
    usage: { inputTokens: 100, outputTokens: 50 },
    cost: 0.001,
  };

  it('should extract citations from response', () => {
    const client = new ClaudeClient({
      apiKey: 'test-key',
      enableCaching: true,
    });

    const citations = client.extractCitations(mockResponse.content[0].text);

    expect(citations.length).toBeGreaterThan(0);
    expect(citations.some((c) => c.text.includes('research paper'))).toBe(true);
    expect(citations.some((c) => c.text.includes('scientific study'))).toBe(true);
  });

  it('should format response with citations', () => {
    const formatted = formatClaudeResponse({
      ...mockResponse,
      citations: [
        { text: 'research paper', source: 'research paper', confidence: 0.9 },
        { text: 'scientific study', confidence: 0.8 },
      ],
    });

    expect(formatted.citations.length).toBe(2);
    expect(formatted.formattedText).toContain('**Sources:**');
  });
});

describe('Claude Prompt Optimization', () => {
  it('should optimize prompt for analysis tasks', () => {
    const prompt = 'Analyze this data';
    const optimized = optimizePromptForClaude(prompt, {
      taskType: 'analysis',
      requestCitations: true,
    });

    expect(optimized).toContain('Analyze thoroughly');
    expect(optimized).toContain('cite your sources');
  });

  it('should optimize prompt for coding tasks', () => {
    const prompt = 'Write a function';
    const optimized = optimizePromptForClaude(prompt, {
      taskType: 'coding',
      requestStructuredOutput: true,
      outputFormat: 'markdown',
    });

    expect(optimized).toContain('clean, well-documented code');
    expect(optimized).toContain('markdown format');
  });

  it('should wrap long prompts in XML tags', () => {
    const longPrompt = 'A'.repeat(600);
    const optimized = optimizePromptForClaude(longPrompt);

    expect(optimized).toContain('<task>');
    expect(optimized).toContain('</task>');
  });
});

describe('Claude System Prompt Builder', () => {
  it('should build comprehensive system prompt', () => {
    const systemPrompt = buildClaudeSystemPrompt({
      role: 'an expert data analyst',
      capabilities: ['data analysis', 'visualization', 'insights generation'],
      guidelines: ['Be concise', 'Use evidence', 'Cite sources'],
      context: 'Working with financial data',
      examples: [
        {
          input: 'Analyze revenue',
          output: 'Revenue increased 15% YoY',
        },
      ],
    });

    expect(systemPrompt).toContain('expert data analyst');
    expect(systemPrompt).toContain('**Your Capabilities:**');
    expect(systemPrompt).toContain('**Guidelines:**');
    expect(systemPrompt).toContain('**Context:**');
    expect(systemPrompt).toContain('**Examples:**');
  });
});

describe('Claude Tool Creation', () => {
  it('should create valid tool definition', () => {
    const tool = createClaudeTool(
      'search_database',
      'Search the database for records',
      {
        query: {
          type: 'string',
          description: 'Search query',
          required: true,
        },
        limit: {
          type: 'number',
          description: 'Max results',
          required: false,
        },
        category: {
          type: 'string',
          description: 'Filter by category',
          enum: ['users', 'products', 'orders'],
        },
      }
    );

    expect(tool.name).toBe('search_database');
    expect(tool.input_schema.type).toBe('object');
    expect(tool.input_schema.required).toContain('query');
    expect(tool.input_schema.properties.category.enum).toEqual(['users', 'products', 'orders']);
  });
});

describe('Claude Response Validation', () => {
  it('should detect complete responses', () => {
    const completeResponse: any = {
      id: 'test-123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'This is a complete response.' }],
      model: 'claude-sonnet-4-5',
      stopReason: 'end_turn',
      stopSequence: null,
      usage: { inputTokens: 100, outputTokens: 50 },
      cost: 0.001,
    };

    const validation = validateClaudeResponse(completeResponse);

    expect(validation.isComplete).toBe(true);
    expect(validation.quality).toBe('high');
    expect(validation.issues).toHaveLength(0);
  });

  it('should detect truncated responses', () => {
    const truncatedResponse: any = {
      id: 'test-123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'This is incomplete' }],
      model: 'claude-sonnet-4-5',
      stopReason: 'max_tokens',
      stopSequence: null,
      usage: { inputTokens: 100, outputTokens: 4096 },
      cost: 0.01,
    };

    const validation = validateClaudeResponse(truncatedResponse);

    expect(validation.isComplete).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
    expect(validation.issues.some((i) => i.includes('truncated'))).toBe(true);
  });
});

describe('Claude Caching Analytics', () => {
  it('should calculate high cache hit rate', () => {
    const analytics = analyzeCachingEfficiency({
      inputTokens: 10000,
      outputTokens: 500,
      cacheReadInputTokens: 9000,
      cacheCreationInputTokens: 1000,
    });

    expect(analytics.cacheHitRate).toBeGreaterThan(80);
    expect(analytics.recommendation).toContain('Excellent');
  });

  it('should recommend improvements for low cache hit rate', () => {
    const analytics = analyzeCachingEfficiency({
      inputTokens: 10000,
      outputTokens: 500,
      cacheReadInputTokens: 1000,
    });

    expect(analytics.cacheHitRate).toBeLessThan(20);
    expect(analytics.recommendation).toContain('optimize');
  });
});

describe('Claude Structured Data Extraction', () => {
  it('should extract JSON from code blocks', () => {
    const response: any = {
      id: 'test-123',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Here is the data:\n```json\n{"name": "test", "value": 42}\n```',
        },
      ],
      model: 'claude-sonnet-4-5',
      stopReason: 'end_turn',
      stopSequence: null,
      usage: { inputTokens: 100, outputTokens: 50 },
      cost: 0.001,
    };

    const data = extractStructuredData(response);

    expect(data).toEqual({ name: 'test', value: 42 });
  });

  it('should extract JSON from plain text', () => {
    const response: any = {
      id: 'test-123',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'The result is {"status": "success", "count": 10}',
        },
      ],
      model: 'claude-sonnet-4-5',
      stopReason: 'end_turn',
      stopSequence: null,
      usage: { inputTokens: 100, outputTokens: 50 },
      cost: 0.001,
    };

    const data = extractStructuredData(response);

    expect(data).toEqual({ status: 'success', count: 10 });
  });
});

describe('Claude Reasoning Extraction', () => {
  it('should extract step-by-step reasoning', () => {
    const response: any = {
      id: 'test-123',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: `Let me analyze this step by step:
1. First, we identify the problem
2. Then, we gather evidence
3. Finally, we draw conclusions

Therefore, the answer is clear.`,
        },
      ],
      model: 'claude-sonnet-4-5',
      stopReason: 'end_turn',
      stopSequence: null,
      usage: { inputTokens: 100, outputTokens: 50 },
      cost: 0.001,
    };

    const reasoning = extractReasoning(response);

    expect(reasoning.reasoning.length).toBeGreaterThan(0);
    expect(reasoning.conclusion).toContain('answer is clear');
  });
});

describe('Claude Vision Support', () => {
  it('should create image message correctly', () => {
    const client = new ClaudeClient({
      apiKey: 'test-key',
      enableVision: true,
    });

    const imageMessage = client.addImageToMessage(
      'base64data',
      'image/jpeg',
      'What is in this image?'
    );

    expect(imageMessage.role).toBe('user');
    expect(Array.isArray(imageMessage.content)).toBe(true);
    const content = imageMessage.content as any[];
    expect(content.some((c) => c.type === 'text')).toBe(true);
    expect(content.some((c) => c.type === 'image')).toBe(true);
  });
});

describe('Claude Cache Savings Estimation', () => {
  it('should estimate significant savings with caching', () => {
    const client = new ClaudeClient({
      apiKey: 'test-key',
    });

    const estimate = client.estimateCacheSavings(
      10000, // input tokens
      8000,  // cached tokens
      'claude-sonnet-4-5'
    );

    expect(estimate.savings).toBeGreaterThan(0);
    expect(estimate.savingsPercent).toBeGreaterThan(50);
    expect(estimate.withCache).toBeLessThan(estimate.withoutCache);
  });
});

describe('Claude Model Selection', () => {
  it('should select appropriate model for coding tasks', () => {
    const client = new ClaudeClient({
      apiKey: 'test-key',
    });

    const model = client.selectModelForTask('Write code to sort an array', 'quality');

    expect(model).toBe('claude-sonnet-4-5');
  });

  it('should select fast model for simple chat', () => {
    const client = new ClaudeClient({
      apiKey: 'test-key',
    });

    const model = client.selectModelForTask('Say hello', 'speed');

    expect(['claude-haiku-4-5', 'claude-3-5-haiku', 'claude-3-haiku']).toContain(model);
  });

  it('should select powerful model for complex reasoning', () => {
    const client = new ClaudeClient({
      apiKey: 'test-key',
    });

    const model = client.selectModelForTask('Analyze complex strategic decision', 'quality');

    expect(['claude-opus-4-1', 'claude-4-sonnet']).toContain(model);
  });
});
