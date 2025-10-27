/**
 * Claude API Usage Examples - Phase 4
 *
 * Practical examples demonstrating the enhanced Claude features
 */

import { ClaudeClient } from '../lib/claude-client';
import {
  formatClaudeResponse,
  optimizePromptForClaude,
  buildClaudeSystemPrompt,
  createClaudeTool,
  chunkTextForExtendedContext,
  analyzeCachingEfficiency,
} from '../lib/claude-utils';

// Initialize Claude client
const claude = new ClaudeClient({
  apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key',
  defaultModel: 'claude-sonnet-4-5',
  enableCaching: true,
  enableVision: true,
  onCost: (cost, model) => {
    console.log(`Cost: $${cost.toFixed(4)} (${model})`);
  },
});

/**
 * Example 1: Basic Chat with Prompt Caching
 */
export async function example1_BasicChatWithCaching() {
  console.log('\n=== Example 1: Basic Chat with Caching ===\n');

  const systemPrompt = buildClaudeSystemPrompt({
    role: 'a helpful AI assistant',
    capabilities: [
      'Answer questions accurately',
      'Provide detailed explanations',
      'Cite sources when possible',
    ],
    guidelines: [
      'Be concise but thorough',
      'Use examples to clarify',
      'Admit when unsure',
    ],
  });

  // First call - creates cache
  const response1 = await claude.sendMessage(
    [{ role: 'user', content: 'Explain quantum computing' }],
    {
      system: systemPrompt,
      enableCaching: true,
      extractCitations: true,
    }
  );

  console.log('Response 1:');
  console.log(formatClaudeResponse(response1).formattedText);

  // Second call - uses cache
  const response2 = await claude.sendMessage(
    [{ role: 'user', content: 'What are qubits?' }],
    {
      system: systemPrompt,
      enableCaching: true,
    }
  );

  console.log('\nResponse 2:');
  console.log(formatClaudeResponse(response2).text);

  // Analyze caching efficiency
  const analytics = analyzeCachingEfficiency(response2.usage);
  console.log(`\nCache Hit Rate: ${analytics.cacheHitRate.toFixed(1)}%`);
  console.log(`Savings: ${analytics.estimatedSavings}`);
}

/**
 * Example 2: Code Generation with Tool Calling
 */
export async function example2_CodeGenerationWithTools() {
  console.log('\n=== Example 2: Code Generation with Tools ===\n');

  // Define a tool for searching documentation
  const searchDocsTool = createClaudeTool(
    'search_documentation',
    'Search TypeScript documentation for API information',
    {
      query: {
        type: 'string',
        description: 'Search query',
        required: true,
      },
      section: {
        type: 'string',
        description: 'Documentation section',
        enum: ['basics', 'advanced', 'reference'],
      },
    }
  );

  const response = await claude.sendMessage(
    [
      {
        role: 'user',
        content: 'Write a TypeScript function to safely parse JSON',
      },
    ],
    {
      tools: [searchDocsTool],
      maxTokens: 2048,
    }
  );

  // Check if Claude called any tools
  if (response.toolCalls && response.toolCalls.length > 0) {
    console.log('Tools called:');
    response.toolCalls.forEach((tool) => {
      console.log(`- ${tool.name}: ${JSON.stringify(tool.input)}`);
    });
  }

  console.log('\nGenerated Code:');
  console.log(formatClaudeResponse(response).text);
}

/**
 * Example 3: Extended Context - Large Document Analysis
 */
export async function example3_ExtendedContextAnalysis() {
  console.log('\n=== Example 3: Extended Context Analysis ===\n');

  // Simulate large document (you would read from file)
  const largeDocument = `
    [Imagine this is a 100-page research paper...]
    ${Array(1000)
      .fill(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
      )
      .join('')}
  `;

  // Chunk the document intelligently
  const chunks = chunkTextForExtendedContext(largeDocument, {
    maxChunkSize: 50000,
    overlapSize: 1000,
    preserveParagraphs: true,
  });

  console.log(`Document split into ${chunks.length} chunks`);

  // Analyze each chunk
  for (let i = 0; i < chunks.length; i++) {
    console.log(`\nAnalyzing chunk ${i + 1}/${chunks.length}...`);

    const response = await claude.sendMessage(
      [
        {
          role: 'user',
          content: `Summarize the key points from this section:\n\n${chunks[i]}`,
        },
      ],
      {
        model: 'claude-sonnet-4-5',
        maxTokens: 1024,
      }
    );

    console.log(formatClaudeResponse(response).text.substring(0, 200) + '...');
  }
}

