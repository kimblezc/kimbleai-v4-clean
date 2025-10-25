// Save transcription to Google Drive
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTranscriptionPath, ensureFolderExists } from '@/lib/drive-folder-structure';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      transcriptionId,
      folderId = null,  // Optional: specific folder ID
      category = null,   // Optional: category name to create folder
      userId = 'zach',   // User ID for Supabase token lookup
      multiFormat = false  // Export all 6 files: Audio, TXT, Speaker-Separated, SRT, VTT, JSON
    } = await request.json();

    console.log(`[SAVE-TO-DRIVE] Starting export for transcriptionId: ${transcriptionId}`);

    // Try NextAuth session first
    const session = await getServerSession(authOptions);
    let accessToken = session?.accessToken;
    let refreshToken = null;

    // Fallback to Supabase token lookup if no session
    if (!accessToken) {
      console.log('[SAVE-TO-DRIVE] No NextAuth session, trying Supabase token lookup');
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', userId)
        .single();

      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;
        console.log('[SAVE-TO-DRIVE] Using access token from Supabase');
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google Drive. Please sign in to Google first.' },
        { status: 401 }
      );
    }

    // Create OAuth2 client with automatic token refresh
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    // Add event listener to save refreshed tokens
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        console.log('[SAVE-TO-DRIVE] Token refreshed, saving to database');
        await supabase
          .from('user_tokens')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || refreshToken,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    });

    // Fetch transcription from database by assemblyai_id
    console.log(`[SAVE-TO-DRIVE] Querying database for assemblyai_id: ${transcriptionId}`);
    let { data: transcription, error } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('assemblyai_id', transcriptionId)
      .single();

    if (error) {
      console.log('[SAVE-TO-DRIVE] Database query error:', error);
    }

    // If not found in database, try fetching from AssemblyAI directly
    if (error || !transcription) {
      console.log('[SAVE-TO-DRIVE] Not found in database, trying AssemblyAI API with ID:', transcriptionId);

      try {
        const assemblyResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
          headers: {
            'authorization': process.env.ASSEMBLYAI_API_KEY!
          }
        });

        if (assemblyResponse.ok) {
          const assemblyData = await assemblyResponse.json();

          // Create a temporary transcription object from AssemblyAI data
          transcription = {
            id: transcriptionId,
            filename: 'transcription.m4a',  // Default filename
            duration: assemblyData.audio_duration,
            text: assemblyData.text,
            created_at: new Date().toISOString(),  // Use current time if created is invalid
            project_id: 'general',
            metadata: {
              utterances: assemblyData.utterances || [],
              words: assemblyData.words || [],
              speaker_labels: assemblyData.speaker_labels,
              auto_tags: [],
              action_items: []
            }
          };

          console.log('[SAVE-TO-DRIVE] Retrieved from AssemblyAI');
        } else {
          return NextResponse.json(
            { error: 'Transcription not found in database or AssemblyAI' },
            { status: 404 }
          );
        }
      } catch (fetchError: any) {
        console.error('[SAVE-TO-DRIVE] Error fetching from AssemblyAI:', fetchError);
        return NextResponse.json(
          { error: 'Transcription not found', details: fetchError.message },
          { status: 404 }
        );
      }
    }

    // Format content
    let content = `TRANSCRIPTION: ${transcription.filename}\n`;
    content += `Duration: ${Math.floor(transcription.duration / 60)}:${(transcription.duration % 60).toString().padStart(2, '0')}\n`;
    content += `Date: ${new Date(transcription.created_at).toLocaleString()}\n\n`;
    content += `${'='.repeat(80)}\n\n`;

    const utterances = transcription.metadata?.utterances || [];
    if (utterances.length > 0) {
      utterances.forEach((utterance: any) => {
        const startTime = Math.floor(utterance.start / 1000);
        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        content += `[${timestamp}] Speaker ${utterance.speaker}: ${utterance.text}\n\n`;
      });
    } else {
      content += transcription.text;
    }

    // Add auto-tags if available
    if (transcription.metadata?.auto_tags?.length > 0) {
      content += `\n\n${'='.repeat(80)}\n`;
      content += `TAGS: ${transcription.metadata.auto_tags.join(', ')}\n`;
    }

    // Add action items if available
    if (transcription.metadata?.action_items?.length > 0) {
      content += `\nACTION ITEMS:\n`;
      transcription.metadata.action_items.forEach((item: string, i: number) => {
        content += `${i + 1}. ${item}\n`;
      });
    }

    // Initialize Google Drive client (using OAuth2 client from above with token refresh)
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let targetFolderId = folderId;

    // Helper function to find or create folder
    async function findOrCreateFolder(folderName: string, parentId?: string): Promise<string | null> {
      try {
        // Search for existing folder
        const searchQuery = parentId
          ? `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
          : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

        const searchResponse = await drive.files.list({
          q: searchQuery,
          fields: 'files(id, name)',
          spaces: 'drive'
        });

        if (searchResponse.data.files && searchResponse.data.files.length > 0) {
          console.log(`[SAVE-TO-DRIVE] Found existing folder: ${folderName}`);
          return searchResponse.data.files[0].id!;
        }

        // Create new folder if not found
        console.log(`[SAVE-TO-DRIVE] Creating folder: ${folderName}`);
        const createResponse = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId && { parents: [parentId] })
          },
          fields: 'id, name'
        });

        return createResponse.data.id || null;
      } catch (error) {
        console.error(`[SAVE-TO-DRIVE] Error with folder ${folderName}:`, error);
        return null;
      }
    }

    // Create organized folder structure if not specified
    // Structure: /Transcriptions/[YYYY-MM-DD]/[Transcription-Name]/
    if (!folderId) {
      try {
        // Main folder: "Transcriptions"
        const mainFolderId = await findOrCreateFolder('Transcriptions');
        if (mainFolderId) {
          // Date folder: YYYY-MM-DD
          const date = new Date(transcription.created_at);
          const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
          const dateFolderId = await findOrCreateFolder(dateFolder, mainFolderId);

          if (dateFolderId) {
            // Transcription-specific folder: filename (without extension)
            const transcriptionFolderName = transcription.filename.replace(/\.[^/.]+$/, '');
            const transcriptionFolderId = await findOrCreateFolder(transcriptionFolderName, dateFolderId);

            if (transcriptionFolderId) {
              targetFolderId = transcriptionFolderId;
              console.log(`[SAVE-TO-DRIVE] Using folder structure: Transcriptions/${dateFolder}/${transcriptionFolderName} (${transcriptionFolderId})`);
            }
          }
        }
      } catch (folderError) {
        console.error('[SAVE-TO-DRIVE] Error creating folder structure:', folderError);
        // Continue with root folder if folder creation fails
      }
    }

    // Helper function to upload a file to Drive
    async function uploadFile(fileName: string, fileContent: string | Buffer, mimeType: string): Promise<any> {
      console.log(`[SAVE-TO-DRIVE] Uploading file: ${fileName}, size: ${typeof fileContent === 'string' ? fileContent.length + ' chars' : fileContent.length + ' bytes'}, mimeType: ${mimeType}`);

      try {
        const response = await drive.files.create({
          requestBody: {
            name: fileName,
            mimeType: mimeType,
            ...(targetFolderId && { parents: [targetFolderId] })
          },
          media: {
            mimeType: mimeType,
            body: fileContent
          },
          fields: 'id, name, webViewLink'
        });

        console.log(`[SAVE-TO-DRIVE] Successfully uploaded ${fileName}, file ID: ${response.data.id}`);
        return response.data;
      } catch (error: any) {
        console.error(`[SAVE-TO-DRIVE] Upload failed for ${fileName}:`, error);
        console.error(`[SAVE-TO-DRIVE] Error details:`, JSON.stringify(error, null, 2));
        console.error(`[SAVE-TO-DRIVE] Error response:`, error.response?.data);
        throw new Error(`Upload failed for ${fileName}: ${error.message || String(error)}`);
      }
    }

    // Generate file formats
    const baseFilename = transcription.filename.replace(/\.[^/.]+$/, '');
    const uploadedFiles = [];

    if (multiFormat) {
      console.log('[SAVE-TO-DRIVE] Exporting in multiple formats (6 files: audio, TXT, speaker-separated, SRT, VTT, JSON)...');

      // FILE 1: Original audio file (download from Drive if available)
      try {
        const googleDriveFileId = transcription.metadata?.googleDriveFileId;
        if (googleDriveFileId) {
          console.log('[SAVE-TO-DRIVE] Downloading original audio file from Drive...');

          // Download the original audio file
          const audioResponse = await drive.files.get(
            { fileId: googleDriveFileId, alt: 'media' },
            { responseType: 'arraybuffer' }
          );

          const audioBuffer = Buffer.from(audioResponse.data as ArrayBuffer);

          // Upload to target folder
          const audioFile = await uploadFile(
            transcription.filename,
            audioBuffer,
            transcription.metadata?.mimeType || 'audio/m4a'
          );
          uploadedFiles.push({ format: 'Original Audio', ...audioFile });
          console.log('[SAVE-TO-DRIVE] Original audio upload complete');
        } else {
          console.warn('[SAVE-TO-DRIVE] No Google Drive file ID found, skipping original audio upload');
        }
      } catch (error: any) {
        console.error('[SAVE-TO-DRIVE] Audio upload failed:', error);
        // Continue even if audio upload fails
      }

      // FILE 2: Full transcription text (plain text format)
      try {
        console.log('[SAVE-TO-DRIVE] Uploading full transcription (TXT)...');
        const txtFile = await uploadFile(
          `full-transcription.txt`,
          content,
          'text/plain'
        );
        uploadedFiles.push({ format: 'Full Transcription (TXT)', ...txtFile });
        console.log('[SAVE-TO-DRIVE] Full transcription upload complete');
      } catch (error: any) {
        console.error('[SAVE-TO-DRIVE] TXT upload failed:', error);
        throw new Error(`TXT upload failed: ${error.message}`);
      }

      // FILE 3: Speaker-separated transcription
      try {
        console.log('[SAVE-TO-DRIVE] Creating speaker-separated transcript...');
        let speakerContent = `SPEAKER-SEPARATED TRANSCRIPTION: ${transcription.filename}\n`;
        speakerContent += `Duration: ${Math.floor(transcription.duration / 60)}:${(transcription.duration % 60).toString().padStart(2, '0')}\n`;
        speakerContent += `Date: ${new Date(transcription.created_at).toLocaleString()}\n`;
        speakerContent += `\n${'='.repeat(80)}\n\n`;

        if (utterances.length > 0) {
          // Group by speaker for better readability
          let currentSpeaker = null;
          utterances.forEach((utterance: any) => {
            if (currentSpeaker !== utterance.speaker) {
              currentSpeaker = utterance.speaker;
              speakerContent += `\n--- SPEAKER ${utterance.speaker} ---\n\n`;
            }
            const startTime = Math.floor(utterance.start / 1000);
            const minutes = Math.floor(startTime / 60);
            const seconds = startTime % 60;
            const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            speakerContent += `[${timestamp}] ${utterance.text}\n`;
          });
        } else {
          speakerContent += 'No speaker separation data available.\n\n';
          speakerContent += transcription.text;
        }

        const speakerFile = await uploadFile(
          `speaker-separated.txt`,
          speakerContent,
          'text/plain'
        );
        uploadedFiles.push({ format: 'Speaker-Separated (TXT)', ...speakerFile });
        console.log('[SAVE-TO-DRIVE] Speaker-separated transcript upload complete');
      } catch (error: any) {
        console.error('[SAVE-TO-DRIVE] Speaker-separated upload failed:', error);
        // Continue even if this fails
      }

      // FILE 4: SRT subtitle file (SubRip format)
      try {
        console.log('[SAVE-TO-DRIVE] Creating SRT subtitle file...');
        let srtContent = '';

        if (utterances.length > 0) {
          utterances.forEach((utterance: any, index: number) => {
            // SRT sequence number (1-indexed)
            srtContent += `${index + 1}\n`;

            // Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm)
            const formatSrtTime = (ms: number) => {
              const totalSeconds = Math.floor(ms / 1000);
              const milliseconds = ms % 1000;
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;

              return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
            };

            // Timestamp line (start --> end)
            srtContent += `${formatSrtTime(utterance.start)} --> ${formatSrtTime(utterance.end)}\n`;

            // Text line (with speaker label)
            srtContent += `Speaker ${utterance.speaker}: ${utterance.text}\n\n`;
          });
        } else {
          srtContent += '1\n00:00:00,000 --> 00:00:05,000\n';
          srtContent += transcription.text.substring(0, 100) + '...\n\n';
        }

        const srtFile = await uploadFile(
          `subtitles.srt`,
          srtContent,
          'text/plain'
        );
        uploadedFiles.push({ format: 'Subtitles (SRT)', ...srtFile });
        console.log('[SAVE-TO-DRIVE] SRT subtitle file upload complete');
      } catch (error: any) {
        console.error('[SAVE-TO-DRIVE] SRT upload failed:', error);
        // Continue even if this fails
      }

      // FILE 5: VTT subtitle file (WebVTT format)
      try {
        console.log('[SAVE-TO-DRIVE] Creating VTT subtitle file...');
        let vttContent = 'WEBVTT\n\n';

        if (utterances.length > 0) {
          utterances.forEach((utterance: any) => {
            // Convert milliseconds to VTT timestamp format (HH:MM:SS.mmm)
            const formatVttTime = (ms: number) => {
              const totalSeconds = Math.floor(ms / 1000);
              const milliseconds = ms % 1000;
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;

              return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
            };

            // Timestamp line (start --> end)
            vttContent += `${formatVttTime(utterance.start)} --> ${formatVttTime(utterance.end)}\n`;

            // Text line with speaker voice tag
            vttContent += `<v Speaker ${utterance.speaker}>${utterance.text}\n\n`;
          });
        } else {
          vttContent += '00:00:00.000 --> 00:00:05.000\n';
          vttContent += transcription.text.substring(0, 100) + '...\n\n';
        }

        const vttFile = await uploadFile(
          `subtitles.vtt`,
          vttContent,
          'text/plain'
        );
        uploadedFiles.push({ format: 'Subtitles (VTT)', ...vttFile });
        console.log('[SAVE-TO-DRIVE] VTT subtitle file upload complete');
      } catch (error: any) {
        console.error('[SAVE-TO-DRIVE] VTT upload failed:', error);
        // Continue even if this fails
      }

      // FILE 6: Metadata/summary JSON file
      try {
        console.log('[SAVE-TO-DRIVE] Creating metadata JSON...');

        // Count speakers
        const speakerSet = new Set(utterances.map((u: any) => u.speaker));
        const speakerCount = speakerSet.size;

        const metadataContent = JSON.stringify({
          // Basic info
          filename: transcription.filename,
          transcription_id: transcription.id,
          assemblyai_id: transcription.metadata?.assemblyai_id,
          created_at: transcription.created_at,
          project_id: transcription.project_id,

          // Audio info
          duration_seconds: transcription.duration,
          duration_formatted: `${Math.floor(transcription.duration / 60)}:${(transcription.duration % 60).toString().padStart(2, '0')}`,
          file_size_bytes: transcription.file_size,

          // Transcription summary
          word_count: transcription.text?.split(/\s+/).length || 0,
          speaker_count: speakerCount,
          utterance_count: utterances.length,

          // Speaker breakdown
          speakers: Array.from(speakerSet).map((speaker: any) => ({
            speaker_id: speaker,
            utterance_count: utterances.filter((u: any) => u.speaker === speaker).length,
            word_count: utterances
              .filter((u: any) => u.speaker === speaker)
              .reduce((sum: number, u: any) => sum + (u.text?.split(/\s+/).length || 0), 0)
          })),

          // Full text
          full_text: transcription.text,

          // Utterances with timestamps
          utterances: utterances.map((u: any) => ({
            speaker: u.speaker,
            start_ms: u.start,
            end_ms: u.end,
            start_time: `${Math.floor(u.start / 60000)}:${Math.floor((u.start % 60000) / 1000).toString().padStart(2, '0')}`,
            end_time: `${Math.floor(u.end / 60000)}:${Math.floor((u.end % 60000) / 1000).toString().padStart(2, '0')}`,
            text: u.text,
            confidence: u.confidence
          })),

          // Auto-tagging results
          auto_tags: transcription.metadata?.auto_tags || [],
          action_items: transcription.metadata?.action_items || [],
          key_topics: transcription.metadata?.key_topics || [],
          sentiment: transcription.metadata?.sentiment,
          importance_score: transcription.metadata?.importance_score,

          // Export metadata
          exported_at: new Date().toISOString(),
          export_format_version: '2.0'
        }, null, 2);

        const metadataFile = await uploadFile(
          `metadata.json`,
          metadataContent,
          'application/json'
        );
        uploadedFiles.push({ format: 'Metadata (JSON)', ...metadataFile });
        console.log('[SAVE-TO-DRIVE] Metadata JSON upload complete');
      } catch (error: any) {
        console.error('[SAVE-TO-DRIVE] Metadata JSON upload failed:', error);
        throw new Error(`Metadata JSON upload failed: ${error.message}`);
      }

      console.log(`[SAVE-TO-DRIVE] Uploaded ${uploadedFiles.length} files successfully`);

      // Log export to history
      try {
        await supabase.from('export_logs').insert({
          user_id: userId,
          export_type: 'single',
          transcription_count: 1,
          success_count: 1,
          error_count: 0,
          category: category,
          transcription_ids: [transcriptionId],
          results: uploadedFiles.map(f => ({
            format: f.format,
            fileId: f.id,
            fileName: f.name,
            webViewLink: `https://drive.google.com/file/d/${f.id}/view`
          })),
          errors: null,
          created_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('[SAVE-TO-DRIVE] Error logging export:', logError);
        // Continue even if logging fails
      }

      return NextResponse.json({
        success: true,
        files: uploadedFiles.map(f => ({
          format: f.format,
          fileId: f.id,
          fileName: f.name,
          webViewLink: `https://drive.google.com/file/d/${f.id}/view`
        })),
        message: `Saved ${uploadedFiles.length} files to Google Drive` + (category ? ` in "${category}" folder` : '')
      });

    } else {
      // Single TXT file
      const txtFile = await uploadFile(
        `${baseFilename}_transcript.txt`,
        content,
        'text/plain'
      );

      return NextResponse.json({
        success: true,
        fileId: txtFile.id,
        fileName: txtFile.name,
        webViewLink: `https://drive.google.com/file/d/${txtFile.id}/view`,
        message: category
          ? `Saved to Google Drive in "${category}" folder`
          : 'Saved to Google Drive'
      });
    }

  } catch (error: any) {
    console.error('[SAVE-TO-DRIVE] Critical error:', error);
    console.error('[SAVE-TO-DRIVE] Error stack:', error.stack);

    // Provide more specific error messages based on the error type
    let userMessage = 'Failed to save to Google Drive';
    let statusCode = 500;

    if (error.message?.includes('Upload failed')) {
      userMessage = 'File upload to Google Drive failed';
    } else if (error.message?.includes('401') || error.message?.includes('authentication')) {
      userMessage = 'Google Drive authentication expired';
      statusCode = 401;
    } else if (error.message?.includes('403') || error.message?.includes('permission')) {
      userMessage = 'Insufficient permissions for Google Drive';
      statusCode = 403;
    } else if (error.message?.includes('404')) {
      userMessage = 'Transcription not found';
      statusCode = 404;
    } else if (error.message?.includes('quota')) {
      userMessage = 'Google Drive storage quota exceeded';
      statusCode = 429;
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode }
    );
  }
}
