// lib/file-content-extractor.ts
// Comprehensive file content extractor using officeparser and other libraries

// NOTE: officeparser is dynamically imported to avoid build-time errors
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import sharp from 'sharp';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import { FileRegistryEntry } from './unified-file-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Extracted content structure
export interface ExtractedContent {
  text: string;
  images?: Array<{
    data: Buffer;
    format: string;
    width?: number;
    height?: number;
  }>;
  tables?: Array<{
    rows: string[][];
    sheetName?: string;
  }>;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    author?: string;
    title?: string;
    subject?: string;
    createdDate?: string;
    modifiedDate?: string;
    language?: string;
    [key: string]: any;
  };
  structuredData?: any;
}

/**
 * Main extraction function - routes to appropriate extractor based on file type
 */
export async function extractFileContent(
  file: FileRegistryEntry,
  fileBuffer?: Buffer
): Promise<ExtractedContent> {
  console.log(`[EXTRACTOR] Extracting content from ${file.filename} (${file.mime_type})`);

  try {
    // Download file if buffer not provided
    if (!fileBuffer) {
      fileBuffer = await downloadFile(file);
    }

    const mimeType = file.mime_type.toLowerCase();
    const fileName = file.filename.toLowerCase();

    // Route to appropriate extractor
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractPDF(fileBuffer, file);
    } else if (
      mimeType.includes('wordprocessingml.document') ||
      fileName.endsWith('.docx')
    ) {
      return await extractDOCX(fileBuffer, file);
    } else if (
      mimeType.includes('spreadsheetml.sheet') ||
      fileName.endsWith('.xlsx')
    ) {
      return await extractXLSX(fileBuffer, file);
    } else if (
      mimeType.includes('presentationml.presentation') ||
      fileName.endsWith('.pptx')
    ) {
      return await extractPPTX(fileBuffer, file);
    } else if (mimeType.includes('opendocument')) {
      return await extractOpenDocument(fileBuffer, file);
    } else if (mimeType.startsWith('image/')) {
      return await extractImage(fileBuffer, file);
    } else if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) {
      return await extractText(fileBuffer, file);
    } else if (mimeType === 'text/csv' || fileName.endsWith('.csv')) {
      return await extractCSV(fileBuffer, file);
    } else if (
      file.file_source === 'drive' &&
      (mimeType.includes('google-apps.document') ||
        mimeType.includes('google-apps.spreadsheet') ||
        mimeType.includes('google-apps.presentation'))
    ) {
      return await extractGoogleDoc(file);
    } else {
      console.log(`[EXTRACTOR] Attempting officeparser for ${file.mime_type}`);
      return await extractWithOfficeParser(fileBuffer, file);
    }
  } catch (error: any) {
    console.error('[EXTRACTOR] Error:', error);
    return {
      text: '',
      metadata: {
        error: error.message,
        filename: file.filename,
        mimeType: file.mime_type,
      },
    };
  }
}

/**
 * Download file from storage
 */
async function downloadFile(file: FileRegistryEntry): Promise<Buffer> {
  if (file.storage_path.startsWith('http')) {
    // External URL - fetch it
    const response = await fetch(file.storage_path);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    // Supabase storage
    const bucket = getBucketFromPath(file.storage_path);
    const path = getPathFromStorage(file.storage_path);

    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
  }
}

/**
 * Extract content from PDF using pdf-parse
 */
async function extractPDF(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing PDF with pdf-parse');

  try {
    const data = await pdfParse(buffer);

    return {
      text: data.text,
      metadata: {
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).length,
        title: data.info?.Title || file.filename,
        author: data.info?.Author || '',
        subject: data.info?.Subject || '',
        createdDate: data.info?.CreationDate || '',
        modifiedDate: data.info?.ModDate || '',
      },
    };
  } catch (error: any) {
    console.error('[EXTRACTOR] PDF extraction failed:', error);
    return {
      text: '',
      metadata: {
        error: `PDF extraction failed: ${error.message}`,
      },
    };
  }
}

/**
 * Extract content from DOCX using both mammoth and officeparser
 */
async function extractDOCX(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing DOCX');

  try {
    // Try mammoth first for better formatting
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Try officeparser for metadata
    let metadata: any = {};
    try {
      const officeParser = (await import('officeparser')).default;
      const officeData = await officeParser.parseOfficeAsync(buffer);
      metadata = {
        ...officeData,
        wordCount: text.split(/\s+/).length,
      };
    } catch (e) {
      metadata = {
        wordCount: text.split(/\s+/).length,
      };
    }

    return {
      text,
      metadata,
    };
  } catch (error: any) {
    console.error('[EXTRACTOR] DOCX extraction failed:', error);
    // Fallback to officeparser
    return await extractWithOfficeParser(buffer, file);
  }
}

/**
 * Extract content from XLSX using xlsx library
 */
async function extractXLSX(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing XLSX');

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const tables: Array<{ rows: string[][]; sheetName: string }> = [];
    let allText = '';

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      }) as string[][];

      tables.push({
        sheetName,
        rows: jsonData,
      });

      // Convert to text for search
      const sheetText = jsonData.map((row) => row.join(' ')).join('\n');
      allText += `\n\n=== Sheet: ${sheetName} ===\n${sheetText}`;
    });

    return {
      text: allText.trim(),
      tables,
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheets: workbook.SheetNames,
        totalRows: tables.reduce((sum, table) => sum + table.rows.length, 0),
      },
    };
  } catch (error: any) {
    console.error('[EXTRACTOR] XLSX extraction failed:', error);
    return {
      text: '',
      metadata: {
        error: `XLSX extraction failed: ${error.message}`,
      },
    };
  }
}

