/**
 * Claude Utility Functions - Phase 4
 *
 * Helper functions for working with Claude API responses and features
 *
 * Features:
 * - Response formatting
 * - Citation extraction and display
 * - Prompt optimization for Claude
 * - Extended context management
 * - Tool/function calling helpers
 */

import type { ClaudeResponse, ClaudeCitation, ClaudeTool, ClaudeMessage } from './claude-client';

/**
 * Format Claude response for better display
 * Handles markdown, code blocks, citations, and structured outputs
 */
export function formatClaudeResponse(response: ClaudeResponse): {
  text: string;
  formattedText: string;
  citations: ClaudeCitation[];
  hasCodeBlocks: boolean;
  hasMarkdown: boolean;
} {
  const textContent = response.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as any).text)
    .join('\n\n');

  // Detect features
  const hasCodeBlocks = /```[\s\S]*?```/.test(textContent);
  const hasMarkdown = /^#{1,6}\s|^\*\s|^\d+\.\s|^\-\s|\*\*.*\*\*/m.test(textContent);

  // Format citations inline
  let formattedText = textContent;
  if (response.citations && response.citations.length > 0) {
    response.citations.forEach((citation, index) => {
      const citationMark = `[${index + 1}]`;
      if (citation.location) {
        formattedText =
          formattedText.slice(0, citation.location.end) +
          citationMark +
          formattedText.slice(citation.location.end);
      }
    });

    // Add citation references at the end
    formattedText += '\n\n---\n**Sources:**\n';
    response.citations.forEach((citation, index) => {
      formattedText += `[${index + 1}] ${citation.source || citation.text}\n`;
    });
  }

  return {
    text: textContent,
    formattedText,
    citations: response.citations || [],
    hasCodeBlocks,
    hasMarkdown,
  };
}

/**
 * Extract structured data from Claude response
 * Useful for JSON outputs or structured information
 */
export function extractStructuredData<T = any>(response: ClaudeResponse): T | null {
  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as any).text)
    .join('');

  // Try to find JSON in code blocks first
  const jsonCodeBlock = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonCodeBlock) {
    try {
      return JSON.parse(jsonCodeBlock[1]);
    } catch (error) {
      console.warn('[Claude] Failed to parse JSON from code block:', error);
    }
  }

  // Try to find JSON object or array anywhere in text
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn('[Claude] Failed to parse JSON from text:', error);
    }
  }

  return null;
}

/**
 * Display citations in a user-friendly format
 */
export function displayCitations(citations: ClaudeCitation[]): string {
  if (citations.length === 0) {
    return '';
  }

  let output = '\n\n**Sources Referenced:**\n';
  citations.forEach((citation, index) => {
    const confidence = citation.confidence
      ? ` (${Math.round(citation.confidence * 100)}% confidence)`
      : '';
    output += `${index + 1}. ${citation.source || citation.text}${confidence}\n`;
  });

  return output;
}

/**
 * Optimize prompt for Claude's strengths
 * Claude performs better with clear structure and explicit instructions
 */
export function optimizePromptForClaude(
  prompt: string,
  options?: {
    taskType?: 'analysis' | 'coding' | 'reasoning' | 'creative' | 'conversation';
    requestCitations?: boolean;
    requestStructuredOutput?: boolean;
    outputFormat?: 'markdown' | 'json' | 'plaintext';
  }
): string {
  let optimized = prompt;

  // Add task-specific instructions
  if (options?.taskType) {
    const taskInstructions = {
      analysis: 'Analyze thoroughly and provide detailed insights with evidence.',
      coding: 'Write clean, well-documented code following best practices.',
      reasoning: 'Think step-by-step and explain your reasoning process clearly.',
      creative: 'Be creative and engaging while maintaining clarity.',
      conversation: 'Respond naturally and conversationally.',
    };
    optimized = `${taskInstructions[options.taskType]}\n\n${optimized}`;
  }

  // Request citations if needed
  if (options?.requestCitations) {
    optimized += '\n\nPlease cite your sources using [Source: name] format.';
  }

  // Request structured output
  if (options?.requestStructuredOutput) {
    const format = options.outputFormat || 'markdown';
    optimized += `\n\nProvide your response in ${format} format with clear structure.`;
  }

  // Add XML tags for complex tasks (Claude performs well with XML)
  if (prompt.length > 500) {
    optimized = `<task>\n${optimized}\n</task>`;
  }

  return optimized;
}

/**
 * Chunk large text for extended context processing
 * Handles up to 200K tokens by intelligently splitting content
 */
export function chunkTextForExtendedContext(
  text: string,
  options?: {
    maxChunkSize?: number;
    overlapSize?: number;
    preserveParagraphs?: boolean;
  }
): string[] {
  const maxChunkSize = options?.maxChunkSize || 100000; // ~100K tokens
  const overlapSize = options?.overlapSize || 1000;
  const preserveParagraphs = options?.preserveParagraphs ?? true;

  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let chunkEnd = Math.min(currentIndex + maxChunkSize, text.length);

    // Try to break at paragraph boundary if requested
    if (preserveParagraphs && chunkEnd < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', chunkEnd);
      if (lastParagraph > currentIndex) {
        chunkEnd = lastParagraph + 2;
      }
    }

    chunks.push(text.slice(currentIndex, chunkEnd));
    currentIndex = chunkEnd - overlapSize;
  }

  return chunks;
}

