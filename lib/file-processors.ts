// lib/file-processors.ts
// Comprehensive file processing system for all file types

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { AssemblyAI } from 'assemblyai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// File type constants
export const FILE_LIMITS = {
  audio: {
    maxSize: 2_000_000_000, // 2GB
    types: ['.m4a', '.mp3', '.wav', '.flac', '.ogg', '.aac'],
    mimeTypes: ['audio/m4a', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac']
  },
  image: {
    maxSize: 50_000_000, // 50MB
    types: ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.bmp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'image/gif', 'image/bmp']
  },
  pdf: {
    maxSize: 100_000_000, // 100MB
    types: ['.pdf'],
    mimeTypes: ['application/pdf']
  },
  document: {
    maxSize: 50_000_000, // 50MB
    types: ['.docx', '.txt', '.md', '.rtf'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'application/rtf']
  },
  spreadsheet: {
    maxSize: 50_000_000, // 50MB
    types: ['.csv', '.xlsx', '.xls'],
    mimeTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  },
  email: {
    maxSize: 50_000_000, // 50MB
    types: ['.eml', '.msg'],
    mimeTypes: ['message/rfc822', 'application/vnd.ms-outlook']
  }
};

// Helper: Generate embeddings
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

// Helper: Store in knowledge base
async function storeInKnowledgeBase(params: {
  userId: string;
  sourceType: string;
  sourceId: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  metadata: any;
}) {
  const embedding = await generateEmbedding(params.content);

  await supabase.from('knowledge_base').insert({
    user_id: params.userId,
    source_type: params.sourceType,
    source_id: params.sourceId,
    category: params.category,
    title: params.title,
    content: params.content.substring(0, 2000),
    embedding: embedding,
    importance: 0.7,
    tags: params.tags,
    metadata: params.metadata
  });
}

// Helper: Upload to Supabase Storage
async function uploadToStorage(
  bucket: string,
  path: string,
  file: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload to storage error:', error);
    return null;
  }
}

