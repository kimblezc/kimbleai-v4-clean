import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { WorkspaceRAGSystem } from '../rag-system';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// File type handlers
const SUPPORTED_TYPES = {
  'text/plain': 'text',
  'text/markdown': 'text',
  'application/json': 'text',
  'text/csv': 'text',
  'application/pdf': 'pdf',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/mp4': 'audio',
  'audio/x-m4a': 'audio',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc'
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'zach';
    const title = formData.get('title') as string || file.name;
    const tags = formData.get('tags') as string || '';
    const importance = parseFloat(formData.get('importance') as string || '0.8');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (1GB limit for audio, 100MB for others)
    const maxSize = file.type.startsWith('audio/') ? 1024 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large. Maximum size: ${file.type.startsWith('audio/') ? '1GB' : '100MB'}`
      }, { status: 400 });
    }

    // Check if file type is supported
    const fileType = SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES];
    if (!fileType) {
      return NextResponse.json({
        error: `Unsupported file type: ${file.type}`
      }, { status: 400 });
    }

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Google Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Initialize RAG system
    const ragSystem = new WorkspaceRAGSystem(drive);
    await ragSystem.initialize(userId);

    // Process file based on type
    let result;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    switch (fileType) {
      case 'text':
        result = await processTextFile(ragSystem, userId, file, fileBuffer, title, tags.split(','), importance);
        break;
      case 'audio':
        result = await processAudioFile(ragSystem, userId, file, fileBuffer, title, tags.split(','), importance);
        break;
      case 'pdf':
        result = await processPDFFile(ragSystem, userId, file, fileBuffer, title, tags.split(','), importance);
        break;
      case 'image':
        result = await processImageFile(ragSystem, userId, file, fileBuffer, title, tags.split(','), importance);
        break;
      case 'docx':
      case 'doc':
        result = await processWordFile(ragSystem, userId, file, fileBuffer, title, tags.split(','), importance);
        break;
      default:
        return NextResponse.json({
          error: `Processing not implemented for file type: ${fileType}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'File processed and stored successfully',
      result
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({
      error: 'Failed to process file',
      details: error.message
    }, { status: 500 });
  }
}

// Text file processing
async function processTextFile(
  ragSystem: WorkspaceRAGSystem,
  userId: string,
  file: File,
  buffer: Buffer,
  title: string,
  tags: string[],
  importance: number
) {
  const content = buffer.toString('utf-8');

  // Store document with RAG integration
  const result = await ragSystem.storeDocumentWithRAG(userId, {
    title: title,
    content: content,
    type: 'document',
    tags: ['upload', 'text', ...tags]
  });

  return {
    type: 'text',
    documentId: result.documentId,
    chunks: result.chunks.length,
    size: file.size,
    contentPreview: content.substring(0, 200) + '...'
  };
}

// Audio file processing (placeholder for Whisper integration)
async function processAudioFile(
  ragSystem: WorkspaceRAGSystem,
  userId: string,
  file: File,
  buffer: Buffer,
  title: string,
  tags: string[],
  importance: number
) {
  // Store raw audio file first
  const audioId = await ragSystem.storeCompressedMemory(userId, buffer.toString('base64'), {
    type: 'audio',
    title: `${title} (Audio File)`,
    tags: ['upload', 'audio', 'raw', ...tags],
    importance: importance
  });

  // TODO: Add Whisper transcription here
  // For now, return placeholder
  return {
    type: 'audio',
    audioId: audioId,
    size: file.size,
    duration: 'Unknown',
    transcriptionStatus: 'pending',
    note: 'Audio stored. Transcription will be implemented with Whisper integration.'
  };
}

// PDF processing (requires pdf-parse library)
async function processPDFFile(
  ragSystem: WorkspaceRAGSystem,
  userId: string,
  file: File,
  buffer: Buffer,
  title: string,
  tags: string[],
  importance: number
) {
  try {
    // Try to parse PDF (requires pdf-parse dependency)
    const pdf = require('pdf-parse');
    const pdfData = await pdf(buffer);

    const result = await ragSystem.storeDocumentWithRAG(userId, {
      title: title,
      content: pdfData.text,
      type: 'pdf',
      tags: ['upload', 'pdf', ...tags]
    });

    return {
      type: 'pdf',
      documentId: result.documentId,
      chunks: result.chunks.length,
      pages: pdfData.numpages,
      size: file.size,
      contentPreview: pdfData.text.substring(0, 200) + '...'
    };

  } catch (error) {
    // Fallback: store as binary
    const binaryId = await ragSystem.storeCompressedMemory(userId, buffer.toString('base64'), {
      type: 'pdf',
      title: `${title} (PDF Binary)`,
      tags: ['upload', 'pdf', 'binary', ...tags],
      importance: importance
    });

    return {
      type: 'pdf',
      documentId: binaryId,
      size: file.size,
      note: 'PDF stored as binary. Install pdf-parse for text extraction.'
    };
  }
}

// Image processing (basic metadata only)
async function processImageFile(
  ragSystem: WorkspaceRAGSystem,
  userId: string,
  file: File,
  buffer: Buffer,
  title: string,
  tags: string[],
  importance: number
) {
  const imageId = await ragSystem.storeCompressedMemory(userId, buffer.toString('base64'), {
    type: 'image',
    title: title,
    tags: ['upload', 'image', ...tags],
    importance: importance
  });

  return {
    type: 'image',
    imageId: imageId,
    size: file.size,
    mimeType: file.type,
    note: 'Image stored. OCR and AI vision analysis can be added later.'
  };
}

// Word document processing (requires mammoth or docx libraries)
async function processWordFile(
  ragSystem: WorkspaceRAGSystem,
  userId: string,
  file: File,
  buffer: Buffer,
  title: string,
  tags: string[],
  importance: number
) {
  try {
    // Try to parse Word document (requires mammoth dependency)
    // Note: mammoth disabled for Vercel deployment
    // const mammoth = require('mammoth');
    // const result = await mammoth.extractRawText({ buffer: buffer });
    const result = { value: '[Word document - text extraction disabled in production]' };

    const ragResult = await ragSystem.storeDocumentWithRAG(userId, {
      title: title,
      content: result.value,
      type: 'word',
      tags: ['upload', 'word', ...tags]
    });

    return {
      type: 'word',
      documentId: ragResult.documentId,
      chunks: ragResult.chunks.length,
      size: file.size,
      contentPreview: result.value.substring(0, 200) + '...'
    };

  } catch (error) {
    // Fallback: store as binary
    const binaryId = await ragSystem.storeCompressedMemory(userId, buffer.toString('base64'), {
      type: 'word',
      title: `${title} (Word Binary)`,
      tags: ['upload', 'word', 'binary', ...tags],
      importance: importance
    });

    return {
      type: 'word',
      documentId: binaryId,
      size: file.size,
      note: 'Word document stored as binary. Install mammoth for text extraction.'
    };
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Google Workspace File Upload System',
    supportedTypes: Object.keys(SUPPORTED_TYPES),
    maxSizes: {
      audio: '1GB',
      other: '100MB'
    },
    features: [
      'Text extraction and chunking',
      'RAG integration with vector search',
      'Compressed storage in Google Workspace',
      'Automatic metadata generation',
      'Audio transcription (Whisper integration pending)'
    ]
  });
}