/**
 * Extract content from PPTX using officeparser
 */
async function extractPPTX(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing PPTX with officeparser');
  return await extractWithOfficeParser(buffer, file);
}

/**
 * Extract content from OpenDocument formats using officeparser
 */
async function extractOpenDocument(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing OpenDocument with officeparser');
  return await extractWithOfficeParser(buffer, file);
}

/**
 * Extract content using officeparser (fallback for Office formats)
 */
async function extractWithOfficeParser(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  try {
    // Dynamic import to avoid build-time errors
    const officeParser = (await import('officeparser')).default;
    const text = await officeParser.parseOfficeAsync(buffer);

    return {
      text: typeof text === 'string' ? text : JSON.stringify(text),
      metadata: {
        wordCount:
          typeof text === 'string'
            ? text.split(/\s+/).length
            : JSON.stringify(text).split(/\s+/).length,
        extractor: 'officeparser',
      },
    };
  } catch (error: any) {
    console.error('[EXTRACTOR] officeparser failed:', error);
    return {
      text: '',
      metadata: {
        error: `officeparser failed: ${error.message}`,
      },
    };
  }
}

/**
 * Extract content from images using OpenAI Vision
 */
async function extractImage(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing image with OpenAI Vision');

  try {
    // Get image metadata
    const imageMetadata = await sharp(buffer).metadata();

    // Analyze with OpenAI Vision
    const base64Image = buffer.toString('base64');
    const mimeType = file.mime_type || 'image/jpeg';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image thoroughly. Extract any visible text, describe the content, identify objects, people, or information. Be comprehensive and detailed.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const analysis = response.choices[0].message.content || '';

    return {
      text: analysis,
      metadata: {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format: imageMetadata.format,
        space: imageMetadata.space,
        channels: imageMetadata.channels,
        hasAlpha: imageMetadata.hasAlpha,
        extractor: 'openai-vision',
      },
    };
  } catch (error: any) {
    console.error('[EXTRACTOR] Image extraction failed:', error);
    return {
      text: '',
      metadata: {
        error: `Image extraction failed: ${error.message}`,
      },
    };
  }
}

/**
 * Extract plain text content
 */
async function extractText(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing text file');

  const text = buffer.toString('utf-8');

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).length,
      lineCount: text.split('\n').length,
      charCount: text.length,
    },
  };
}

/**
 * Extract CSV content
 */
async function extractCSV(
  buffer: Buffer,
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing CSV');

  try {
    const text = buffer.toString('utf-8');
    const workbook = XLSX.read(text, { type: 'string' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    }) as string[][];

    const textContent = jsonData.map((row) => row.join(' ')).join('\n');

    return {
      text: textContent,
      tables: [
        {
          sheetName: 'Sheet1',
          rows: jsonData,
        },
      ],
      metadata: {
        rowCount: jsonData.length,
        columnCount: jsonData[0]?.length || 0,
      },
    };
  } catch (error: any) {
    console.error('[EXTRACTOR] CSV extraction failed:', error);
    return {
      text: buffer.toString('utf-8'),
      metadata: {
        error: `CSV parsing failed: ${error.message}`,
      },
    };
  }
}

/**
 * Extract Google Docs/Sheets/Slides by exporting to Office format first
 */
async function extractGoogleDoc(
  file: FileRegistryEntry
): Promise<ExtractedContent> {
  console.log('[EXTRACTOR] Processing Google Doc by exporting');

  try {
    // Get Google Drive credentials from file metadata
    const accessToken = file.source_metadata?.accessToken;
    if (!accessToken) {
      throw new Error('No access token found in file metadata');
    }

    const drive = google.drive({ version: 'v3' });
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    // Determine export MIME type
    let exportMimeType: string;
    if (file.mime_type.includes('document')) {
      exportMimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (file.mime_type.includes('spreadsheet')) {
      exportMimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (file.mime_type.includes('presentation')) {
      exportMimeType =
        'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
      throw new Error(`Unsupported Google Docs type: ${file.mime_type}`);
    }

    // Export file
    const response = await drive.files.export(
      {
        fileId: file.source_id,
        mimeType: exportMimeType,
        auth,
      },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);

    // Process the exported file
    if (exportMimeType.includes('wordprocessing')) {
      return await extractDOCX(buffer, file);
    } else if (exportMimeType.includes('spreadsheet')) {
      return await extractXLSX(buffer, file);
    } else {
      return await extractPPTX(buffer, file);
    }
  } catch (error: any) {
    console.error('[EXTRACTOR] Google Doc extraction failed:', error);
    return {
      text: '',
      metadata: {
        error: `Google Doc extraction failed: ${error.message}`,
        note: 'Unable to export Google Doc. May need to use Drive API directly.',
      },
    };
  }
}

/**
 * Helper: Get bucket name from storage path
 */
function getBucketFromPath(path: string): string {
  if (path.includes('gmail-attachments')) return 'gmail-attachments';
  if (path.includes('audio-files')) return 'audio-files';
  if (path.includes('thumbnails')) return 'thumbnails';
  if (path.includes('documents')) return 'documents';
  return 'files';
}

/**
 * Helper: Get path from storage path
 */
function getPathFromStorage(path: string): string {
  const buckets = [
    'gmail-attachments/',
    'audio-files/',
    'thumbnails/',
    'documents/',
    'files/',
  ];
  for (const bucket of buckets) {
    if (path.startsWith(bucket)) {
      return path.substring(bucket.length);
    }
  }
  return path;
}