// Processor: Audio Files
export async function processAudioFile(
  file: File,
  userId: string,
  projectId: string,
  fileId: string,
  driveUrl?: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`[AUDIO] Processing ${file.name} (${file.size} bytes)`);

    // Use Drive URL if provided, otherwise process uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const audioUrl = driveUrl || null; // Files stay in Drive

    // Process with AssemblyAI for better transcription
    console.log('[AUDIO] Starting AssemblyAI transcription...');

    let transcript;
    try {
      transcript = await assemblyai.transcripts.transcribe({
        audio: audioUrl || buffer,
        speaker_labels: true, // Diarization
        auto_chapters: true, // Chapter detection
        sentiment_analysis: true,
        entity_detection: true
      });
    } catch (assemblyError) {
      // Fallback to OpenAI Whisper
      console.log('[AUDIO] AssemblyAI failed, falling back to Whisper...');
      const whisperFile = new File([buffer], file.name, { type: file.type });
      const whisperResult = await openai.audio.transcriptions.create({
        file: whisperFile,
        model: 'whisper-1',
        response_format: 'verbose_json'
      });

      transcript = {
        text: whisperResult.text,
        words: whisperResult.words,
        utterances: [],
        chapters: []
      };
    }

    // Store in database
    const { data: transcriptionRecord } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        filename: file.name,
        file_size: file.size,
        storage_url: audioUrl,
        duration: transcript.audio_duration || 0,
        text: transcript.text,
        words: transcript.words,
        utterances: transcript.utterances,
        chapters: transcript.chapters,
        metadata: {
          speakers: transcript.utterances?.length || 0,
          confidence: transcript.confidence || 0,
          language: transcript.language_code || 'en'
        }
      })
      .select()
      .single();

    // Store in knowledge base
    await storeInKnowledgeBase({
      userId,
      sourceType: 'audio',
      sourceId: fileId,
      category: 'audio_transcription',
      title: file.name,
      content: transcript.text || '',
      tags: ['audio', 'transcription', projectId],
      metadata: {
        filename: file.name,
        duration: transcript.audio_duration,
        speakers: transcript.utterances?.length || 0
      }
    });

    console.log('[AUDIO] Processing completed');

    return {
      success: true,
      data: {
        transcription: transcript.text,
        duration: transcript.audio_duration,
        speakers: transcript.utterances?.length || 0,
        chapters: transcript.chapters?.length || 0,
        storageUrl: audioUrl
      }
    };
  } catch (error: any) {
    console.error('[AUDIO] Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Processor: Image Files
export async function processImageFile(
  file: File,
  userId: string,
  projectId: string,
  fileId: string,
  driveUrl?: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`[IMAGE] Processing ${file.name} (${file.size} bytes)`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract metadata
    const imageMetadata = await sharp(buffer).metadata();

    // Generate thumbnail (store in Supabase)
    const thumbnail = await sharp(buffer)
      .resize(400, 400, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload only thumbnail to Supabase, original stays in Drive
    const thumbnailPath = `${userId}/${fileId}/thumb_${file.name}`;
    const thumbnailUrl = await uploadToStorage('thumbnails', thumbnailPath, thumbnail, 'image/jpeg');
    const imageUrl = driveUrl || null; // Original stays in Drive

    // Use OpenAI Vision for analysis
    console.log('[IMAGE] Analyzing with OpenAI Vision...');
    const base64Image = buffer.toString('base64');
    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image. Describe what you see, extract any visible text, and identify key objects, people, or information.'
            },
            {
              type: 'image_url',
              image_url: { url: `data:${file.type};base64,${base64Image}` }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const analysis = visionResponse.choices[0].message.content || '';

    // Store in database
    const { data: imageRecord } = await supabase
      .from('processed_images')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        filename: file.name,
        file_size: file.size,
        storage_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        width: imageMetadata.width,
        height: imageMetadata.height,
        format: imageMetadata.format,
        analysis: analysis,
        metadata: {
          space: imageMetadata.space,
          channels: imageMetadata.channels,
          depth: imageMetadata.depth,
          hasAlpha: imageMetadata.hasAlpha
        }
      })
      .select()
      .single();

    // Store in knowledge base
    await storeInKnowledgeBase({
      userId,
      sourceType: 'image',
      sourceId: fileId,
      category: 'image_analysis',
      title: file.name,
      content: analysis,
      tags: ['image', 'vision', projectId],
      metadata: {
        filename: file.name,
        dimensions: `${imageMetadata.width}x${imageMetadata.height}`,
        format: imageMetadata.format
      }
    });

    console.log('[IMAGE] Processing completed');

    return {
      success: true,
      data: {
        analysis,
        dimensions: `${imageMetadata.width}x${imageMetadata.height}`,
        format: imageMetadata.format,
        storageUrl: imageUrl,
        thumbnailUrl
      }
    };
  } catch (error: any) {
    console.error('[IMAGE] Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Processor: PDF Files
export async function processPDFFile(
  file: File,
  userId: string,
  projectId: string,
  fileId: string,
  driveUrl?: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`[PDF] Processing ${file.name} (${file.size} bytes)`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse PDF
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle() || file.name;
    const author = pdfDoc.getAuthor() || '';
    const subject = pdfDoc.getSubject() || '';

    // Extract text using pdf-parse
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);
    const textContent = pdfData.text;

    // File stays in Drive
    const pdfUrl = driveUrl || null;

    // Generate thumbnail of first page (using sharp if possible)
    let thumbnailUrl = null;
    try {
      // This is a simplified approach - for production, consider using pdf2pic or similar
      console.log('[PDF] Thumbnail generation skipped (requires additional setup)');
    } catch (thumbError) {
      console.log('[PDF] Thumbnail generation failed:', thumbError);
    }

    // Store in database
    const { data: pdfRecord } = await supabase
      .from('processed_documents')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        filename: file.name,
        file_size: file.size,
        storage_url: pdfUrl,
        thumbnail_url: thumbnailUrl,
        document_type: 'pdf',
        content: textContent,
        page_count: pageCount,
        metadata: {
          title,
          author,
          subject,
          wordCount: textContent.split(/\s+/).length
        }
      })
      .select()
      .single();

    // Store in knowledge base (chunked for large documents)
    const chunkSize = 2000;
    const chunks = [];
    for (let i = 0; i < textContent.length; i += chunkSize) {
      chunks.push(textContent.substring(i, i + chunkSize));
    }

    // Store first chunk or summary
    await storeInKnowledgeBase({
      userId,
      sourceType: 'document',
      sourceId: fileId,
      category: 'pdf',
      title: file.name,
      content: textContent.substring(0, 2000),
      tags: ['pdf', 'document', projectId],
      metadata: {
        filename: file.name,
        pages: pageCount,
        author,
        wordCount: textContent.split(/\s+/).length
      }
    });

    console.log('[PDF] Processing completed');

    return {
      success: true,
      data: {
        pageCount,
        wordCount: textContent.split(/\s+/).length,
        title,
        author,
        contentPreview: textContent.substring(0, 500),
        storageUrl: pdfUrl
      }
    };
  } catch (error: any) {
    console.error('[PDF] Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Processor: Document Files (.docx, .txt, .md)
export async function processDocumentFile(
  file: File,
  userId: string,
  projectId: string,
  fileId: string,
  driveUrl?: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`[DOCUMENT] Processing ${file.name} (${file.size} bytes)`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let textContent = '';

    // Extract text based on file type
    if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else {
      // Plain text files (.txt, .md, .rtf)
      textContent = buffer.toString('utf-8');
    }

    // File stays in Drive
    const docUrl = driveUrl || null;

    // Store in database
    const { data: docRecord } = await supabase
      .from('processed_documents')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        filename: file.name,
        file_size: file.size,
        storage_url: docUrl,
        document_type: file.name.split('.').pop(),
        content: textContent,
        metadata: {
          wordCount: textContent.split(/\s+/).length,
          lineCount: textContent.split('\n').length,
          charCount: textContent.length
        }
      })
      .select()
      .single();

    // Store in knowledge base
    await storeInKnowledgeBase({
      userId,
      sourceType: 'document',
      sourceId: fileId,
      category: 'text_document',
      title: file.name,
      content: textContent.substring(0, 2000),
      tags: ['document', 'text', projectId],
      metadata: {
        filename: file.name,
        wordCount: textContent.split(/\s+/).length
      }
    });

    console.log('[DOCUMENT] Processing completed');

    return {
      success: true,
      data: {
        wordCount: textContent.split(/\s+/).length,
        lineCount: textContent.split('\n').length,
        contentPreview: textContent.substring(0, 500),
        storageUrl: docUrl
      }
    };
  } catch (error: any) {
    console.error('[DOCUMENT] Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Processor: Spreadsheet Files (.csv, .xlsx)
export async function processSpreadsheetFile(
  file: File,
  userId: string,
  projectId: string,
  fileId: string,
  driveUrl?: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`[SPREADSHEET] Processing ${file.name} (${file.size} bytes)`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse spreadsheet
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    const sheetsData: any = {};

    // Extract data from all sheets
    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      sheetsData[sheetName] = {
        rows: jsonData.length,
        columns: Object.keys(jsonData[0] || {}).length,
        data: jsonData.slice(0, 100) // Store first 100 rows
      };
    }

    // File stays in Drive
    const spreadsheetUrl = driveUrl || null;

    // Create text representation for search
    const textContent = JSON.stringify(sheetsData, null, 2);

    // Store in database
    const { data: spreadsheetRecord } = await supabase
      .from('processed_documents')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        filename: file.name,
        file_size: file.size,
        storage_url: spreadsheetUrl,
        document_type: 'spreadsheet',
        content: textContent.substring(0, 10000),
        metadata: {
          sheets: sheetNames,
          sheetCount: sheetNames.length,
          totalRows: Object.values(sheetsData).reduce((sum: number, sheet: any) => sum + sheet.rows, 0),
          structure: sheetsData
        }
      })
      .select()
      .single();

    // Store in knowledge base
    await storeInKnowledgeBase({
      userId,
      sourceType: 'document',
      sourceId: fileId,
      category: 'spreadsheet',
      title: file.name,
      content: textContent.substring(0, 2000),
      tags: ['spreadsheet', 'data', projectId],
      metadata: {
        filename: file.name,
        sheets: sheetNames.length,
        rows: Object.values(sheetsData).reduce((sum: number, sheet: any) => sum + sheet.rows, 0)
      }
    });

    console.log('[SPREADSHEET] Processing completed');

    return {
      success: true,
      data: {
        sheetCount: sheetNames.length,
        sheets: sheetNames,
        totalRows: Object.values(sheetsData).reduce((sum: number, sheet: any) => sum + sheet.rows, 0),
        storageUrl: spreadsheetUrl,
        preview: sheetsData[sheetNames[0]]?.data?.slice(0, 5) || []
      }
    };
  } catch (error: any) {
    console.error('[SPREADSHEET] Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Processor: Email Files (.eml, .msg)
export async function processEmailFile(
  file: File,
  userId: string,
  projectId: string,
  fileId: string,
  driveUrl?: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`[EMAIL] Processing ${file.name} (${file.size} bytes)`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const content = buffer.toString('utf-8');

    // Basic email parsing (for .eml format)
    // For production, consider using dedicated email parsing libraries
    const emailData: any = {
      raw: content,
      headers: {},
      body: '',
      attachments: []
    };

    // Extract headers (basic parsing)
    const headerMatch = content.match(/^(.*?)\n\n/s);
    if (headerMatch) {
      const headerLines = headerMatch[1].split('\n');
      headerLines.forEach(line => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          emailData.headers[match[1].toLowerCase()] = match[2];
        }
      });
    }

    // Extract body
    const bodyMatch = content.match(/\n\n(.*)/s);
    if (bodyMatch) {
      emailData.body = bodyMatch[1];
    }

    // File stays in Drive (or Gmail)
    const emailUrl = driveUrl || null;

    // Store in database
    const { data: emailRecord } = await supabase
      .from('processed_documents')
      .insert({
        user_id: userId,
        project_id: projectId,
        file_id: fileId,
        filename: file.name,
        file_size: file.size,
        storage_url: emailUrl,
        document_type: 'email',
        content: emailData.body,
        metadata: {
          from: emailData.headers['from'] || '',
          to: emailData.headers['to'] || '',
          subject: emailData.headers['subject'] || '',
          date: emailData.headers['date'] || '',
          attachmentCount: emailData.attachments.length
        }
      })
      .select()
      .single();

    // Store in knowledge base
    await storeInKnowledgeBase({
      userId,
      sourceType: 'document',
      sourceId: fileId,
      category: 'email',
      title: emailData.headers['subject'] || file.name,
      content: emailData.body.substring(0, 2000),
      tags: ['email', 'communication', projectId],
      metadata: {
        filename: file.name,
        from: emailData.headers['from'],
        subject: emailData.headers['subject']
      }
    });

    console.log('[EMAIL] Processing completed');

    return {
      success: true,
      data: {
        from: emailData.headers['from'],
        to: emailData.headers['to'],
        subject: emailData.headers['subject'],
        date: emailData.headers['date'],
        bodyPreview: emailData.body.substring(0, 500),
        storageUrl: emailUrl
      }
    };
  } catch (error: any) {
    console.error('[EMAIL] Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main file processor router
export async function processFile(
  file: File,
  userId: string,
  projectId: string,
  fileId: string,
  driveUrl?: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  processingType?: string;
}> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Audio files
  if (FILE_LIMITS.audio.mimeTypes.some(t => fileType.includes(t.split('/')[1]))) {
    const result = await processAudioFile(file, userId, projectId, fileId, driveUrl);
    return { ...result, processingType: 'audio' };
  }

  // Image files
  if (fileType.startsWith('image/')) {
    const result = await processImageFile(file, userId, projectId, fileId, driveUrl);
    return { ...result, processingType: 'image' };
  }

  // PDF files
  if (fileName.endsWith('.pdf')) {
    const result = await processPDFFile(file, userId, projectId, fileId, driveUrl);
    return { ...result, processingType: 'pdf' };
  }

  // Spreadsheet files
  if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const result = await processSpreadsheetFile(file, userId, projectId, fileId, driveUrl);
    return { ...result, processingType: 'spreadsheet' };
  }

  // Email files
  if (fileName.endsWith('.eml') || fileName.endsWith('.msg')) {
    const result = await processEmailFile(file, userId, projectId, fileId, driveUrl);
    return { ...result, processingType: 'email' };
  }

  // Document files (must be last as it's the catch-all)
  if (fileName.endsWith('.docx') || fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.rtf')) {
    const result = await processDocumentFile(file, userId, projectId, fileId, driveUrl);
    return { ...result, processingType: 'document' };
  }

  return {
    success: false,
    error: 'Unsupported file type'
  };
}

// Validation helper
export function validateFile(file: File): { valid: boolean; error?: string; category?: string } {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // Check each category
  for (const [category, limits] of Object.entries(FILE_LIMITS)) {
    const hasValidExtension = limits.types.some(ext => fileName.endsWith(ext));
    const hasValidMimeType = limits.mimeTypes.some(mime => fileType.includes(mime.split('/')[1]));

    if (hasValidExtension || hasValidMimeType) {
      if (file.size > limits.maxSize) {
        return {
          valid: false,
          error: `File too large. Maximum size for ${category} files is ${limits.maxSize / 1_000_000}MB`
        };
      }
      return { valid: true, category };
    }
  }

  return {
    valid: false,
    error: 'Unsupported file type'
  };
}
