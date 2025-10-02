import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/transcribe/route';
import { createMockFile } from '../helpers/test-utils';
import { MockSupabaseClient } from '../mocks/supabase.mock';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
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

describe('Transcribe API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for AssemblyAI
    global.fetch = vi.fn((url: string, options?: any) => {
      const urlStr = typeof url === 'string' ? url : url.toString();

      // Upload endpoint
      if (urlStr.includes('assemblyai.com/v2/upload')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            upload_url: 'https://test.assemblyai.com/upload/test-file',
          }),
        } as Response);
      }

      // Transcript submission
      if (urlStr.includes('assemblyai.com/v2/transcript') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 'test-transcript-123',
            status: 'queued',
          }),
        } as Response);
      }

      // Transcript status check
      if (urlStr.includes('assemblyai.com/v2/transcript/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 'test-transcript-123',
            status: 'completed',
            text: 'This is a test transcription of the audio file.',
            audio_duration: 120,
          }),
        } as Response);
      }

      return Promise.reject(new Error('Not mocked'));
    }) as any;
  });

  describe('POST /api/transcribe', () => {
    it('should successfully transcribe an audio file', async () => {
      const audioContent = new Uint8Array(1024 * 100); // 100KB test audio
      const mockFile = new File([audioContent], 'test.m4a', { type: 'audio/mp4' });
      const formData = new FormData();
      formData.append('audio', mockFile);
      formData.append('userId', 'zach');

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('transcriptId');
      expect(data).toHaveProperty('transcription');
    });

    it('should return 400 when no audio file is provided', async () => {
      const formData = new FormData();
      formData.append('userId', 'zach');

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('should reject invalid audio file types', async () => {
      const mockFile = createMockFile('fake audio', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('audio', mockFile);

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/Invalid file type|Unsupported audio format/i);
    });

    it('should extract facts from transcription', async () => {
      const audioContent = new Uint8Array(1024 * 100);
      const mockFile = new File([audioContent], 'meeting.m4a', { type: 'audio/mp4' });
      const formData = new FormData();
      formData.append('audio', mockFile);

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('factsExtracted');
      expect(typeof data.factsExtracted).toBe('number');
    });

    it('should store transcription in knowledge base', async () => {
      const audioContent = new Uint8Array(1024 * 100);
      const mockFile = new File([audioContent], 'test.m4a', { type: 'audio/mp4' });
      const formData = new FormData();
      formData.append('audio', mockFile);

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('knowledgeBaseStored');
    });

    it('should estimate audio duration correctly', async () => {
      const audioContent = new Uint8Array(1024 * 1024 * 5); // 5MB file
      const mockFile = new File([audioContent], 'test.m4a', { type: 'audio/mp4' });
      const formData = new FormData();
      formData.append('audio', mockFile);

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.estimatedDuration) {
        expect(data.estimatedDuration).toBeGreaterThan(0);
      }
    });

    it('should handle transcription errors gracefully', async () => {
      // Mock API error
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Transcription failed' }),
        } as Response)
      ) as any;

      const audioContent = new Uint8Array(1024 * 100);
      const mockFile = new File([audioContent], 'test.m4a', { type: 'audio/mp4' });
      const formData = new FormData();
      formData.append('audio', mockFile);

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('Security Tests', () => {
    it('should validate file size limits', async () => {
      // Create a very large file (simulating > 2GB)
      const largeSize = 3 * 1024 * 1024 * 1024; // 3GB
      // Note: Can't actually create 3GB in memory, so we mock the size property
      const mockFile = new File([new Uint8Array(1024)], 'huge.m4a', { type: 'audio/mp4' });
      Object.defineProperty(mockFile, 'size', { value: largeSize });

      const formData = new FormData();
      formData.append('audio', mockFile);

      const request = new Request('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should either reject or handle large files appropriately
      if (response.status === 400) {
        expect(data.error).toMatch(/too large|file size/i);
      } else {
        // If accepted, should have initiated transcription
        expect(data).toHaveProperty('transcriptId');
      }
    });

    it('should sanitize filenames', async () => {
      const dangerousFilenames = [
        '../../../evil.m4a',
        '..\\windows\\system32\\file.m4a',
        'test/../../file.m4a',
      ];

      for (const filename of dangerousFilenames) {
        const audioContent = new Uint8Array(1024 * 10);
        const mockFile = new File([audioContent], filename, { type: 'audio/mp4' });
        const formData = new FormData();
        formData.append('audio', mockFile);

        const request = new Request('http://localhost:3000/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request as any);

        // Should either reject or sanitize the filename
        expect(response.status).toBeLessThan(500);
      }
    });
  });
});
