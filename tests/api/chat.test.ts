import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/chat/route';
import { createMockNextRequest } from '../helpers/test-utils';
import { setupOpenAIMock } from '../mocks/openai.mock';
import { MockSupabaseClient } from '../mocks/supabase.mock';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is a test response from the AI',
                tool_calls: null,
              },
              finish_reason: 'stop',
            },
          ],
        }),
      },
    };
    embeddings = {
      create: vi.fn().mockResolvedValue({
        data: [
          {
            embedding: Array(1536).fill(0).map(() => Math.random()),
          },
        ],
      }),
    };
  },
}));

// Mock other dependencies
vi.mock('@/lib/background-indexer', () => ({
  BackgroundIndexer: {
    getInstance: () => ({
      indexMessage: vi.fn().mockResolvedValue({
        messageId: 'test',
        memoryChunksExtracted: 5,
        knowledgeItemsCreated: 2,
        referencesCreated: 1,
        processingTimeMs: 100,
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
      formatContextForAI: vi.fn().mockReturnValue('Mock context'),
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
    getModelExplanation: vi.fn().mockReturnValue('Using GPT-4o-mini for this task'),
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
      conversationId: 'test-conv',
      fileId: 'test-file',
    }),
  })),
}));

describe('Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/chat', () => {
    it('should return API status and capabilities', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status', 'OK');
      expect(data).toHaveProperty('service', 'KimbleAI Chat API');
      expect(data).toHaveProperty('features');
      expect(data.features).toHaveProperty('rag', true);
      expect(data.features).toHaveProperty('vectorSearch', true);
      expect(data.features).toHaveProperty('functionCalling', true);
    });

    it('should list available functions', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.functions).toBeInstanceOf(Array);
      expect(data.functions).toContain('get_recent_emails');
      expect(data.functions).toContain('search_google_drive');
    });
  });

  describe('POST /api/chat', () => {
    it('should successfully process a chat message', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'Hello, how are you?' }
          ],
          userId: 'zach',
          conversationId: 'test-conv-1',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('response');
      expect(data).toHaveProperty('saved', true);
      expect(data).toHaveProperty('memoryActive', true);
    });

    it('should return 400 when no messages provided', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'No messages provided');
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid JSON in request body');
    });

    it('should include knowledge base results in response', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'What do you know about my projects?' }
          ],
          userId: 'zach',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('knowledgeItemsFound');
      expect(typeof data.knowledgeItemsFound).toBe('number');
    });

    it('should include model information in response', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'Test message' }
          ],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('modelUsed');
      expect(data.modelUsed).toHaveProperty('model');
      expect(data.modelUsed).toHaveProperty('explanation');
    });

    it('should extract and store facts from conversation', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'My name is John and I live in New York. I am working on Project Phoenix.' }
          ],
          userId: 'zach',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('factsExtracted');
      expect(data.factsExtracted).toBeGreaterThanOrEqual(0);
    });

    it('should handle conversation context', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'What did I just say?' }
          ],
          conversationId: 'test-conv-2',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('response');
    });

    it('should use default userId when not provided', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'Test without userId' }
          ],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('response');
    });

    it('should indicate storage location (Google Drive or Supabase)', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'Test storage location' }
          ],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('storageLocation');
      expect(['google-drive', 'supabase-fallback']).toContain(data.storageLocation);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when OpenAI API fails', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockRejectedValue(new Error('OpenAI API error'));

      vi.mocked(OpenAI).mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
        embeddings: {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: Array(1536).fill(0) }],
          }),
        },
      } as any));

      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'This will fail' }
          ],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });

    it('should handle missing user gracefully', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockError(new Error('User not found'));

      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat',
        body: {
          messages: [
            { role: 'user', content: 'Test with missing user' }
          ],
          userId: 'nonexistent',
        },
      });

      const response = await POST(request);

      // Should handle gracefully or return 404
      expect([404, 500]).toContain(response.status);
    });
  });
});
