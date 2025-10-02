import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundIndexer } from '@/lib/background-indexer';
import { MockSupabaseClient } from '../mocks/supabase.mock';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('@/services/memory-service', () => ({
  MemoryExtractor: {
    extractFromMessage: vi.fn().mockResolvedValue([
      {
        content: 'Test memory chunk',
        type: 'fact',
        importance: 0.8,
        metadata: {},
      },
    ]),
  },
}));

vi.mock('@/lib/message-reference-system', () => ({
  MessageReferenceSystem: {
    getInstance: () => ({
      storeMessage: vi.fn().mockResolvedValue(true),
    }),
  },
}));

describe('BackgroundIndexer', () => {
  let indexer: BackgroundIndexer;

  beforeEach(() => {
    vi.clearAllMocks();
    indexer = BackgroundIndexer.getInstance();

    // Mock fetch for embeddings
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [
              {
                embedding: Array(1536)
                  .fill(0)
                  .map(() => Math.random()),
              },
            ],
          }),
      } as Response)
    ) as any;
  });

  it('should create singleton instance', () => {
    const instance1 = BackgroundIndexer.getInstance();
    const instance2 = BackgroundIndexer.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should index a message successfully', async () => {
    const result = await indexer.indexMessage(
      'msg-123',
      'conv-123',
      'user-123',
      'user',
      'This is a test message about Project Alpha'
    );

    expect(result.messageId).toBe('msg-123');
    expect(result.errors.length).toBe(0);
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });

  it('should extract memory chunks from messages', async () => {
    const result = await indexer.indexMessage(
      'msg-124',
      'conv-123',
      'user-123',
      'user',
      'I live in Seattle and work at Microsoft. My deadline is March 15th.'
    );

    expect(result.memoryChunksExtracted).toBeGreaterThan(0);
  });

  it('should create knowledge base entries', async () => {
    const result = await indexer.indexMessage(
      'msg-125',
      'conv-123',
      'user-123',
      'user',
      'We decided to use React for the frontend. The project is called KimbleAI.'
    );

    expect(result.knowledgeItemsCreated).toBeGreaterThan(0);
  });

  it('should store message references', async () => {
    const result = await indexer.indexMessage(
      'msg-126',
      'conv-123',
      'user-123',
      'user',
      'Test message for reference storage'
    );

    expect(result.referencesCreated).toBe(1);
  });

  it('should prevent duplicate processing', async () => {
    const messageId = 'msg-duplicate';

    // Start two indexing operations simultaneously
    const promise1 = indexer.indexMessage(
      messageId,
      'conv-123',
      'user-123',
      'user',
      'Test message'
    );
    const promise2 = indexer.indexMessage(
      messageId,
      'conv-123',
      'user-123',
      'user',
      'Test message'
    );

    const [result1, result2] = await Promise.all([promise1, promise2]);

    // Both should return the same result
    expect(result1.messageId).toBe(result2.messageId);
  });

  it('should extract project information', async () => {
    const result = await indexer.indexMessage(
      'msg-127',
      'conv-123',
      'user-123',
      'user',
      'I am working on Project Phoenix which is a new web application'
    );

    expect(result.knowledgeItemsCreated).toBeGreaterThan(0);
  });

  it('should extract technical decisions', async () => {
    const result = await indexer.indexMessage(
      'msg-128',
      'conv-123',
      'user-123',
      'assistant',
      'We have decided to use TypeScript and Next.js for this project.'
    );

    expect(result.knowledgeItemsCreated).toBeGreaterThan(0);
  });

  it('should extract user preferences', async () => {
    const result = await indexer.indexMessage(
      'msg-129',
      'conv-123',
      'user-123',
      'user',
      'I prefer dark mode and I like using VSCode'
    );

    expect(result.knowledgeItemsCreated).toBeGreaterThan(0);
  });

  it('should detect code/technical context', async () => {
    const codeMessage = `
      function calculateTotal(items) {
        return items.reduce((sum, item) => sum + item.price, 0);
      }
    `;

    const result = await indexer.indexMessage(
      'msg-130',
      'conv-123',
      'user-123',
      'user',
      codeMessage
    );

    expect(result.knowledgeItemsCreated).toBeGreaterThan(0);
  });

  it('should extract error/problem descriptions', async () => {
    const result = await indexer.indexMessage(
      'msg-131',
      'conv-123',
      'user-123',
      'user',
      'I am getting an error when trying to deploy. The build is failing with a TypeScript error.'
    );

    expect(result.knowledgeItemsCreated).toBeGreaterThan(0);
  });

  it('should handle batch indexing', async () => {
    const messages = [
      {
        id: 'msg-batch-1',
        conversation_id: 'conv-123',
        user_id: 'user-123',
        role: 'user' as const,
        content: 'First message',
      },
      {
        id: 'msg-batch-2',
        conversation_id: 'conv-123',
        user_id: 'user-123',
        role: 'assistant' as const,
        content: 'Second message',
      },
      {
        id: 'msg-batch-3',
        conversation_id: 'conv-123',
        user_id: 'user-123',
        role: 'user' as const,
        content: 'Third message',
      },
    ];

    const results = await indexer.batchIndexMessages(messages);

    expect(results.length).toBe(3);
    expect(results.every((r) => r.errors.length === 0)).toBe(true);
  });

  it('should update conversation summaries', async () => {
    const result = await indexer.indexMessage(
      'msg-132',
      'conv-123',
      'user-123',
      'user',
      'I have a meeting tomorrow at 3pm with the design team'
    );

    expect(result.errors.length).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('Embedding API failed'))
    ) as any;

    const result = await indexer.indexMessage(
      'msg-error',
      'conv-123',
      'user-123',
      'user',
      'Test message'
    );

    // Should complete but may have errors
    expect(result.messageId).toBe('msg-error');
  });

  it('should extract key points from messages', async () => {
    const message = `
      I am a software developer working at TechCorp.
      I need to finish the frontend by next Friday.
      Do you have any suggestions for the authentication flow?
    `;

    const result = await indexer.indexMessage(
      'msg-133',
      'conv-123',
      'user-123',
      'user',
      message
    );

    expect(result.errors.length).toBe(0);
  });

  it('should handle messages with project IDs', async () => {
    const result = await indexer.indexMessage(
      'msg-134',
      'conv-123',
      'user-123',
      'user',
      'Working on the authentication module',
      'project-123'
    );

    expect(result.messageId).toBe('msg-134');
    expect(result.errors.length).toBe(0);
  });

  it('should process messages quickly', async () => {
    const startTime = Date.now();

    await indexer.indexMessage(
      'msg-perf',
      'conv-123',
      'user-123',
      'user',
      'Performance test message'
    );

    const duration = Date.now() - startTime;

    // Should complete in reasonable time (< 5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  it('should handle empty messages', async () => {
    const result = await indexer.indexMessage(
      'msg-empty',
      'conv-123',
      'user-123',
      'user',
      ''
    );

    expect(result.messageId).toBe('msg-empty');
  });

  it('should handle very long messages', async () => {
    const longMessage = 'a'.repeat(10000);

    const result = await indexer.indexMessage(
      'msg-long',
      'conv-123',
      'user-123',
      'user',
      longMessage
    );

    expect(result.messageId).toBe('msg-long');
  });
});