/**
 * Example 4: Vision - Image Analysis
 */
export async function example4_VisionAnalysis() {
  console.log('\n=== Example 4: Vision Analysis ===\n');

  // In real usage, you would read an actual image file
  // const imageData = fs.readFileSync('screenshot.png', 'base64');

  // For demonstration purposes
  const demoImageBase64 = 'base64-encoded-image-data-here';

  try {
    const response = await claude.analyzeImage(
      demoImageBase64,
      'image/png',
      'Describe what you see in this screenshot. What UI elements are present?',
      {
        model: 'claude-sonnet-4-5',
        maxTokens: 1024,
      }
    );

    console.log('Image Analysis:');
    console.log(formatClaudeResponse(response).text);
  } catch (error: any) {
    console.log('Note: This example requires a real base64-encoded image');
    console.log('Error:', error.message);
  }
}

/**
 * Example 5: Streaming Responses
 */
export async function example5_StreamingResponse() {
  console.log('\n=== Example 5: Streaming Response ===\n');

  const prompt = optimizePromptForClaude(
    'Write a detailed explanation of machine learning',
    {
      taskType: 'creative',
      requestStructuredOutput: true,
      outputFormat: 'markdown',
    }
  );

  console.log('Streaming response (real-time output):\n');

  const stream = claude.streamMessage(
    [{ role: 'user', content: prompt }],
    {
      model: 'claude-sonnet-4-5',
      maxTokens: 2048,
    }
  );

  // Stream tokens as they arrive
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  // Get final response metadata
  const finalResponse = await stream.return();
  console.log(`\n\nTotal tokens: ${finalResponse.usage.inputTokens + finalResponse.usage.outputTokens}`);
  console.log(`Cost: $${finalResponse.cost.toFixed(4)}`);
}

/**
 * Example 6: Prompt Optimization
 */
export async function example6_PromptOptimization() {
  console.log('\n=== Example 6: Prompt Optimization ===\n');

  // Basic prompt
  const basicPrompt = 'Explain TypeScript generics';

  // Optimized prompt
  const optimizedPrompt = optimizePromptForClaude(basicPrompt, {
    taskType: 'coding',
    requestCitations: true,
    requestStructuredOutput: true,
    outputFormat: 'markdown',
  });

  console.log('Original Prompt:');
  console.log(basicPrompt);
  console.log('\nOptimized Prompt:');
  console.log(optimizedPrompt);

  const response = await claude.sendMessage(
    [{ role: 'user', content: optimizedPrompt }],
    {
      extractCitations: true,
    }
  );

  const formatted = formatClaudeResponse(response);
  console.log('\nResponse:');
  console.log(formatted.formattedText);

  if (formatted.hasCodeBlocks) {
    console.log('\n✓ Response contains code examples');
  }
  if (formatted.hasMarkdown) {
    console.log('✓ Response uses markdown formatting');
  }
  if (formatted.citations.length > 0) {
    console.log(`✓ Response includes ${formatted.citations.length} citations`);
  }
}

/**
 * Example 7: Multi-turn Conversation
 */
export async function example7_MultiTurnConversation() {
  console.log('\n=== Example 7: Multi-turn Conversation ===\n');

  const systemPrompt = buildClaudeSystemPrompt({
    role: 'a patient programming tutor',
    capabilities: [
      'Explain complex concepts simply',
      'Provide code examples',
      'Answer follow-up questions',
    ],
    guidelines: ['Be encouraging', 'Break down complex topics', 'Use analogies'],
  });

  // Turn 1
  const response1 = await claude.sendMessage(
    [{ role: 'user', content: 'What is async/await in JavaScript?' }],
    { system: systemPrompt, enableCaching: true }
  );

  console.log('Turn 1:');
  console.log(formatClaudeResponse(response1).text.substring(0, 300) + '...\n');

  // Turn 2 - follow-up question
  const response2 = await claude.sendMessage(
    [
      { role: 'user', content: 'What is async/await in JavaScript?' },
      { role: 'assistant', content: response1.content[0].text },
      { role: 'user', content: 'Can you show me an example with error handling?' },
    ],
    { system: systemPrompt, enableCaching: true }
  );

  console.log('Turn 2:');
  console.log(formatClaudeResponse(response2).text.substring(0, 300) + '...\n');

  // Analyze caching
  const analytics = analyzeCachingEfficiency(response2.usage);
  console.log(`Cache efficiency: ${analytics.cacheHitRate.toFixed(1)}%`);
}

