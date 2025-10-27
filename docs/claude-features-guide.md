# Claude Enhanced Features Guide - Phase 4

## Overview

This guide covers the enhanced Claude API integration in KimbleAI v4, including extended context support, prompt caching, citations, tool calling, and vision capabilities.

---

## Table of Contents

1. [Extended Context Support (200K Tokens)](#extended-context-support)
2. [Prompt Caching (90% Cost Savings)](#prompt-caching)
3. [Citations & Source Attribution](#citations)
4. [Tool/Function Calling](#tool-calling)
5. [Vision Support](#vision-support)
6. [Streaming Optimization](#streaming)
7. [Best Practices](#best-practices)

---

## Extended Context Support

Claude models support up to 200K tokens of context, enabling analysis of large documents, codebases, and conversations.

### Basic Usage

```typescript
import { ClaudeClient } from '@/lib/claude-client';
import { chunkTextForExtendedContext } from '@/lib/claude-utils';

const client = new ClaudeClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  enableExtendedContext: true,
  maxTokens: 200000,
});

// For very large content, chunk intelligently
const largeDocument = readFileSync('large-doc.txt', 'utf-8');
const chunks = chunkTextForExtendedContext(largeDocument, {
  maxChunkSize: 100000,
  overlapSize: 1000,
  preserveParagraphs: true,
});

// Process each chunk
for (const chunk of chunks) {
  const response = await client.sendMessage([
    { role: 'user', content: `Analyze this section:\n\n${chunk}` }
  ], {
    model: 'claude-sonnet-4-5',
    maxTokens: 4096,
  });
}
```

### Use Cases

- **Large Document Analysis**: Process PDFs, research papers, legal documents
- **Codebase Review**: Analyze entire repositories or large files
- **Long Conversations**: Maintain context across extended chat sessions
- **Multi-Document Synthesis**: Compare and synthesize multiple sources

### Performance Tips

1. **Chunk strategically**: Break at natural boundaries (paragraphs, sections)
2. **Use overlap**: Include 1-2K tokens of overlap between chunks for continuity
3. **Batch processing**: Process chunks in parallel when order doesn't matter
4. **Monitor tokens**: Track usage to optimize chunk sizes

---

## Prompt Caching

Prompt caching can reduce costs by up to 90% for repeated system prompts and common context.

### How It Works

Claude caches parts of your prompt that are marked with `cache_control`. Cached segments are reused across API calls, drastically reducing input token costs.

### Implementation

```typescript
const client = new ClaudeClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  enableCaching: true, // Enabled by default
});

const systemPrompt = `You are an expert software engineer...
[Large system prompt with guidelines, examples, etc.]`;

// The system prompt will be cached automatically
const response = await client.sendMessage([
  { role: 'user', content: 'Write a function to sort an array' }
], {
  system: systemPrompt,
  enableCaching: true,
});

// Subsequent calls with the same system prompt use cached version
const response2 = await client.sendMessage([
  { role: 'user', content: 'Write a function to reverse a string' }
], {
  system: systemPrompt,
  enableCaching: true,
});
```

### Analyze Cache Efficiency

```typescript
import { analyzeCachingEfficiency } from '@/lib/claude-utils';

const analytics = analyzeCachingEfficiency({
  inputTokens: response.usage.inputTokens,
  outputTokens: response.usage.outputTokens,
  cacheReadInputTokens: response.usage.cacheReadInputTokens,
});

console.log(`Cache hit rate: ${analytics.cacheHitRate}%`);
console.log(`Estimated savings: ${analytics.estimatedSavings}`);
console.log(`Recommendation: ${analytics.recommendation}`);
```

### Best Practices

1. **Cache system prompts**: Your main instructions should always be cached
2. **Cache reference material**: Documentation, guidelines, examples
3. **Don't cache user input**: Only cache reusable content
4. **Monitor cache hits**: Track `cacheReadInputTokens` in usage metrics
5. **Minimum size**: Cache content should be at least 1024 tokens for efficiency

### Cost Comparison

| Scenario | Without Caching | With Caching | Savings |
|----------|----------------|--------------|---------|
| System prompt (5K tokens) | $0.015/call | $0.0015/call | 90% |
| Large context (50K tokens) | $0.150/call | $0.015/call | 90% |
| Documentation (20K tokens) | $0.060/call | $0.006/call | 90% |

---

## Citations & Source Attribution

Claude can provide citations and source references in its responses, improving transparency and trust.

### Enable Citation Extraction

```typescript
import { formatClaudeResponse, displayCitations } from '@/lib/claude-utils';

const response = await client.sendMessage([
  {
    role: 'user',
    content: 'What are the benefits of TypeScript? Cite your sources.'
  }
], {
  extractCitations: true,
});

// Format and display citations
const formatted = formatClaudeResponse(response);
console.log(formatted.formattedText);
console.log(displayCitations(formatted.citations));
```

### Citation Formats

Claude recognizes multiple citation patterns:

1. **[Source: name]**: `[Source: TypeScript Handbook]`
2. **<cite>source</cite>**: `<cite>Official Documentation</cite>`
3. **According to [source]**: `According to the research paper`

### Extract Citations Manually

```typescript
const citations = client.extractCitations(responseText);

citations.forEach((citation, index) => {
  console.log(`[${index + 1}] ${citation.source}`);
  console.log(`   Confidence: ${citation.confidence * 100}%`);
  console.log(`   Location: chars ${citation.location.start}-${citation.location.end}`);
});
```

### Request Citations in Prompts

```typescript
import { optimizePromptForClaude } from '@/lib/claude-utils';

const prompt = optimizePromptForClaude(
  'Explain quantum computing',
  {
    taskType: 'analysis',
    requestCitations: true,
  }
);

// Prompt now includes: "Please cite your sources using [Source: name] format."
```

---

## Tool/Function Calling

Claude can call tools/functions to retrieve data, perform actions, or access external systems.

### Define a Tool

```typescript
import { createClaudeTool } from '@/lib/claude-utils';

const searchTool = createClaudeTool(
  'search_database',
  'Search the knowledge base for information',
  {
    query: {
      type: 'string',
      description: 'Search query',
      required: true,
    },
    category: {
      type: 'string',
      description: 'Filter by category',
      enum: ['users', 'products', 'orders'],
    },
    limit: {
      type: 'number',
      description: 'Maximum results to return',
    },
  }
);
```

### Use Tools in Conversation

```typescript
const response = await client.sendMessage([
  {
    role: 'user',
    content: 'Find information about TypeScript in the knowledge base'
  }
], {
  tools: [searchTool],
});

// Check if Claude called the tool
if (response.toolCalls && response.toolCalls.length > 0) {
  for (const toolCall of response.toolCalls) {
    console.log(`Tool: ${toolCall.name}`);
    console.log(`Arguments:`, toolCall.input);

    // Execute the tool
    const result = await executeSearchDatabase(toolCall.input);

    // Send result back to Claude
    const followUp = await client.sendMessage([
      {
        role: 'user',
        content: 'Previous response with tool call...'
      },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I need to search the database' },
          toolCall,
        ]
      },
      {
        role: 'user',
        content: `Tool result: ${JSON.stringify(result)}`
      }
    ]);
  }
}
```

### Built-in Tool Examples

```typescript
// Search tool
const searchTool = createClaudeTool('search', 'Search for information', {
  query: { type: 'string', description: 'Search query', required: true }
});

// Calculator tool
const calcTool = createClaudeTool('calculate', 'Perform calculations', {
  expression: { type: 'string', description: 'Math expression', required: true }
});

// Weather tool
const weatherTool = createClaudeTool('get_weather', 'Get weather data', {
  location: { type: 'string', description: 'City name', required: true }
});
```

---

## Vision Support

Claude can analyze images, screenshots, diagrams, and charts.

### Analyze an Image

```typescript
import fs from 'fs';

const client = new ClaudeClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  enableVision: true,
});

// Read image as base64
const imageData = fs.readFileSync('screenshot.png', 'base64');

const response = await client.analyzeImage(
  imageData,
  'image/png',
  'What does this screenshot show? Describe the UI elements.',
  {
    model: 'claude-sonnet-4-5',
    maxTokens: 2048,
  }
);

console.log(response.content[0].text);
```

### Add Image to Conversation

```typescript
const imageMessage = client.addImageToMessage(
  imageBase64Data,
  'image/jpeg',
  'Can you analyze this chart and explain the trends?'
);

const response = await client.sendMessage([imageMessage], {
  model: 'claude-sonnet-4-5',
});
```

### Supported Image Formats

- **JPEG** (`image/jpeg`)
- **PNG** (`image/png`)
- **GIF** (`image/gif`)
- **WebP** (`image/webp`)

### Vision Use Cases

1. **Screenshot Analysis**: UI/UX review, bug reporting
2. **Chart/Graph Interpretation**: Data visualization analysis
3. **Diagram Understanding**: Architecture diagrams, flowcharts
4. **Document OCR**: Extract text from images
5. **Product Analysis**: Analyze product photos, designs
6. **Medical Imaging**: Initial triage (not diagnostic)

### Tips for Better Vision Results

- Use high-resolution images (but under 5MB)
- Ensure text is readable
- Provide context in the prompt
- Ask specific questions about the image
- Combine with text for multi-modal analysis

---

## Streaming Optimization

Enhanced SSE (Server-Sent Events) streaming for real-time responses.

### Basic Streaming

```typescript
const stream = client.streamMessage([
  {
    role: 'user',
    content: 'Write a long essay about AI'
  }
], {
  model: 'claude-sonnet-4-5',
  maxTokens: 4096,
});

// Stream tokens as they arrive
for await (const chunk of stream) {
  process.stdout.write(chunk); // Real-time output
}
```

### Streaming with Tools

```typescript
const stream = client.streamMessage([
  {
    role: 'user',
    content: 'Search the database and summarize results'
  }
], {
  tools: [searchTool],
  enableCaching: true,
});

for await (const chunk of stream) {
  console.log('Token:', chunk);
}

// Final response includes tool calls and metadata
const finalResponse = await stream.return();
console.log('Tool calls:', finalResponse.toolCalls);
console.log('Cost:', finalResponse.cost);
console.log('Cache efficiency:', finalResponse.usage.cacheReadInputTokens);
```

### Server-Sent Events (SSE) Format

```typescript
// In a Next.js API route
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const claudeStream = client.streamMessage(messages, options);

      for await (const chunk of claudeStream) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
        );
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## Best Practices

### When to Use Claude vs GPT

**Use Claude for:**
- Long-form content and analysis
- Complex reasoning and logic
- Code generation and review
- Document analysis (PDFs, reports)
- Ethical and nuanced discussions
- Large context requirements (>32K tokens)

**Use GPT for:**
- Real-time chat and conversation
- Quick answers and simple tasks
- Image generation (DALL-E)
- Audio transcription (Whisper)
- Structured data extraction
- Function calling with many tools

### Model Selection Guide

| Model | Best For | Context | Cost |
|-------|----------|---------|------|
| Claude Opus 4.1 | Complex reasoning, strategic planning | 200K | Highest |
| Claude Sonnet 4.5 | Coding, technical writing | 200K | Medium |
| Claude Haiku 4.5 | Quick responses, chat | 200K | Low |
| Claude 3.5 Haiku | High-volume, simple tasks | 200K | Very Low |

### Prompt Engineering for Claude

**DO:**
- Be clear and specific
- Use structured formats (XML, markdown)
- Provide examples when possible
- Request citations for factual claims
- Use system prompts for guidelines

**DON'T:**
- Be overly verbose
- Mix multiple unrelated tasks
- Forget to specify output format
- Ignore token limits
- Skip error handling

### Cost Optimization

1. **Enable prompt caching** for repeated system prompts
2. **Use appropriate models** - don't use Opus for simple tasks
3. **Batch requests** when possible
4. **Monitor usage** with cost callbacks
5. **Set reasonable max_tokens** limits
6. **Cache common queries** at application level

### Error Handling

```typescript
try {
  const response = await client.sendMessage(messages, options);
} catch (error) {
  if (error.status === 429) {
    // Rate limit - retry with backoff
    await sleep(1000);
    return retry();
  } else if (error.status === 500) {
    // Server error - fail gracefully
    return fallbackResponse();
  } else {
    // Other errors
    console.error('Claude API error:', error);
    throw error;
  }
}
```

---

## Example: Complete Integration

```typescript
import { ClaudeClient } from '@/lib/claude-client';
import {
  optimizePromptForClaude,
  formatClaudeResponse,
  validateClaudeResponse,
  buildClaudeSystemPrompt,
  createClaudeTool,
  analyzeCachingEfficiency,
} from '@/lib/claude-utils';

// Initialize client
const client = new ClaudeClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: 'claude-sonnet-4-5',
  enableCaching: true,
  enableVision: true,
  onCost: (cost, model) => {
    console.log(`Cost: $${cost.toFixed(4)} (${model})`);
  },
});

// Build system prompt
const systemPrompt = buildClaudeSystemPrompt({
  role: 'an expert software engineer',
  capabilities: [
    'Code generation and review',
    'Architecture design',
    'Bug diagnosis',
  ],
  guidelines: [
    'Write clean, documented code',
    'Follow best practices',
    'Explain your reasoning',
  ],
});

// Create tools
const searchTool = createClaudeTool('search_docs', 'Search documentation', {
  query: { type: 'string', description: 'Search query', required: true }
});

// Optimize user prompt
const userPrompt = optimizePromptForClaude(
  'Write a function to parse JSON safely',
  {
    taskType: 'coding',
    requestStructuredOutput: true,
    outputFormat: 'markdown',
  }
);

// Make request
const response = await client.sendMessage([
  { role: 'user', content: userPrompt }
], {
  system: systemPrompt,
  tools: [searchTool],
  extractCitations: true,
  enableCaching: true,
  maxTokens: 2048,
});

// Validate response
const validation = validateClaudeResponse(response);
if (!validation.isComplete) {
  console.warn('Response incomplete:', validation.issues);
}

// Format for display
const formatted = formatClaudeResponse(response);
console.log(formatted.formattedText);

// Analyze caching
const cacheAnalytics = analyzeCachingEfficiency(response.usage);
console.log(`Cache efficiency: ${cacheAnalytics.cacheHitRate}%`);
console.log(cacheAnalytics.recommendation);

// Track costs
console.log(`Total cost: $${response.cost.toFixed(4)}`);
console.log(`Input tokens: ${response.usage.inputTokens}`);
console.log(`Output tokens: ${response.usage.outputTokens}`);
console.log(`Cached tokens: ${response.usage.cacheReadInputTokens || 0}`);
```

---

## Resources

- [Anthropic Documentation](https://docs.anthropic.com/claude/docs)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Claude Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)
- [API Reference](https://docs.anthropic.com/claude/reference)

---

## Support

For issues or questions:
- Check the [test suite](../tests/claude-enhanced.test.ts) for examples
- Review the [source code](../lib/claude-client.ts) for implementation details
- Contact the development team
