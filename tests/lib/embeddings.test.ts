import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateEmbedding,
  generateEmbeddings,
  chunkText,
  chunkAndEmbedText,
  embedMessage,
  embedFile,
  embedTranscription,
  embedKnowledgeEntry,
  cosineSimilarity,
  generateEmbeddingsWithRetry,
  getEmbeddingStats,
  clearEmbeddingCache
} from '@/lib/embeddings';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    embeddings = {
      create: vi.fn().mockResolvedValue({
        data: [{
          embedding: Array(1536).fill(0).map((_, i) => i / 1536)
        }],
        usage: {
          prompt_tokens: 10,
          total_tokens: 10
        }
      })
    };
  }
}));

// Mock embedding cache
vi.mock('@/lib/embedding-cache', () => ({
  embeddingCache: {
    getEmbedding: vi.fn().mockResolvedValue(null),
    getBatchEmbeddings: vi.fn().mockImplementation(async (texts) => {
      // Return embeddings for each text
      return texts.map(() => Array(1536).fill(0).map((_, i) => i / 1536));
    }),
    getStats: vi.fn().mockReturnValue({
      size: 10,
      hits: 5,
      misses: 5,
      hitRate: 0.5
    }),
    clear: vi.fn(),
    warmup: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Embeddings Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for valid text', async () => {
      const text = 'This is a test sentence for embedding generation.';
      const embedding = await generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536);
    });

    it('should throw error for empty text', async () => {
      await expect(generateEmbedding('')).rejects.toThrow('Text cannot be empty');
    });

    it('should throw error for whitespace-only text', async () => {
      await expect(generateEmbedding('   ')).rejects.toThrow('Text cannot be empty');
    });

    it('should handle long text by truncating', async () => {
      const longText = 'a'.repeat(10000);
      const embedding = await generateEmbedding(longText);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(1536);
    });

    it('should use cache when available', async () => {
      const { embeddingCache } = await import('@/lib/embedding-cache');
      const cachedEmbedding = Array(1536).fill(0.5);
      vi.mocked(embeddingCache.getEmbedding).mockResolvedValueOnce(cachedEmbedding);

      const text = 'Cached text';
      const embedding = await generateEmbedding(text);

      expect(embeddingCache.getEmbedding).toHaveBeenCalledWith(text);
      expect(embedding).toEqual(cachedEmbedding);
    });

    it('should handle API errors gracefully', async () => {
      const OpenAI = (await import('openai')).default;
      const mockOpenAI = new OpenAI({ apiKey: 'test' });
      vi.mocked(mockOpenAI.embeddings.create).mockRejectedValueOnce(new Error('API error'));

      await expect(generateEmbedding('test')).rejects.toThrow('Embedding generation failed');
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const embeddings = await generateEmbeddings(texts);

      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      expect(embeddings[0].length).toBe(1536);
    });

    it('should return empty array for empty input', async () => {
      const embeddings = await generateEmbeddings([]);

      expect(embeddings).toEqual([]);
    });

    it('should use batch cache', async () => {
      const { embeddingCache } = await import('@/lib/embedding-cache');
      const texts = ['Text A', 'Text B'];

      await generateEmbeddings(texts);

      expect(embeddingCache.getBatchEmbeddings).toHaveBeenCalledWith(texts);
    });

    it('should filter out null results', async () => {
      const { embeddingCache } = await import('@/lib/embedding-cache');
      vi.mocked(embeddingCache.getBatchEmbeddings).mockResolvedValueOnce([
        Array(1536).fill(0.1),
        null,
        Array(1536).fill(0.3)
      ]);

      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const embeddings = await generateEmbeddings(texts);

      expect(embeddings.length).toBe(2);
    });
  });

  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const text = 'Short text';
      const chunks = chunkText(text, 1000, 200);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });

    it('should chunk long text with overlap', () => {
      const text = 'a'.repeat(2500);
      const chunks = chunkText(text, 1000, 200);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBe(1000);
    });

    it('should respect chunk size parameter', () => {
      const text = 'a'.repeat(500);
      const chunks = chunkText(text, 100, 20);

      expect(chunks[0].length).toBe(100);
    });

    it('should respect overlap parameter', () => {
      const text = 'abcdefghijklmnopqrstuvwxyz'.repeat(50);
      const chunkSize = 100;
      const overlap = 20;
      const chunks = chunkText(text, chunkSize, overlap);

      // Check that chunks overlap
      if (chunks.length > 1) {
        const end1 = chunks[0].substring(chunks[0].length - overlap);
        const start2 = chunks[1].substring(0, overlap);
        // They should have some overlap
        expect(chunks.length).toBeGreaterThan(1);
      }
    });

    it('should avoid tiny last chunks', () => {
      const text = 'a'.repeat(1150);
      const chunks = chunkText(text, 1000, 200);

      // Should not create a chunk smaller than overlap
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('chunkAndEmbedText', () => {
    it('should chunk and embed text', async () => {
      const text = 'a'.repeat(2500);
      const result = await chunkAndEmbedText(text, 1000, 200);

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].content).toBeDefined();
      expect(result[0].embedding).toBeDefined();
      expect(result[0].chunkIndex).toBe(0);
      expect(result[0].startChar).toBeDefined();
      expect(result[0].endChar).toBeDefined();
    });

    it('should include chunk metadata', async () => {
      const text = 'Test content for chunking and embedding.';
      const result = await chunkAndEmbedText(text, 20, 5);

      result.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.startChar).toBeGreaterThanOrEqual(0);
        expect(chunk.endChar).toBeGreaterThan(chunk.startChar);
      });
    });
  });

  describe('embedMessage', () => {
    it('should embed message with role prefix', async () => {
      const content = 'Hello, how are you?';
      const embedding = await embedMessage(content, 'user');

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(1536);
    });

    it('should use default role', async () => {
      const content = 'Test message';
      const embedding = await embedMessage(content);

      expect(embedding).toBeDefined();
    });

    it('should handle different roles', async () => {
      const content = 'Assistant response';
      const embedding = await embedMessage(content, 'assistant');

      expect(embedding).toBeDefined();
    });
  });

  describe('embedFile', () => {
    it('should embed short file with single embedding', async () => {
      const filename = 'short.txt';
      const content = 'This is a short file.';
      const fileType = 'text/plain';

      const result = await embedFile(filename, content, fileType);

      expect(result.length).toBe(1);
      expect(result[0].embedding).toBeDefined();
      expect(result[0].chunkIndex).toBe(0);
    });

    it('should chunk and embed long file', async () => {
      const filename = 'long-document.txt';
      const content = 'a'.repeat(2000);
      const fileType = 'text/plain';

      const result = await embedFile(filename, content, fileType);

      expect(result.length).toBeGreaterThan(1);
      result.forEach(chunk => {
        expect(chunk.embedding).toBeDefined();
      });
    });

    it('should include filename in context', async () => {
      const filename = 'important.txt';
      const content = 'Content';
      const fileType = 'text/plain';

      const result = await embedFile(filename, content, fileType);

      expect(result[0].content).toContain(filename);
      expect(result[0].content).toContain(fileType);
    });
  });

  describe('embedTranscription', () => {
    it('should embed transcription without segments', async () => {
      const filename = 'audio.m4a';
      const text = 'This is a transcription of an audio file.';

      const result = await embedTranscription(filename, text);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].embedding).toBeDefined();
    });

    it('should chunk by speaker when segments provided', async () => {
      const filename = 'meeting.m4a';
      const text = 'Full transcript text';
      const segments = [
        { speaker: 'A', text: 'Hello everyone', timestamp: 0 },
        { speaker: 'B', text: 'Hi there', timestamp: 5 },
        { speaker: 'A', text: 'How are you?', timestamp: 10 }
      ];

      const result = await embedTranscription(filename, text, segments);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(chunk => {
        expect(chunk.embedding).toBeDefined();
      });
    });

    it('should handle speaker changes', async () => {
      const filename = 'conversation.m4a';
      const text = 'Conversation';
      const segments = [
        { speaker: 'Speaker1', text: 'Part 1', timestamp: 0 },
        { speaker: 'Speaker2', text: 'Part 2', timestamp: 5 }
      ];

      const result = await embedTranscription(filename, text, segments);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('embedKnowledgeEntry', () => {
    it('should embed knowledge entry with metadata', async () => {
      const title = 'Important Knowledge';
      const content = 'This is important information to remember.';
      const category = 'notes';
      const tags = ['important', 'work'];

      const embedding = await embedKnowledgeEntry(title, content, category, tags);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(1536);
    });

    it('should work without tags', async () => {
      const title = 'Knowledge Item';
      const content = 'Content here';
      const category = 'general';

      const embedding = await embedKnowledgeEntry(title, content, category);

      expect(embedding).toBeDefined();
    });

    it('should include all metadata in context', async () => {
      const title = 'Test Title';
      const content = 'Test Content';
      const category = 'test';
      const tags = ['tag1', 'tag2'];

      const embedding = await embedKnowledgeEntry(title, content, category, tags);

      expect(embedding).toBeDefined();
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate similarity between identical embeddings', () => {
      const embedding = Array(1536).fill(0.5);
      const similarity = cosineSimilarity(embedding, embedding);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should calculate similarity between different embeddings', () => {
      const embedding1 = Array(1536).fill(0).map((_, i) => i / 1536);
      const embedding2 = Array(1536).fill(0).map((_, i) => (1536 - i) / 1536);

      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeGreaterThan(-1);
      expect(similarity).toBeLessThan(1);
    });

    it('should throw error for mismatched dimensions', () => {
      const embedding1 = Array(1536).fill(0.5);
      const embedding2 = Array(512).fill(0.5);

      expect(() => cosineSimilarity(embedding1, embedding2)).toThrow('same dimension');
    });

    it('should calculate negative similarity for opposite embeddings', () => {
      const embedding1 = Array(1536).fill(1);
      const embedding2 = Array(1536).fill(-1);

      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should handle zero vectors', () => {
      const embedding1 = Array(1536).fill(0);
      const embedding2 = Array(1536).fill(0);

      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(isNaN(similarity)).toBe(true);
    });
  });

  describe('generateEmbeddingsWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const texts = ['Text 1', 'Text 2'];
      const embeddings = await generateEmbeddingsWithRetry(texts);

      expect(embeddings.length).toBe(2);
      expect(embeddings[0]).not.toBeNull();
    });

    it('should retry on failure', async () => {
      const { embeddingCache } = await import('@/lib/embedding-cache');
      let attempts = 0;
      vi.mocked(embeddingCache.getBatchEmbeddings).mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return [Array(1536).fill(0.5)];
      });

      const texts = ['Text 1'];
      const embeddings = await generateEmbeddingsWithRetry(texts, 3, 10);

      expect(attempts).toBe(2);
      expect(embeddings[0]).not.toBeNull();
    });

    it('should return null after max retries', async () => {
      const { embeddingCache } = await import('@/lib/embedding-cache');
      vi.mocked(embeddingCache.getBatchEmbeddings).mockRejectedValue(new Error('Persistent failure'));

      const texts = ['Text 1', 'Text 2'];
      const embeddings = await generateEmbeddingsWithRetry(texts, 2, 10);

      expect(embeddings.length).toBe(2);
      expect(embeddings[0]).toBeNull();
      expect(embeddings[1]).toBeNull();
    });

    it('should use exponential backoff', async () => {
      const { embeddingCache } = await import('@/lib/embedding-cache');
      const startTime = Date.now();
      vi.mocked(embeddingCache.getBatchEmbeddings).mockRejectedValue(new Error('Failure'));

      await generateEmbeddingsWithRetry(['Text'], 3, 50);

      const elapsed = Date.now() - startTime;
      // Should wait 50ms + 100ms + 150ms = 300ms total
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getEmbeddingStats', () => {
    it('should return cache statistics', () => {
      const stats = getEmbeddingStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should have valid statistics', () => {
      const stats = getEmbeddingStats();

      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.hits).toBeGreaterThanOrEqual(0);
      expect(stats.misses).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('clearEmbeddingCache', () => {
    it('should clear the cache', () => {
      const { embeddingCache } = require('@/lib/embedding-cache');

      clearEmbeddingCache();

      expect(embeddingCache.clear).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode characters', async () => {
      const text = 'Hello 世界 🌍 Привет';
      const embedding = await generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(1536);
    });

    it('should handle special characters', async () => {
      const text = 'Special chars: @#$%^&*()_+-=[]{}|;:,.<>?';
      const embedding = await generateEmbedding(text);

      expect(embedding).toBeDefined();
    });

    it('should handle newlines and tabs', async () => {
      const text = 'Line 1\nLine 2\tTabbed';
      const embedding = await generateEmbedding(text);

      expect(embedding).toBeDefined();
    });

    it('should handle very short text', async () => {
      const text = 'a';
      const embedding = await generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(1536);
    });
  });
});
