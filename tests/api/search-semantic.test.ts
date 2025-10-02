import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/search/semantic/route';
import { createMockNextRequest } from '../helpers/test-utils';
import { MockSupabaseClient } from '../mocks/supabase.mock';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(
    Array(1536).fill(0).map((_, i) => i / 1536)
  )
}));

describe('Semantic Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock database results
    const mockSupabase = new MockSupabaseClient();
    mockSupabase.setMockRpcResponse('search_all_content', [
      {
        id: 'result-1',
        content_type: 'message',
        title: 'Test Message',
        content: 'This is a test message about AI and machine learning',
        similarity: 0.95,
        project_id: 'project-1',
        created_at: '2024-01-01T12:00:00Z',
        metadata: {},
        source_id: 'source-1'
      },
      {
        id: 'result-2',
        content_type: 'file',
        title: 'Document.pdf',
        content: 'This document contains information about neural networks',
        similarity: 0.87,
        project_id: 'project-1',
        created_at: '2024-01-02T12:00:00Z',
        metadata: {},
        source_id: 'source-2'
      },
      {
        id: 'result-3',
        content_type: 'transcript',
        title: 'Meeting Audio',
        content: 'In this meeting we discussed the AI roadmap',
        similarity: 0.82,
        project_id: 'project-2',
        created_at: '2024-01-03T12:00:00Z',
        metadata: {},
        source_id: 'source-3'
      }
    ]);
  });

  describe('GET /api/search/semantic', () => {
    it('should perform semantic search with query parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=artificial intelligence');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.query).toBe('artificial intelligence');
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should return 400 when query parameter is missing', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 when query is empty', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should use default userId when not provided', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.userId).toBeDefined();
    });

    it('should accept custom userId parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&userId=rebecca');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.userId).toBe('rebecca');
    });

    it('should accept projectId filter', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&projectId=project-123');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.projectId).toBe('project-123');
    });

    it('should accept content type filter', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&type=message');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.contentTypes).toContain('message');
    });

    it('should search all content types by default', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.contentTypes).toContain('message');
      expect(data.filters.contentTypes).toContain('file');
      expect(data.filters.contentTypes).toContain('transcript');
      expect(data.filters.contentTypes).toContain('knowledge');
    });

    it('should accept custom limit parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&limit=10');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.limit).toBe(10);
    });

    it('should use default limit when not provided', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.limit).toBe(20);
    });

    it('should accept custom threshold parameter', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&threshold=0.8');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.threshold).toBe(0.8);
    });

    it('should use default threshold when not provided', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.threshold).toBe(0.7);
    });

    it('should return search results with proper structure', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=AI');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.length).toBeGreaterThan(0);

      const result = data.results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('preview');
      expect(result).toHaveProperty('similarity');
      expect(result).toHaveProperty('createdAt');
    });

    it('should include performance metrics in response', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.performance).toBeDefined();
      expect(data.performance).toHaveProperty('totalTime');
      expect(data.performance).toHaveProperty('embeddingTime');
      expect(data.performance).toHaveProperty('searchTime');
    });

    it('should return result count', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBeDefined();
      expect(typeof data.count).toBe('number');
      expect(data.count).toBe(data.results.length);
    });

    it('should include query in response', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=neural networks');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('neural networks');
    });
  });

  describe('POST /api/search/semantic', () => {
    it('should perform semantic search with request body', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'machine learning algorithms',
          filters: {}
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.query).toBe('machine learning algorithms');
      expect(data.results).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          filters: {}
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 when query is empty', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: '',
          filters: {}
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should accept advanced filters', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test query',
          filters: {
            userId: 'zach',
            projectId: 'project-123',
            contentTypes: ['message', 'file'],
            limit: 15,
            threshold: 0.75
          }
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.userId).toBe('zach');
      expect(data.filters.projectId).toBe('project-123');
      expect(data.filters.contentTypes).toEqual(['message', 'file']);
      expect(data.filters.limit).toBe(15);
      expect(data.filters.threshold).toBe(0.75);
    });

    it('should accept date range filters', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test',
          filters: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          }
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.startDate).toBe('2024-01-01');
      expect(data.filters.endDate).toBe('2024-12-31');
    });

    it('should filter results by start date', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test',
          filters: {
            startDate: '2024-01-02'
          }
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Results before 2024-01-02 should be filtered out
      data.results.forEach((result: any) => {
        expect(new Date(result.createdAt) >= new Date('2024-01-02')).toBe(true);
      });
    });

    it('should filter results by end date', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test',
          filters: {
            endDate: '2024-01-02'
          }
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Results after 2024-01-02 should be filtered out
      data.results.forEach((result: any) => {
        expect(new Date(result.createdAt) <= new Date('2024-01-02')).toBe(true);
      });
    });

    it('should use default filters when not provided', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.limit).toBe(20);
      expect(data.filters.threshold).toBe(0.7);
    });

    it('should include result metadata', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test query'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.results.length > 0) {
        const result = data.results[0];
        expect(result.metadata).toBeDefined();
        expect(result.projectId).toBeDefined();
      }
    });

    it('should include highlighted snippets', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'AI'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.results.length > 0) {
        const result = data.results[0];
        expect(result.highlight).toBeDefined();
        expect(result.preview).toBeDefined();
      }
    });

    it('should return results sorted by similarity', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Check that results are sorted by similarity (descending)
      for (let i = 0; i < data.results.length - 1; i++) {
        expect(data.results[i].similarity).toBeGreaterThanOrEqual(data.results[i + 1].similarity);
      }
    });

    it('should handle empty results', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockRpcResponse('search_all_content', []);

      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'nonexistent query xyz123'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(data.count).toBe(0);
    });
  });

  describe('Search Performance', () => {
    it('should complete search in under 500ms', async () => {
      const startTime = Date.now();

      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500);
      expect(data.performance.totalTime).toBeLessThan(500);
    });

    it('should include embedding generation time', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.performance.embeddingTime).toBeGreaterThanOrEqual(0);
    });

    it('should include database search time', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data.performance.searchTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding generation errors', async () => {
      const { generateEmbedding } = await import('@/lib/embeddings');
      vi.mocked(generateEmbedding).mockRejectedValueOnce(new Error('Embedding failed'));

      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockRpcError('search_all_content', new Error('Database error'));

      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON in POST', async () => {
      const request = new Request('http://localhost:3000/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });

      const response = await POST(request as any);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing request body in POST', async () => {
      const request = new Request('http://localhost:3000/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request as any);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Content Type Filtering', () => {
    it('should filter by message content type', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&type=message');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.contentTypes).toContain('message');
    });

    it('should filter by file content type', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&type=file');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.contentTypes).toContain('file');
    });

    it('should filter by transcript content type', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&type=transcript');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.contentTypes).toContain('transcript');
    });

    it('should filter by knowledge content type', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test&type=knowledge');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.contentTypes).toContain('knowledge');
    });

    it('should allow multiple content types in POST', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/search/semantic',
        body: {
          query: 'test',
          filters: {
            contentTypes: ['message', 'file', 'transcript']
          }
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.contentTypes).toEqual(['message', 'file', 'transcript']);
    });
  });

  describe('Result Formatting', () => {
    it('should format similarity score to 4 decimal places', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.results.length > 0) {
        const result = data.results[0];
        const decimalPlaces = result.similarity.toString().split('.')[1]?.length || 0;
        expect(decimalPlaces).toBeLessThanOrEqual(4);
      }
    });

    it('should generate preview with ellipsis for long content', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockRpcResponse('search_all_content', [{
        id: 'result-1',
        content_type: 'message',
        title: 'Long Message',
        content: 'a'.repeat(500),
        similarity: 0.9,
        project_id: 'project-1',
        created_at: '2024-01-01T12:00:00Z',
        metadata: {},
        source_id: 'source-1'
      }]);

      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.results.length > 0) {
        const result = data.results[0];
        expect(result.preview.length).toBeLessThanOrEqual(210); // 200 chars + '...'
      }
    });

    it('should include sourceId in metadata', async () => {
      const url = new URL('http://localhost:3000/api/search/semantic?q=test');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.results.length > 0) {
        const result = data.results[0];
        expect(result.metadata.sourceId).toBeDefined();
      }
    });
  });
});
