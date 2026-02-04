/**
 * File Processing Service
 *
 * Handles file upload, text extraction, summarization, and embedding
 */

import { createClient } from '@supabase/supabase-js';
import { getAIService } from '@/lib/ai/ai-service';
import { logger } from '@/lib/utils/logger';
import { DatabaseError } from '@/lib/utils/errors';

export interface FileProcessingOptions {
  extractText?: boolean;
  summarize?: boolean;
  generateEmbedding?: boolean;
  conversationId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

export interface FileProcessingResult {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  summary?: string;
  embedding?: number[];
  processingDurationMs: number;
  costUsd: number;
}

export class FileService {
  constructor(private supabase: any) {}

  /**
   * Process uploaded file
   */
  async processFile(
    userId: string,
    file: File,
    options: FileProcessingOptions = {}
  ): Promise<FileProcessingResult> {
    const startTime = Date.now();

    const {
      extractText = true,
      summarize = true,
      generateEmbedding = true,
      conversationId,
      projectId,
      metadata = {},
    } = options;

    logger.info('Starting file processing', {
      userId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      conversationId,
      projectId,
    });

    // 1. Upload file to Supabase Storage
    const fileId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop();
    const storagePath = `${userId}/${fileId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await this.supabase.storage
      .from('files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('File upload failed', uploadError as Error, {
        userId,
        fileName: file.name,
      });
      throw new DatabaseError(`Failed to upload file: ${uploadError.message}`);
    }

    logger.info('File uploaded to storage', {
      userId,
      fileId,
      storagePath,
    });

    // 2. Get public URL
    const { data: urlData } = this.supabase.storage
      .from('files')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // 3. Extract text if requested
    let extractedText: string | undefined;
    let textExtractionCost = 0;

    if (extractText && this.isTextExtractable(file.type)) {
      const aiService = getAIService(this.supabase);

      try {
        const textResult = await logger.measure(
          'Extract text from file',
          async () => await aiService.extractTextFromFile({
            userId,
            fileUrl: publicUrl,
            mimeType: file.type,
          }),
          { userId, fileId, fileName: file.name }
        );

        extractedText = textResult.text;
        textExtractionCost = textResult.costUsd;

        logger.info('Text extracted from file', {
          userId,
          fileId,
          extractedLength: extractedText.length,
          costUsd: textExtractionCost,
        });
      } catch (error) {
        logger.error('Text extraction failed', error as Error, {
          userId,
          fileId,
          fileName: file.name,
        });
        // Continue processing even if extraction fails
      }
    }

    // 4. Generate summary if requested
    let summary: string | undefined;
    let summarizationCost = 0;

    if (summarize && extractedText && extractedText.length > 100) {
      const aiService = getAIService(this.supabase);

      try {
        const summaryResult = await logger.measure(
          'Generate file summary',
          async () => await aiService.summarizeText({
            userId,
            text: extractedText,
            maxLength: 500,
          }),
          { userId, fileId, textLength: extractedText.length }
        );

        summary = summaryResult.summary;
        summarizationCost = summaryResult.costUsd;

        logger.info('File summary generated', {
          userId,
          fileId,
          summaryLength: summary.length,
          costUsd: summarizationCost,
        });
      } catch (error) {
        logger.error('Summarization failed', error as Error, {
          userId,
          fileId,
        });
        // Continue processing even if summarization fails
      }
    }

    // 5. Generate embedding if requested
    let embedding: number[] | undefined;
    let embeddingCost = 0;

    if (generateEmbedding && extractedText && extractedText.length > 50) {
      const aiService = getAIService(this.supabase);

      try {
        const embeddingResult = await logger.measure(
          'Generate file embedding',
          async () => await aiService.generateEmbedding({
            userId,
            text: extractedText,
          }),
          { userId, fileId, textLength: extractedText.length }
        );

        embedding = embeddingResult.embedding;
        embeddingCost = embeddingResult.costUsd;

        logger.info('File embedding generated', {
          userId,
          fileId,
          embeddingDimensions: embedding.length,
          costUsd: embeddingCost,
        });
      } catch (error) {
        logger.error('Embedding generation failed', error as Error, {
          userId,
          fileId,
        });
        // Continue processing even if embedding fails
      }
    }

    // 6. Save file record to database (file_registry table in v5)
    const fileRecord = {
      id: `file_reg_${fileId.replace(/-/g, '_')}`,
      user_id: userId,
      file_source: 'upload' as const,
      source_id: fileId,
      source_metadata: {
        ...metadata,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        conversation_id: conversationId,
        extracted_text: extractedText,
        summary,
      },
      filename: file.name,
      mime_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      preview_url: publicUrl,
      processed: !!extractedText,
      processing_result: extractedText ? { text: extractedText, summary } : null,
      projects: projectId ? [projectId] : [],
    };

    const { error: insertError } = await this.supabase
      .from('file_registry')
      .insert(fileRecord);

    if (insertError) {
      logger.error('Failed to save file record', insertError as Error, {
        userId,
        fileId,
        fileName: file.name,
      });
      throw new DatabaseError(`Failed to save file record: ${insertError.message}`);
    }

    logger.dbQuery({
      table: 'file_registry',
      operation: 'INSERT',
      userId,
      durationMs: Date.now() - startTime,
    });

    const processingDurationMs = Date.now() - startTime;
    const totalCost = textExtractionCost + summarizationCost + embeddingCost;

    logger.info('File processing completed', {
      userId,
      fileId,
      fileName: file.name,
      processingDurationMs,
      totalCostUsd: totalCost,
    });

    logger.costTracking({
      userId,
      provider: 'openai',
      model: 'gpt-4o',
      costUsd: totalCost,
      tokensUsed: Math.ceil((extractedText?.length || 0) / 4),
    });

    return {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      extractedText,
      summary,
      embedding,
      processingDurationMs,
      costUsd: totalCost,
    };
  }

  /**
   * Delete file and all associated data
   */
  async deleteFile(userId: string, fileId: string): Promise<void> {
    logger.info('Deleting file', { userId, fileId });

    // 1. Get file record from file_registry
    const { data: file, error: fetchError } = await this.supabase
      .from('file_registry')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !file) {
      throw new DatabaseError('File not found');
    }

    // 2. Delete from storage (bucket is still called 'files')
    const { error: storageError } = await this.supabase.storage
      .from('files')
      .remove([file.storage_path]);

    if (storageError) {
      logger.warn('Failed to delete file from storage', {
        userId,
        fileId,
        error: storageError.message,
      });
      // Continue with database deletion even if storage deletion fails
    }

    // 3. Delete from database (file_registry table)
    const { error: deleteError } = await this.supabase
      .from('file_registry')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new DatabaseError(`Failed to delete file record: ${deleteError.message}`);
    }

    logger.info('File deleted successfully', { userId, fileId });
  }

  /**
   * Check if file type supports text extraction
   */
  private isTextExtractable(mimeType: string): boolean {
    const extractableTypes = [
      'text/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/json',
      'application/xml',
    ];

    return extractableTypes.some(type => mimeType.startsWith(type));
  }
}
