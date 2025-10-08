// Save transcription to Google Drive
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
      multiFormat = false  // Export all formats (TXT, JSON, SRT, VTT)
    } = await request.json();

    // Try NextAuth session first
    const session = await getServerSession(authOptions);
    let accessToken = session?.accessToken;

    // Fallback to Supabase token lookup if no session
    if (!accessToken) {
      console.log('[SAVE-TO-DRIVE] No NextAuth session, trying Supabase token lookup');
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .single();

      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
        console.log('[SAVE-TO-DRIVE] Using access token from Supabase');
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google Drive. Please sign in to Google first.' },
        { status: 401 }
      );
    }

    // Fetch transcription from database
    let { data: transcription, error } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single();

    // If not found in database, try fetching from AssemblyAI directly
    if (error || !transcription) {
      console.log('[SAVE-TO-DRIVE] Not found in database, trying AssemblyAI API');

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

    let targetFolderId = folderId;

    // Helper function to find or create folder
    async function findOrCreateFolder(folderName: string, parentId?: string): Promise<string | null> {
      // Search for existing folder
      const searchQuery = parentId
        ? `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
          console.log(`[SAVE-TO-DRIVE] Found existing folder: ${folderName}`);
          return searchData.files[0].id;
        }
      }

      // Create new folder if not found
      console.log(`[SAVE-TO-DRIVE] Creating folder: ${folderName}`);
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          ...(parentId && { parents: [parentId] })
        }),
      });

      if (createResponse.ok) {
        const folderData = await createResponse.json();
        return folderData.id;
      }

      return null;
    }

    // Create organized folder structure if not specified
    if (!folderId) {
      try {
        // 1. Find or create main "kimbleai-transcriptions" folder
        const mainFolderId = await findOrCreateFolder('kimbleai-transcriptions');

        if (mainFolderId) {
          // 2. Find or create project subfolder
          const projectName = category || transcription.project_id || 'general';
          const projectFolderId = await findOrCreateFolder(projectName, mainFolderId);

          if (projectFolderId) {
            targetFolderId = projectFolderId;
            console.log(`[SAVE-TO-DRIVE] Target folder: kimbleai-transcriptions/${projectName}`);
          }
        }
      } catch (folderError) {
        console.error('[SAVE-TO-DRIVE] Error creating folder structure:', folderError);
        // Continue with root folder if folder creation fails
      }
    }

    // Helper function to upload a file to Drive
    async function uploadFile(fileName: string, fileContent: string, mimeType: string): Promise<any> {
      const metadata = {
        name: fileName,
        mimeType: mimeType,
        ...(targetFolderId && { parents: [targetFolderId] })
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: mimeType }));

      const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed for ${fileName}: ${errorText}`);
      }

      return await uploadResponse.json();
    }

    // Generate file formats
    const baseFilename = transcription.filename.replace(/\.[^/.]+$/, '');
    const uploadedFiles = [];

    if (multiFormat) {
      console.log('[SAVE-TO-DRIVE] Exporting in multiple formats...');

      // 1. TXT format (with timestamps)
      const txtFile = await uploadFile(
        `${baseFilename}_transcript.txt`,
        content,
        'text/plain'
      );
      uploadedFiles.push({ format: 'TXT', ...txtFile });

      // 2. JSON format (full metadata)
      const jsonContent = JSON.stringify({
        id: transcription.id,
        filename: transcription.filename,
        duration: transcription.duration,
        created_at: transcription.created_at,
        project_id: transcription.project_id,
        text: transcription.text,
        utterances: utterances,
        words: transcription.metadata?.words || [],
        speaker_labels: transcription.metadata?.speaker_labels,
        auto_tags: transcription.metadata?.auto_tags || [],
        action_items: transcription.metadata?.action_items || []
      }, null, 2);

      const jsonFile = await uploadFile(
        `${baseFilename}_transcript.json`,
        jsonContent,
        'application/json'
      );
      uploadedFiles.push({ format: 'JSON', ...jsonFile });

      // 3. SRT format (subtitles)
      let srtContent = '';
      if (utterances.length > 0) {
        utterances.forEach((utterance: any, index: number) => {
          const startMs = utterance.start;
          const endMs = utterance.end;

          const formatTime = (ms: number) => {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const milliseconds = ms % 1000;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
          };

          srtContent += `${index + 1}\n`;
          srtContent += `${formatTime(startMs)} --> ${formatTime(endMs)}\n`;
          srtContent += `${utterance.text}\n\n`;
        });
      }

      if (srtContent) {
        const srtFile = await uploadFile(
          `${baseFilename}_transcript.srt`,
          srtContent,
          'text/plain'
        );
        uploadedFiles.push({ format: 'SRT', ...srtFile });
      }

      // 4. VTT format (WebVTT subtitles)
      let vttContent = 'WEBVTT\n\n';
      if (utterances.length > 0) {
        utterances.forEach((utterance: any, index: number) => {
          const startMs = utterance.start;
          const endMs = utterance.end;

          const formatTime = (ms: number) => {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const milliseconds = ms % 1000;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
          };

          vttContent += `${index + 1}\n`;
          vttContent += `${formatTime(startMs)} --> ${formatTime(endMs)}\n`;
          vttContent += `${utterance.text}\n\n`;
        });
      }

      if (vttContent !== 'WEBVTT\n\n') {
        const vttFile = await uploadFile(
          `${baseFilename}_transcript.vtt`,
          vttContent,
          'text/vtt'
        );
        uploadedFiles.push({ format: 'VTT', ...vttFile });
      }

      console.log(`[SAVE-TO-DRIVE] Uploaded ${uploadedFiles.length} files`);

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
    console.error('[SAVE-TO-DRIVE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save to Google Drive', details: error.message },
      { status: 500 }
    );
  }
}