/**
 * Example 8: Cost Comparison Across Models
 */
export async function example8_CostComparison() {
  console.log('\n=== Example 8: Cost Comparison ===\n');

  const prompt = 'Write a function to validate email addresses';

  // Test different models
  const models: Array<
    'claude-opus-4-1' | 'claude-sonnet-4-5' | 'claude-haiku-4-5'
  > = ['claude-opus-4-1', 'claude-sonnet-4-5', 'claude-haiku-4-5'];

  for (const model of models) {
    console.log(`\nTesting ${model}...`);

    const response = await claude.sendMessage(
      [{ role: 'user', content: prompt }],
      {
        model,
        maxTokens: 1024,
      }
    );

    console.log(`Cost: $${response.cost.toFixed(4)}`);
    console.log(`Quality: ${formatClaudeResponse(response).text.length} chars`);

    // Get cost estimate for 1000 requests
    const costEstimate = claude.estimateCacheSavings(
      response.usage.inputTokens * 1000,
      response.usage.inputTokens * 900, // 90% cache hit rate
      model
    );

    console.log(`Monthly cost (1K requests): $${(response.cost * 1000).toFixed(2)}`);
    console.log(
      `With caching: $${(costEstimate.withCache * 1000).toFixed(2)} (${costEstimate.savingsPercent.toFixed(1)}% savings)`
    );
  }
}

/**
 * Example 9: Citations and Source Attribution
 */
export async function example9_CitationsAndSources() {
  console.log('\n=== Example 9: Citations and Sources ===\n');

  const prompt = optimizePromptForClaude(
    'What are the main causes of climate change?',
    {
      taskType: 'analysis',
      requestCitations: true,
    }
  );

  const response = await claude.sendMessage(
    [{ role: 'user', content: prompt }],
    {
      extractCitations: true,
    }
  );

  const formatted = formatClaudeResponse(response);

  console.log('Response with citations:');
  console.log(formatted.formattedText);

  if (formatted.citations.length > 0) {
    console.log(`\n\nFound ${formatted.citations.length} citations:`);
    formatted.citations.forEach((citation, index) => {
      console.log(`${index + 1}. ${citation.text}`);
      if (citation.confidence) {
        console.log(`   Confidence: ${(citation.confidence * 100).toFixed(0)}%`);
      }
    });
  }
}

/**
 * Example 10: Error Handling and Validation
 */
export async function example10_ErrorHandling() {
  console.log('\n=== Example 10: Error Handling ===\n');

  try {
    const response = await claude.sendMessage(
      [{ role: 'user', content: 'Explain quantum physics in detail' }],
      {
        model: 'claude-sonnet-4-5',
        maxTokens: 100, // Intentionally low to trigger truncation
      }
    );

    // Validate response
    const { isComplete, issues, quality } = require('../lib/claude-utils').validateClaudeResponse(
      response
    );

    console.log(`Response quality: ${quality}`);
    console.log(`Complete: ${isComplete}`);

    if (issues.length > 0) {
      console.log('\nIssues detected:');
      issues.forEach((issue) => {
        console.log(`- ${issue}`);
      });
    }

    // Try to extract structured data
    const structuredData = require('../lib/claude-utils').extractStructuredData(
      response
    );
    if (structuredData) {
      console.log('\nExtracted structured data:', structuredData);
    }
  } catch (error: any) {
    console.error('Error:', error.message);

    // Implement retry logic
    if (error.status === 429) {
      console.log('Rate limit hit - implement exponential backoff');
    } else if (error.status === 500) {
      console.log('Server error - try again or use fallback model');
    }
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('Claude Enhanced Features - Usage Examples');
  console.log('='.repeat(60));

  // Note: Comment out examples that require API key or real data
  // await example1_BasicChatWithCaching();
  // await example2_CodeGenerationWithTools();
  // await example3_ExtendedContextAnalysis();
  // await example4_VisionAnalysis();
  // await example5_StreamingResponse();
  // await example6_PromptOptimization();
  // await example7_MultiTurnConversation();
  // await example8_CostComparison();
  // await example9_CitationsAndSources();
  // await example10_ErrorHandling();

  console.log('\n' + '='.repeat(60));
  console.log('Examples complete!');
  console.log('='.repeat(60));
}

// Uncomment to run when executed directly
// runAllExamples().catch(console.error);
