import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  processAudioFile,
  processImageFile,
  processPDFFile,
  processDocumentFile,
  processSpreadsheetFile,
  processEmailFile,
  processFile,
  validateFile,
  FILE_LIMITS
} from '@/lib/file-processors';
import { MockSupabaseClient } from '../mocks/supabase.mock';

// Mock all dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => new MockSupabaseClient(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: 'This is a test transcription',
          words: [
            { word: 'This', start: 0, end: 0.5 },
            { word: 'is', start: 0.5, end: 0.8 }
          ]
        })
      }
    };
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'This image shows a cat sitting on a desk with a laptop.'
            }
          }]
        })
      }
    };
    embeddings = {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: Array(1536).fill(0).map(() => Math.random()) }]
      })
    };
  }
}));

vi.mock('assemblyai', () => ({
  AssemblyAI: class MockAssemblyAI {
    transcripts = {
      transcribe: vi.fn().mockResolvedValue({
        id: 'test-transcript-id',
        text: 'This is a test transcription from AssemblyAI',
        audio_duration: 120,
        confidence: 0.95,
        language_code: 'en',
        words: [],
        utterances: [
          { speaker: 'A', text: 'Hello' },
          { speaker: 'B', text: 'Hi there' }
        ],
        chapters: [
          { summary: 'Introduction', start: 0, end: 30 }
        ]
      })
    };
  }
}));

vi.mock('sharp', () => {
  const mockSharp = () => ({
    metadata: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
      space: 'srgb',
      channels: 3,
      depth: 'uchar',
      hasAlpha: false
    }),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('thumbnail-data'))
  });
  return { default: mockSharp };
});

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      getPageCount: () => 10,
      getTitle: () => 'Test PDF Document',
      getAuthor: () => 'Test Author',
      getSubject: () => 'Test Subject'
    })
  }
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    text: 'This is extracted PDF text content. It contains multiple paragraphs and information.'
  })
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn().mockResolvedValue({
      value: 'This is extracted DOCX text content.'
    })
  }
}));

vi.mock('xlsx', () => ({
  read: vi.fn().mockReturnValue({
    SheetNames: ['Sheet1', 'Sheet2'],
    Sheets: {
      Sheet1: {},
      Sheet2: {}
    }
  }),
  utils: {
    sheet_to_json: vi.fn().mockReturnValue([
      { Name: 'John', Age: 30, City: 'New York' },
      { Name: 'Jane', Age: 25, City: 'Los Angeles' }
    ])
  }
}));

// Helper to create mock files
function createMockFile(content: string, filename: string, type: string): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

