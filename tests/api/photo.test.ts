import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/photo/route';
import { createMockNextRequest, createMockFile } from '../helpers/test-utils';
import { MockSupabaseClient } from '../mocks/supabase.mock';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is a detailed image analysis. The image shows a person standing in a park.',
              },
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

vi.mock('@/lib/zapier-client', () => ({
  zapierClient: {
    sendPhotoUploaded: vi.fn().mockResolvedValue({}),
    detectUrgentTag: vi.fn().mockReturnValue(false),
    sendUrgentNotification: vi.fn().mockResolvedValue({}),
  },
}));

describe('Photo API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/photo', () => {
    it('should return API documentation', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/photo',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('service', 'KimbleAI Photo Analysis API');
      expect(data).toHaveProperty('supportedFormats');
      expect(data).toHaveProperty('analysisTypes');
      expect(data.supportedFormats).toContain('JPEG');
      expect(data.supportedFormats).toContain('PNG');
    });
  });

  describe('POST /api/photo', () => {
    it('should successfully analyze a photo', async () => {
      const mockFile = createMockFile('fake image content', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);
      formData.append('analysisType', 'general');
      formData.append('userId', 'zach');

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('analysis');
      expect(data).toHaveProperty('autoTags');
      expect(data).toHaveProperty('photoId');
    });

    it('should return 400 when no photo is provided', async () => {
      const formData = new FormData();
      formData.append('analysisType', 'general');

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'No photo provided');
    });

    it('should reject invalid file types', async () => {
      const mockFile = createMockFile('fake content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('photo', mockFile);

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    it('should reject files that are too large', async () => {
      // Create a file larger than 20MB
      const largeContent = 'x'.repeat(21 * 1024 * 1024);
      const mockFile = createMockFile(largeContent, 'large.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File too large');
    });

    it('should reject filenames with path traversal attempts', async () => {
      const mockFile = createMockFile('fake content', '../../../evil.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid filename');
    });

    it('should reject invalid analysis types', async () => {
      const mockFile = createMockFile('fake content', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);
      formData.append('analysisType', 'malicious-type');

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid analysis type');
    });

    it('should auto-generate tags from analysis', async () => {
      const mockFile = createMockFile('fake content', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);
      formData.append('analysisType', 'general');

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.autoTags).toBeInstanceOf(Array);
      expect(data.autoTags.length).toBeGreaterThan(0);
    });

    it('should suggest project category', async () => {
      const mockFile = createMockFile('fake content', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);
      formData.append('analysisType', 'technical');

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('suggestedProject');
      expect(typeof data.suggestedProject).toBe('string');
    });

    it('should store photo in knowledge base for RAG', async () => {
      const mockFile = createMockFile('fake content', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rag).toHaveProperty('stored');
      expect(data.rag).toHaveProperty('searchable');
      expect(data).toHaveProperty('vectorSearchEnabled');
    });

    it('should handle different analysis types correctly', async () => {
      const analysisTypes = ['general', 'dnd', 'document', 'technical', 'automotive', 'recipe'];

      for (const analysisType of analysisTypes) {
        const mockFile = createMockFile('fake content', 'test.jpg', 'image/jpeg');
        const formData = new FormData();
        formData.append('photo', mockFile);
        formData.append('analysisType', analysisType);

        const request = new Request('http://localhost:3000/api/photo', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should include metadata in response', async () => {
      const mockFile = createMockFile('fake content', 'test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('photo', mockFile);

      const request = new Request('http://localhost:3000/api/photo', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).toHaveProperty('fileName');
      expect(data.metadata).toHaveProperty('fileSize');
      expect(data.metadata).toHaveProperty('fileType');
      expect(data.metadata).toHaveProperty('timestamp');
    });
  });

  describe('Security Tests', () => {
    it('should sanitize filename for security', async () => {
      const dangerousFilenames = [
        '../etc/passwd.jpg',
        '..\\windows\\system32\\file.jpg',
        'test/../../file.jpg',
        'test\\..\\file.jpg',
      ];

      for (const filename of dangerousFilenames) {
        const mockFile = createMockFile('content', filename, 'image/jpeg');
        const formData = new FormData();
        formData.append('photo', mockFile);

        const request = new Request('http://localhost:3000/api/photo', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid filename');
      }
    });

    it('should only accept whitelisted file types', async () => {
      const invalidTypes = ['image/gif', 'application/pdf', 'text/html', 'image/svg+xml'];

      for (const type of invalidTypes) {
        const mockFile = createMockFile('content', 'test.file', type);
        const formData = new FormData();
        formData.append('photo', mockFile);

        const request = new Request('http://localhost:3000/api/photo', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid file type');
      }
    });
  });
});
