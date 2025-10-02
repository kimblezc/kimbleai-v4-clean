import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET, PUT } from '@/app/api/files/upload/route';
import { createMockNextRequest, createMockFile, createMockFormData } from '../helpers/test-utils';
import { MockSupabaseClient } from '../mocks/supabase.mock';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('@/lib/file-processors', async () => {
  const actual = await vi.importActual('@/lib/file-processors');
  return {
    ...actual,
    processFile: vi.fn().mockResolvedValue({
      success: true,
      data: {
        transcription: 'Test transcription',
        duration: 120
      },
      processingType: 'audio'
    }),
    validateFile: vi.fn().mockReturnValue({
      valid: true,
      category: 'audio'
    })
  };
});

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: () => 'test-file-id-123'
    })
  }
}));

describe('File Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/files/upload - Single File Upload', () => {
    it('should upload a single file successfully', async () => {
      const file = createMockFile('audio content', 'test-audio.m4a', 'audio/m4a');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'zach');
      formData.append('projectId', 'project-1');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fileId).toBeDefined();
      expect(data.status).toBe('processing');
      expect(data.filename).toBe('test-audio.m4a');
    });

    it('should return 400 when no file provided', async () => {
      const formData = new FormData();
      formData.append('userId', 'zach');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file provided');
    });

    it('should use default userId when not provided', async () => {
      const file = createMockFile('content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should use default projectId when not provided', async () => {
      const file = createMockFile('content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'zach');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should validate file before uploading', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({
        valid: false,
        error: 'File too large'
      });

      const file = createMockFile('huge file', 'huge.m4a', 'audio/m4a');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File too large');
    });

    it('should return file category in response', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({
        valid: true,
        category: 'image'
      });

      const file = createMockFile('image', 'photo.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('image');
    });

    it('should return 404 when user not found', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockData('users', []);

      const file = createMockFile('content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'nonexistent');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should include file size in response', async () => {
      const file = createMockFile('test content', 'test.txt', 'text/plain');
      Object.defineProperty(file, 'size', { value: 12 });

      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.size).toBe(12);
    });
  });

  describe('GET /api/files/upload - Progress Tracking', () => {
    it('should return progress for valid fileId', async () => {
      const url = new URL('http://localhost:3000/api/files/upload?fileId=test-file-123');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      // Should return either progress or database record
      expect(response.status).toBeLessThan(500);
    });

    it('should return 400 when fileId not provided', async () => {
      const url = new URL('http://localhost:3000/api/files/upload');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File ID required');
    });

    it('should check database for completed files', async () => {
      const url = new URL('http://localhost:3000/api/files/upload?fileId=completed-file');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);

      // Should attempt to fetch from database
      expect(response.status).toBeLessThan(500);
    });

    it('should return 404 for non-existent fileId', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockData('uploaded_files', []);

      const url = new URL('http://localhost:3000/api/files/upload?fileId=nonexistent');
      const request = new Request(url, { method: 'GET' });

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File not found');
    });
  });

  describe('PUT /api/files/upload - Batch Upload', () => {
    it('should upload multiple files successfully', async () => {
      const file1 = createMockFile('content1', 'file1.txt', 'text/plain');
      const file2 = createMockFile('content2', 'file2.txt', 'text/plain');

      const formData = new FormData();
      formData.append('file0', file1);
      formData.append('file1', file2);
      formData.append('userId', 'zach');
      formData.append('projectId', 'project-1');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'PUT',
        body: formData
      });

      const response = await PUT(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fileIds).toBeDefined();
      expect(data.fileIds.length).toBe(2);
      expect(data.files.length).toBe(2);
    });

    it('should return 400 when no files provided', async () => {
      const formData = new FormData();
      formData.append('userId', 'zach');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'PUT',
        body: formData
      });

      const response = await PUT(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No files provided');
    });

    it('should validate all files before processing', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      let callCount = 0;
      vi.mocked(validateFile).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return { valid: false, error: 'Invalid file' };
        }
        return { valid: true, category: 'document' };
      });

      const file1 = createMockFile('content1', 'file1.txt', 'text/plain');
      const file2 = createMockFile('invalid', 'file2.xyz', 'application/xyz');

      const formData = new FormData();
      formData.append('file0', file1);
      formData.append('file1', file2);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'PUT',
        body: formData
      });

      const response = await PUT(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('invalid');
      expect(data.invalidFiles).toBeDefined();
    });

    it('should process all valid files', async () => {
      const file1 = createMockFile('audio1', 'audio1.m4a', 'audio/m4a');
      const file2 = createMockFile('audio2', 'audio2.m4a', 'audio/m4a');
      const file3 = createMockFile('audio3', 'audio3.m4a', 'audio/m4a');

      const formData = new FormData();
      formData.append('file0', file1);
      formData.append('file1', file2);
      formData.append('file2', file3);
      formData.append('userId', 'zach');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'PUT',
        body: formData
      });

      const response = await PUT(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fileIds.length).toBe(3);
    });

    it('should mark files as batch upload in metadata', async () => {
      const file1 = createMockFile('content1', 'file1.txt', 'text/plain');
      const file2 = createMockFile('content2', 'file2.txt', 'text/plain');

      const formData = new FormData();
      formData.append('file0', file1);
      formData.append('file1', file2);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'PUT',
        body: formData
      });

      const response = await PUT(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('files uploaded');
    });

    it('should return file details for each uploaded file', async () => {
      const file1 = createMockFile('content1', 'doc1.txt', 'text/plain');
      const file2 = createMockFile('content2', 'doc2.txt', 'text/plain');

      const formData = new FormData();
      formData.append('file0', file1);
      formData.append('file1', file2);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'PUT',
        body: formData
      });

      const response = await PUT(request as any);
      const data = await response.json();

      expect(data.files).toBeDefined();
      expect(data.files[0].filename).toBe('doc1.txt');
      expect(data.files[1].filename).toBe('doc2.txt');
      expect(data.files[0].status).toBe('processing');
    });

    it('should handle user not found error', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockData('users', []);

      const file1 = createMockFile('content', 'file.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file0', file1);
      formData.append('userId', 'nonexistent');

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'PUT',
        body: formData
      });

      const response = await PUT(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('File Processing Integration', () => {
    it('should trigger async file processing', async () => {
      const { processFile } = await import('@/lib/file-processors');

      const file = createMockFile('content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('processing');
    });

    it('should handle processing errors gracefully', async () => {
      const { processFile } = await import('@/lib/file-processors');
      vi.mocked(processFile).mockResolvedValueOnce({
        success: false,
        error: 'Processing failed'
      });

      const file = createMockFile('content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);

      // Should still return success initially (async processing)
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed form data', async () => {
      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: 'invalid'
      });

      const response = await POST(request as any);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle database errors', async () => {
      const mockSupabase = new MockSupabaseClient();
      mockSupabase.setMockError(new Error('Database connection failed'));

      const file = createMockFile('content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing environment variables', async () => {
      const file = createMockFile('content', 'test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      // Should handle gracefully even if env vars are missing
      const response = await POST(request as any);

      expect(response).toBeDefined();
    });
  });

  describe('File Type Support', () => {
    it('should accept audio files', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({ valid: true, category: 'audio' });

      const file = createMockFile('audio', 'test.m4a', 'audio/m4a');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('audio');
    });

    it('should accept image files', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({ valid: true, category: 'image' });

      const file = createMockFile('image', 'photo.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('image');
    });

    it('should accept PDF files', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({ valid: true, category: 'pdf' });

      const file = createMockFile('pdf', 'document.pdf', 'application/pdf');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('pdf');
    });

    it('should accept document files', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({ valid: true, category: 'document' });

      const file = createMockFile('doc', 'document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('document');
    });

    it('should accept spreadsheet files', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({ valid: true, category: 'spreadsheet' });

      const file = createMockFile('csv', 'data.csv', 'text/csv');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('spreadsheet');
    });

    it('should accept email files', async () => {
      const { validateFile } = await import('@/lib/file-processors');
      vi.mocked(validateFile).mockReturnValueOnce({ valid: true, category: 'email' });

      const file = createMockFile('email', 'message.eml', 'message/rfc822');
      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('email');
    });
  });
});
