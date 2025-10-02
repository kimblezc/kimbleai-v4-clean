import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/chat/route';
import { createMockNextRequest } from '../helpers/test-utils';
import { MockSupabaseClient } from '../mocks/supabase.mock';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response', tool_calls: null } }],
        }),
      },
    };
    embeddings = {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: Array(1536).fill(0) }],
      }),
    };
  },
}));

// Mock all other dependencies
vi.mock('@/lib/background-indexer', () => ({
  BackgroundIndexer: {
    getInstance: () => ({
      indexMessage: vi.fn().mockResolvedValue({
        messageId: 'test',
        memoryChunksExtracted: 0,
        knowledgeItemsCreated: 0,
        referencesCreated: 0,
        processingTimeMs: 10,
        errors: [],
      }),
    }),
  },
}));

vi.mock('@/lib/auto-reference-butler', () => ({
  AutoReferenceButler: {
    getInstance: () => ({
      gatherRelevantContext: vi.fn().mockResolvedValue({
        relevantKnowledge: [],
        relevantMessages: [],
        relevantFiles: [],
        confidence: 0.8,
      }),
      formatContextForAI: vi.fn().mockReturnValue(''),
    }),
  },
}));

vi.mock('@/lib/model-selector', () => ({
  ModelSelector: {
    selectModel: vi.fn().mockReturnValue({
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.7,
      costMultiplier: 1,
    }),
    getModelExplanation: vi.fn().mockReturnValue(''),
  },
}));

vi.mock('@/lib/zapier-client', () => ({
  zapierClient: {
    sendConversationSaved: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
        on: vi.fn(),
      })),
    },
    gmail: vi.fn(),
    drive: vi.fn(),
  },
}));

vi.mock('@/app/api/google/workspace/rag-system', () => ({
  WorkspaceRAGSystem: vi.fn().mockImplementation(() => ({
    storeConversationWithRAG: vi.fn().mockResolvedValue({
      conversationId: 'test',
      fileId: 'test',
    }),
  })),
}));

describe('Performance Tests - Concurrent Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle 10 concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [{ role: 'user', content: `Test message ${i}` }],
          userId: `user-${i}`,
        },
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests.map((req) => POST(req)));
    const duration = Date.now() - startTime;

    expect(responses.length).toBe(10);
    responses.forEach((res) => {
      expect(res.status).toBeLessThan(500);
    });

    console.log(`10 concurrent requests completed in ${duration}ms`);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });

  it('should handle 50 concurrent requests', async () => {
    const requests = Array.from({ length: 50 }, (_, i) =>
      createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [{ role: 'user', content: `Test message ${i}` }],
          userId: `user-${i % 5}`, // Simulate 5 users making multiple requests
        },
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests.map((req) => POST(req)));
    const duration = Date.now() - startTime;

    const successfulResponses = responses.filter((res) => res.status === 200);

    expect(successfulResponses.length).toBeGreaterThan(40); // At least 80% success rate
    console.log(`50 concurrent requests: ${successfulResponses.length}/50 succeeded in ${duration}ms`);
  });

  it('should maintain performance under load', async () => {
    const iterations = 5;
    const concurrentRequests = 20;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const requests = Array.from({ length: concurrentRequests }, (_, j) =>
        createMockNextRequest({
          method: 'POST',
          url: 'http://localhost:3000/api/chat',
          body: {
            messages: [{ role: 'user', content: `Test ${i}-${j}` }],
          },
        })
      );

      const startTime = Date.now();
      await Promise.all(requests.map((req) => POST(req)));
      const duration = Date.now() - startTime;

      durations.push(duration);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);

    console.log(`Average duration: ${avgDuration}ms, Max duration: ${maxDuration}ms`);

    // Performance should not degrade significantly
    expect(maxDuration).toBeLessThan(avgDuration * 2);
  });

  it('should handle rapid sequential requests from same user', async () => {
    const requests = Array.from({ length: 20 }, (_, i) =>
      createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [{ role: 'user', content: `Message ${i}` }],
          userId: 'user-1',
          conversationId: 'conv-1',
        },
      })
    );

    const startTime = Date.now();
    for (const request of requests) {
      await POST(request);
    }
    const duration = Date.now() - startTime;

    console.log(`20 sequential requests completed in ${duration}ms`);
    expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
  });

  it('should measure response time distribution', async () => {
    const sampleSize = 100;
    const responseTimes: number[] = [];

    for (let i = 0; i < sampleSize; i++) {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [{ role: 'user', content: `Test ${i}` }],
        },
      });

      const startTime = Date.now();
      await POST(request);
      responseTimes.push(Date.now() - startTime);
    }

    const sorted = responseTimes.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sampleSize * 0.5)];
    const p95 = sorted[Math.floor(sampleSize * 0.95)];
    const p99 = sorted[Math.floor(sampleSize * 0.99)];

    console.log(`Response times - P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);

    expect(p50).toBeLessThan(5000); // Median should be under 5 seconds
    expect(p95).toBeLessThan(15000); // 95th percentile under 15 seconds
  });

  it('should handle memory efficiently', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Make many requests
    for (let i = 0; i < 50; i++) {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [{ role: 'user', content: `Test ${i}` }],
        },
      });
      await POST(request);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);

    // Memory increase should be reasonable (< 100MB for 50 requests)
    expect(memoryIncrease).toBeLessThan(100);
  });
});
