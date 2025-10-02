/**
 * Universal File Processor Library
 * Handles content extraction from multiple file formats for semantic search
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ProcessedContent {
  id: string;
  title: string;
  content: string;
  contentType: string;
  mimeType: string;
  size: number;
  chunks: ContentChunk[];
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface ContentChunk {
  id: string;
  content: string;
  embedding: number[];
  position: number;
  metadata: Record<string, any>;
}

export interface FileProcessorOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  generateEmbeddings?: boolean;
  userId?: string;
  tags?: string[];
}

export class UniversalFileProcessor {
  private static instance: UniversalFileProcessor;
  private readonly chunkSize: number = 1000;
  private readonly chunkOverlap: number = 100;

  static getInstance(): UniversalFileProcessor {
    if (!UniversalFileProcessor.instance) {
      UniversalFileProcessor.instance = new UniversalFileProcessor();
    }
    return UniversalFileProcessor.instance;
  }

  /**
   * Process any supported file type
   */
  async processFile(
    file: File | Buffer,
    fileName: string,
    mimeType: string,
    options: FileProcessorOptions = {}
  ): Promise<ProcessedContent> {
    const processor = this.getProcessorForMimeType(mimeType);
    if (!processor) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
    const size = buffer.length;

    // Extract content using appropriate processor
    const { content, metadata } = await processor(buffer, fileName);

    // Generate chunks
    const chunks = await this.createChunks(content, {
      chunkSize: options.chunkSize || this.chunkSize,
      chunkOverlap: options.chunkOverlap || this.chunkOverlap,
      generateEmbeddings: options.generateEmbeddings ?? true,
      metadata: { ...metadata, fileName, mimeType }
    });

    // Generate main content embedding if requested
    let embedding: number[] | undefined;
    if (options.generateEmbeddings) {
      embedding = await this.generateEmbedding(content.substring(0, 8000)); // Limit for API
    }

    const processedContent: ProcessedContent = {
      id: this.generateId(),
      title: fileName,
      content,
      contentType: this.getContentType(mimeType),
      mimeType,
      size,
      chunks,
      metadata: {
        ...metadata,
        userId: options.userId,
        tags: options.tags || [],
        processedAt: new Date().toISOString()
      },
      embedding
    };

    return processedContent;
  }

  /**
   * Create searchable chunks from content
   */
  private async createChunks(
    content: string,
    options: {
      chunkSize: number;
      chunkOverlap: number;
      generateEmbeddings: boolean;
      metadata: Record<string, any>;
    }
  ): Promise<ContentChunk[]> {
    const chunks: ContentChunk[] = [];
    const sentences = this.splitIntoSentences(content);

    let currentChunk = '';
    let currentPosition = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      if (currentChunk.length + sentence.length > options.chunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunk = await this.createChunk(
          currentChunk.trim(),
          chunkIndex,
          currentPosition,
          options.generateEmbeddings,
          options.metadata
        );
        chunks.push(chunk);

        // Start new chunk with overlap
        currentChunk = this.getOverlapText(currentChunk, options.chunkOverlap) + sentence;
        currentPosition += currentChunk.length - options.chunkOverlap;
        chunkIndex++;
      } else {
        currentChunk += sentence;
      }
    }

    // Add final chunk if there's remaining content
    if (currentChunk.trim().length > 0) {
      const chunk = await this.createChunk(
        currentChunk.trim(),
        chunkIndex,
        currentPosition,
        options.generateEmbeddings,
        options.metadata
      );
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Create a single content chunk
   */
  private async createChunk(
    content: string,
    index: number,
    position: number,
    generateEmbedding: boolean,
    metadata: Record<string, any>
  ): Promise<ContentChunk> {
    let embedding: number[] = [];

    if (generateEmbedding) {
      embedding = await this.generateEmbedding(content);
    }

    return {
      id: this.generateId(),
      content,
      embedding,
      position,
      metadata: {
        ...metadata,
        chunkIndex: index,
        chunkSize: content.length
      }
    };
  }

  /**
   * Generate OpenAI embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' ').trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Store processed content in database
   */
  async storeContent(content: ProcessedContent): Promise<string> {
    try {
      // Store main content record
      const { data: contentRecord, error: contentError } = await supabase
        .from('semantic_content')
        .insert({
          id: content.id,
          title: content.title,
          content: content.content,
          content_type: content.contentType,
          mime_type: content.mimeType,
          size: content.size,
          metadata: content.metadata,
          embedding: content.embedding,
          user_id: content.metadata.userId || 'default',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (contentError) {
        throw new Error(`Failed to store content: ${contentError.message}`);
      }

      // Store chunks
      const chunkRecords = content.chunks.map(chunk => ({
        id: chunk.id,
        content_id: content.id,
        content: chunk.content,
        embedding: chunk.embedding,
        position: chunk.position,
        metadata: chunk.metadata,
        created_at: new Date().toISOString()
      }));

      const { error: chunksError } = await supabase
        .from('semantic_chunks')
        .insert(chunkRecords);

      if (chunksError) {
        throw new Error(`Failed to store chunks: ${chunksError.message}`);
      }

      return content.id;
    } catch (error) {
      console.error('Error storing content:', error);
      throw error;
    }
  }

  /**
   * Get processor function for MIME type
   */
  private getProcessorForMimeType(mimeType: string): ((buffer: Buffer, fileName: string) => Promise<{content: string; metadata: Record<string, any>}>) | null {
    const processors: Record<string, (buffer: Buffer, fileName: string) => Promise<{content: string; metadata: Record<string, any>}>> = {
      'text/plain': this.processText.bind(this),
      'text/markdown': this.processText.bind(this),
      'text/csv': this.processText.bind(this),
      'application/json': this.processText.bind(this),
      'application/pdf': this.processPDF.bind(this),
      'audio/mpeg': this.processAudio.bind(this),
      'audio/wav': this.processAudio.bind(this),
      'audio/mp4': this.processAudio.bind(this),
      'audio/x-m4a': this.processAudio.bind(this),
      'image/jpeg': this.processImage.bind(this),
      'image/png': this.processImage.bind(this),
      'image/gif': this.processImage.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.processWord.bind(this),
      'application/msword': this.processWord.bind(this)
    };

    return processors[mimeType] || null;
  }

  /**
   * Process text files
   */
  private async processText(buffer: Buffer, fileName: string): Promise<{content: string; metadata: Record<string, any>}> {
    const content = buffer.toString('utf-8');
    return {
      content,
      metadata: {
        encoding: 'utf-8',
        lineCount: content.split('\n').length,
        wordCount: content.split(/\s+/).length
      }
    };
  }

  /**
   * Process PDF files
   */
  private async processPDF(buffer: Buffer, fileName: string): Promise<{content: string; metadata: Record<string, any>}> {
    try {
      // Try to use pdf-parse if available (dynamic import to avoid build-time dependency)
      let pdfParse: any;
      try {
        pdfParse = await eval('import("pdf-parse")');
      } catch (importError) {
        throw new Error('pdf-parse package not installed');
      }

      const data = await pdfParse.default(buffer);
      return {
        content: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info || {},
          version: data.version
        }
      };
    } catch (error) {
      // Fallback: basic text extraction attempt or placeholder
      return {
        content: `PDF Document: ${fileName}\n\nContent extraction failed. PDF stored as binary data.`,
        metadata: {
          extractionError: (error as Error).message,
          requiresManualProcessing: true
        }
      };
    }
  }

  /**
   * Process audio files (placeholder for Whisper integration)
   */
  private async processAudio(buffer: Buffer, fileName: string): Promise<{content: string; metadata: Record<string, any>}> {
    // TODO: Integrate with OpenAI Whisper API
    return {
      content: `Audio File: ${fileName}\n\nTranscription pending - Whisper integration required.`,
      metadata: {
        duration: 'unknown',
        size: buffer.length,
        requiresTranscription: true,
        audioFormat: 'binary'
      }
    };
  }

  /**
   * Process image files (placeholder for OCR/Vision)
   */
  private async processImage(buffer: Buffer, fileName: string): Promise<{content: string; metadata: Record<string, any>}> {
    // TODO: Integrate with OCR or OpenAI Vision API
    return {
      content: `Image File: ${fileName}\n\nText extraction pending - OCR integration required.`,
      metadata: {
        size: buffer.length,
        requiresOCR: true,
        imageFormat: 'binary'
      }
    };
  }

  /**
   * Process Word documents
   */
  private async processWord(buffer: Buffer, fileName: string): Promise<{content: string; metadata: Record<string, any>}> {
    try {
      // Try to use mammoth if available (dynamic import to avoid build-time dependency)
      let mammoth: any;
      try {
        mammoth = await eval('import("mammoth")');
      } catch (importError) {
        throw new Error('mammoth package not installed');
      }

      const result = await mammoth.extractRawText({ buffer });
      return {
        content: result.value,
        metadata: {
          messages: result.messages || [],
          wordCount: result.value.split(/\s+/).length
        }
      };
    } catch (error) {
      // Fallback
      return {
        content: `Word Document: ${fileName}\n\nContent extraction failed. Document stored as binary data.`,
        metadata: {
          extractionError: (error as Error).message,
          requiresManualProcessing: true
        }
      };
    }
  }

  /**
   * Utility functions
   */
  private getContentType(mimeType: string): string {
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    return 'binary';
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be enhanced with NLP libraries
    return text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
  }

  private getOverlapText(text: string, overlapSize: number): string {
    return text.slice(-overlapSize);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get supported MIME types
   */
  static getSupportedMimeTypes(): string[] {
    return [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/pdf',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/x-m4a',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
  }
}

export default UniversalFileProcessor;