describe('File Processors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate audio files correctly', () => {
      const file = createMockFile('audio content', 'test.m4a', 'audio/m4a');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe('audio');
    });

    it('should validate image files correctly', () => {
      const file = createMockFile('image content', 'test.jpg', 'image/jpeg');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe('image');
    });

    it('should validate PDF files correctly', () => {
      const file = createMockFile('pdf content', 'test.pdf', 'application/pdf');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe('pdf');
    });

    it('should reject files that are too large', () => {
      const file = createMockFile('huge file', 'test.m4a', 'audio/m4a');
      Object.defineProperty(file, 'size', { value: 3_000_000_000 }); // 3GB

      const result = validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject unsupported file types', () => {
      const file = createMockFile('content', 'test.xyz', 'application/xyz');

      const result = validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported file type');
    });

    it('should validate document files', () => {
      const file = createMockFile('doc content', 'test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe('document');
    });

    it('should validate spreadsheet files', () => {
      const file = createMockFile('csv content', 'test.csv', 'text/csv');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe('spreadsheet');
    });

    it('should validate email files', () => {
      const file = createMockFile('email content', 'test.eml', 'message/rfc822');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.category).toBe('email');
    });
  });

  describe('processAudioFile', () => {
    it('should process audio file successfully', async () => {
      const file = createMockFile('audio content', 'test.m4a', 'audio/m4a');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processAudioFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.transcription).toBeDefined();
      expect(result.data?.duration).toBeDefined();
    });

    it('should handle audio processing errors', async () => {
      const AssemblyAI = (await import('assemblyai')).AssemblyAI;
      const mockAI = new AssemblyAI({ apiKey: 'test' });
      vi.mocked(mockAI.transcripts.transcribe).mockRejectedValueOnce(new Error('Transcription failed'));

      const file = createMockFile('invalid audio', 'test.m4a', 'audio/m4a');

      const result = await processAudioFile(file, 'user-1', 'project-1', 'file-1');

      // Should still succeed with fallback to Whisper
      expect(result.success).toBe(true);
    });

    it('should extract speaker information', async () => {
      const file = createMockFile('audio content', 'meeting.m4a', 'audio/m4a');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processAudioFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.speakers).toBeGreaterThan(0);
    });

    it('should extract chapters from audio', async () => {
      const file = createMockFile('audio content', 'lecture.m4a', 'audio/m4a');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processAudioFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.chapters).toBeGreaterThanOrEqual(0);
    });
  });

  describe('processImageFile', () => {
    it('should process image file successfully', async () => {
      const file = createMockFile('image content', 'photo.jpg', 'image/jpeg');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processImageFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.analysis).toBeDefined();
      expect(result.data?.dimensions).toBeDefined();
      expect(result.data?.format).toBe('jpeg');
    });

    it('should generate thumbnail', async () => {
      const file = createMockFile('image content', 'large-photo.jpg', 'image/jpeg');
      Object.defineProperty(file, 'size', { value: 5000000 });

      const result = await processImageFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.thumbnailUrl).toBeDefined();
    });

    it('should extract image metadata', async () => {
      const file = createMockFile('image content', 'photo.png', 'image/png');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processImageFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.dimensions).toContain('x');
    });

    it('should use OpenAI Vision for analysis', async () => {
      const file = createMockFile('image content', 'screenshot.png', 'image/png');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processImageFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.analysis).toBeTruthy();
      expect(result.data?.analysis.length).toBeGreaterThan(0);
    });
  });

  describe('processPDFFile', () => {
    it('should process PDF file successfully', async () => {
      const file = createMockFile('pdf content', 'document.pdf', 'application/pdf');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processPDFFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.pageCount).toBe(10);
      expect(result.data?.title).toBe('Test PDF Document');
    });

    it('should extract PDF text content', async () => {
      const file = createMockFile('pdf content', 'report.pdf', 'application/pdf');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processPDFFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.contentPreview).toBeDefined();
      expect(result.data?.wordCount).toBeGreaterThan(0);
    });

    it('should extract PDF metadata', async () => {
      const file = createMockFile('pdf content', 'thesis.pdf', 'application/pdf');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processPDFFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.author).toBe('Test Author');
      expect(result.data?.title).toBeDefined();
    });

    it('should handle large PDFs', async () => {
      const file = createMockFile('large pdf content', 'book.pdf', 'application/pdf');
      Object.defineProperty(file, 'size', { value: 50000000 });

      const result = await processPDFFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
    });
  });

  describe('processDocumentFile', () => {
    it('should process DOCX file successfully', async () => {
      const file = createMockFile('docx content', 'document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processDocumentFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.wordCount).toBeGreaterThan(0);
    });

    it('should process TXT file successfully', async () => {
      const file = createMockFile('Plain text content here', 'notes.txt', 'text/plain');
      Object.defineProperty(file, 'size', { value: 1000 });

      const result = await processDocumentFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.contentPreview).toContain('Plain text');
    });

    it('should process Markdown file successfully', async () => {
      const file = createMockFile('# Markdown Title\n\nContent here', 'readme.md', 'text/markdown');
      Object.defineProperty(file, 'size', { value: 1000 });

      const result = await processDocumentFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.lineCount).toBeGreaterThan(0);
    });

    it('should count words and lines', async () => {
      const file = createMockFile('Line 1\nLine 2\nLine 3', 'test.txt', 'text/plain');
      Object.defineProperty(file, 'size', { value: 100 });

      const result = await processDocumentFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.lineCount).toBe(3);
    });
  });

  describe('processSpreadsheetFile', () => {
    it('should process CSV file successfully', async () => {
      const file = createMockFile('Name,Age\nJohn,30\nJane,25', 'data.csv', 'text/csv');
      Object.defineProperty(file, 'size', { value: 1000 });

      const result = await processSpreadsheetFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should process XLSX file successfully', async () => {
      const file = createMockFile('xlsx content', 'workbook.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processSpreadsheetFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.sheetCount).toBeGreaterThan(0);
      expect(result.data?.sheets).toContain('Sheet1');
    });

    it('should extract sheet data', async () => {
      const file = createMockFile('xlsx content', 'sales.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processSpreadsheetFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.totalRows).toBeGreaterThan(0);
      expect(result.data?.preview).toBeDefined();
    });

    it('should handle multiple sheets', async () => {
      const file = createMockFile('xlsx content', 'multi-sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processSpreadsheetFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.sheetCount).toBe(2);
    });
  });

  describe('processEmailFile', () => {
    it('should process EML file successfully', async () => {
      const emailContent = `From: sender@example.com
To: recipient@example.com
Subject: Test Email
Date: Mon, 1 Jan 2024 12:00:00 +0000

This is the email body content.`;

      const file = createMockFile(emailContent, 'test.eml', 'message/rfc822');
      Object.defineProperty(file, 'size', { value: 1000 });

      const result = await processEmailFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should extract email headers', async () => {
      const emailContent = `From: sender@example.com
To: recipient@example.com
Subject: Important Meeting
Date: Mon, 1 Jan 2024 12:00:00 +0000

Meeting details here.`;

      const file = createMockFile(emailContent, 'meeting.eml', 'message/rfc822');
      Object.defineProperty(file, 'size', { value: 1000 });

      const result = await processEmailFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.from).toBe('sender@example.com');
      expect(result.data?.subject).toBe('Important Meeting');
    });

    it('should extract email body', async () => {
      const emailContent = `From: test@test.com
Subject: Test

Body content here.`;

      const file = createMockFile(emailContent, 'simple.eml', 'message/rfc822');
      Object.defineProperty(file, 'size', { value: 500 });

      const result = await processEmailFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.data?.bodyPreview).toContain('Body content');
    });
  });

  describe('processFile (Router)', () => {
    it('should route audio files correctly', async () => {
      const file = createMockFile('audio', 'test.m4a', 'audio/m4a');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.processingType).toBe('audio');
    });

    it('should route image files correctly', async () => {
      const file = createMockFile('image', 'test.jpg', 'image/jpeg');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.processingType).toBe('image');
    });

    it('should route PDF files correctly', async () => {
      const file = createMockFile('pdf', 'test.pdf', 'application/pdf');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.processingType).toBe('pdf');
    });

    it('should route document files correctly', async () => {
      const file = createMockFile('doc', 'test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.processingType).toBe('document');
    });

    it('should route spreadsheet files correctly', async () => {
      const file = createMockFile('csv', 'test.csv', 'text/csv');
      Object.defineProperty(file, 'size', { value: 1000000 });

      const result = await processFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.processingType).toBe('spreadsheet');
    });

    it('should route email files correctly', async () => {
      const emailContent = `From: test@test.com\nSubject: Test\n\nBody`;
      const file = createMockFile(emailContent, 'test.eml', 'message/rfc822');
      Object.defineProperty(file, 'size', { value: 1000 });

      const result = await processFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(true);
      expect(result.processingType).toBe('email');
    });

    it('should reject unsupported file types', async () => {
      const file = createMockFile('unknown', 'test.xyz', 'application/xyz');

      const result = await processFile(file, 'user-1', 'project-1', 'file-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported file type');
    });
  });

  describe('FILE_LIMITS', () => {
    it('should have correct audio file limits', () => {
      expect(FILE_LIMITS.audio.maxSize).toBe(2_000_000_000);
      expect(FILE_LIMITS.audio.types).toContain('.m4a');
      expect(FILE_LIMITS.audio.mimeTypes).toContain('audio/m4a');
    });

    it('should have correct image file limits', () => {
      expect(FILE_LIMITS.image.maxSize).toBe(50_000_000);
      expect(FILE_LIMITS.image.types).toContain('.jpg');
    });

    it('should have correct PDF file limits', () => {
      expect(FILE_LIMITS.pdf.maxSize).toBe(100_000_000);
      expect(FILE_LIMITS.pdf.types).toContain('.pdf');
    });

    it('should have correct document file limits', () => {
      expect(FILE_LIMITS.document.maxSize).toBe(50_000_000);
      expect(FILE_LIMITS.document.types).toContain('.docx');
    });

    it('should have correct spreadsheet file limits', () => {
      expect(FILE_LIMITS.spreadsheet.maxSize).toBe(50_000_000);
      expect(FILE_LIMITS.spreadsheet.types).toContain('.csv');
    });

    it('should have correct email file limits', () => {
      expect(FILE_LIMITS.email.maxSize).toBe(50_000_000);
      expect(FILE_LIMITS.email.types).toContain('.eml');
    });
  });
});