/**
 * Build a system prompt optimized for Claude
 */
export function buildClaudeSystemPrompt(components: {
  role?: string;
  capabilities?: string[];
  guidelines?: string[];
  context?: string;
  examples?: Array<{ input: string; output: string }>;
}): string {
  let prompt = '';

  // Role definition
  if (components.role) {
    prompt += `You are ${components.role}.\n\n`;
  }

  // Capabilities
  if (components.capabilities && components.capabilities.length > 0) {
    prompt += '**Your Capabilities:**\n';
    components.capabilities.forEach((cap) => {
      prompt += `- ${cap}\n`;
    });
    prompt += '\n';
  }

  // Guidelines
  if (components.guidelines && components.guidelines.length > 0) {
    prompt += '**Guidelines:**\n';
    components.guidelines.forEach((guide) => {
      prompt += `- ${guide}\n`;
    });
    prompt += '\n';
  }

  // Context
  if (components.context) {
    prompt += `**Context:**\n${components.context}\n\n`;
  }

  // Examples (Claude learns well from examples)
  if (components.examples && components.examples.length > 0) {
    prompt += '**Examples:**\n';
    components.examples.forEach((example, index) => {
      prompt += `\nExample ${index + 1}:\n`;
      prompt += `Input: ${example.input}\n`;
      prompt += `Output: ${example.output}\n`;
    });
    prompt += '\n';
  }

  return prompt.trim();
}

/**
 * Create a tool/function definition for Claude
 */
export function createClaudeTool(
  name: string,
  description: string,
  parameters: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required?: boolean;
    enum?: string[];
  }>
): ClaudeTool {
  const required: string[] = [];
  const properties: Record<string, any> = {};

  Object.entries(parameters).forEach(([key, param]) => {
    if (param.required) {
      required.push(key);
    }

    properties[key] = {
      type: param.type,
      description: param.description,
    };

    if (param.enum) {
      properties[key].enum = param.enum;
    }
  });

  return {
    name,
    description,
    input_schema: {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    },
  };
}

/**
 * Validate Claude response for completeness
 */
export function validateClaudeResponse(response: ClaudeResponse): {
  isComplete: boolean;
  issues: string[];
  quality: 'high' | 'medium' | 'low';
} {
  const issues: string[] = [];

  // Check if response was truncated
  if (response.stopReason === 'max_tokens') {
    issues.push('Response was truncated due to token limit');
  }

  // Check for empty content
  const textContent = response.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as any).text)
    .join('');

  if (textContent.length === 0) {
    issues.push('Response contains no text content');
  }

  // Check if response seems incomplete (ends mid-sentence)
  if (textContent && !textContent.match(/[.!?]\s*$/)) {
    issues.push('Response may be incomplete (no ending punctuation)');
  }

  // Assess quality
  let quality: 'high' | 'medium' | 'low' = 'high';
  if (issues.length > 2) {
    quality = 'low';
  } else if (issues.length > 0) {
    quality = 'medium';
  }

  return {
    isComplete: issues.length === 0,
    issues,
    quality,
  };
}

/**
 * Calculate prompt caching efficiency
 */
export function analyzeCachingEfficiency(usage: {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}): {
  cacheHitRate: number;
  estimatedSavings: string;
  recommendation: string;
} {
  const cacheRead = usage.cacheReadInputTokens || 0;
  const totalInput = usage.inputTokens;
  const cacheHitRate = totalInput > 0 ? (cacheRead / totalInput) * 100 : 0;

  let recommendation = '';
  if (cacheHitRate > 80) {
    recommendation = 'Excellent caching! You are saving up to 90% on cached tokens.';
  } else if (cacheHitRate > 50) {
    recommendation = 'Good caching efficiency. Consider caching more of your system prompts.';
  } else if (cacheHitRate > 0) {
    recommendation = 'Some caching benefit, but you could optimize further.';
  } else {
    recommendation = 'No cache hits detected. Enable prompt caching for cost savings.';
  }

  const estimatedSavings = cacheHitRate > 0
    ? `~${Math.round(cacheHitRate * 0.9)}% cost reduction on input tokens`
    : 'Enable caching to save costs';

  return {
    cacheHitRate,
    estimatedSavings,
    recommendation,
  };
}

/**
 * Merge multiple Claude messages into conversation format
 */
export function buildConversation(messages: Array<{
  role: 'user' | 'assistant';
  content: string;
}>): ClaudeMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Extract thinking/reasoning from Claude response
 * Claude often includes step-by-step reasoning
 */
export function extractReasoning(response: ClaudeResponse): {
  reasoning: string[];
  conclusion: string;
} {
  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as any).text)
    .join('\n');

  // Look for numbered steps or bullet points
  const stepPattern = /(?:^|\n)(?:\d+\.|[-*])\s+(.+?)(?=\n(?:\d+\.|[-*])|$)/g;
  const reasoning: string[] = [];
  let match;

  while ((match = stepPattern.exec(text)) !== null) {
    reasoning.push(match[1].trim());
  }

  // Extract conclusion (usually last paragraph)
  const paragraphs = text.split('\n\n');
  const conclusion = paragraphs[paragraphs.length - 1].trim();

  return {
    reasoning,
    conclusion,
  };
}
