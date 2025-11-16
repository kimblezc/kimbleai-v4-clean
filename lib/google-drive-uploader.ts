// lib/google-drive-uploader.ts
// Google Drive uploader for AssemblyAI transcription outputs

import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Drive service account credentials from environment
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  error?: string;
}

interface TranscriptionOutputs {
  transcriptText: string;
  speakerLabeled: any;
  srtSubtitles: string;
  metadata: any;
}

/**
 * Initialize Google Drive API with service account authentication
 */
function getDriveClient() {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Drive credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.');
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Upload a file to Google Drive
 */
async function uploadToDrive(
  fileName: string,
  mimeType: string,
  content: string | Buffer
): Promise<DriveUploadResult> {
  try {
    const drive = getDriveClient();

    // Convert content to readable stream
    const bufferContent = Buffer.from(content);
    const readableStream = Readable.from(bufferContent);

    const fileMetadata = {
      name: fileName,
      ...(GOOGLE_DRIVE_FOLDER_ID && { parents: [GOOGLE_DRIVE_FOLDER_ID] }),
    };

    const media = {
      mimeType,
      body: readableStream,
    };

    console.log(`[GoogleDrive] Uploading ${fileName} (${bufferContent.length} bytes)`);

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    const file = response.data;

    console.log(`[GoogleDrive] Successfully uploaded ${fileName} (ID: ${file.id})`);

    return {
      success: true,
      fileId: file.id || undefined,
      fileName: file.name || fileName,
      webViewLink: file.webViewLink || undefined,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] Upload failed for ${fileName}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown upload error',
    };
  }
}

/**
 * Generate SRT (SubRip Subtitle) format from AssemblyAI utterances
 */
function generateSRT(utterances: any[]): string {
  if (!utterances || utterances.length === 0) {
    return '';
  }

  let srtContent = '';
  let index = 1;

  for (const utterance of utterances) {
    const startTime = formatSRTTime(utterance.start);
    const endTime = formatSRTTime(utterance.end);
    const speaker = utterance.speaker ? `[${utterance.speaker}] ` : '';
    const text = utterance.text || '';

    srtContent += `${index}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${speaker}${text}\n\n`;

    index++;
  }

  return srtContent;
}

/**
 * Format milliseconds to SRT time format (HH:MM:SS,mmm)
 */
function formatSRTTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

/**
 * Pad number with leading zeros
 */
function pad(num: number, size: number): string {
  return num.toString().padStart(size, '0');
}

/**
 * Upload all AssemblyAI transcription outputs to Google Drive
 */
export async function uploadTranscriptionToDrive(
  filename: string,
  transcriptionId: string,
  outputs: TranscriptionOutputs
): Promise<{
  success: boolean;
  uploads: DriveUploadResult[];
  error?: string;
}> {
  // Check if Google Drive is configured
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.log('[GoogleDrive] Skipping upload - Google Drive credentials not configured');
    return {
      success: false,
      uploads: [],
      error: 'Google Drive not configured',
    };
  }

  try {
    const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = `${baseFilename}_${timestamp}`;

    console.log(`[GoogleDrive] Starting upload for transcription ${transcriptionId}`);

    const uploadResults: DriveUploadResult[] = [];

    // 1. Upload full transcript as TXT
    const txtResult = await uploadToDrive(
      `${prefix}_transcript.txt`,
      'text/plain',
      outputs.transcriptText
    );
    uploadResults.push(txtResult);

    // 2. Upload speaker-labeled transcript as JSON
    const speakerJsonResult = await uploadToDrive(
      `${prefix}_speakers.json`,
      'application/json',
      JSON.stringify(outputs.speakerLabeled, null, 2)
    );
    uploadResults.push(speakerJsonResult);

    // 3. Upload SRT subtitles
    if (outputs.srtSubtitles) {
      const srtResult = await uploadToDrive(
        `${prefix}_subtitles.srt`,
        'text/plain',
        outputs.srtSubtitles
      );
      uploadResults.push(srtResult);
    }

    // 4. Upload metadata summary as JSON
    const metadataResult = await uploadToDrive(
      `${prefix}_metadata.json`,
      'application/json',
      JSON.stringify(outputs.metadata, null, 2)
    );
    uploadResults.push(metadataResult);

    const successCount = uploadResults.filter((r) => r.success).length;
    const totalCount = uploadResults.length;

    console.log(`[GoogleDrive] Upload complete: ${successCount}/${totalCount} files uploaded`);

    return {
      success: successCount > 0,
      uploads: uploadResults,
    };
  } catch (error: any) {
    console.error('[GoogleDrive] Upload batch failed:', error);
    return {
      success: false,
      uploads: [],
      error: error.message || 'Upload batch failed',
    };
  }
}

/**
 * Export individual helper functions for testing
 */
export const GoogleDriveHelpers = {
  generateSRT,
  formatSRTTime,
  uploadToDrive,
};
