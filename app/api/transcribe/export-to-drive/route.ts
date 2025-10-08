// Export transcription in all formats to Google Drive with organized folder structure
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId, googleDriveFileId, userId = 'zach' } = await request.json();

    // Get user's Google token from database
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json(
        { error: 'Not authenticated with Google Drive. Please sign in to Google first.' },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;

    console.log('[EXPORT-TO-DRIVE] Looking for transcription:', transcriptionId);

    // Fetch transcription from database by ID
    const { data: transcription, error } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
      console.error('[EXPORT-TO-DRIVE] Transcription not found:', error);
      return NextResponse.json(
        { error: 'Transcription not found', details: error?.message },
        { status: 404 }
      );
    }

    console.log('[EXPORT-TO-DRIVE] Found transcription:', transcription.id);

    const projectName = transcription.project_id || 'general';

    // Create folder structure: kimbleai-transcriptions/[project]/[filename]
    const baseFolderName = 'kimbleai-transcriptions';
    const projectFolderName = projectName;
    const transcriptionFolderName = transcription.filename.replace(/\.[^/.]+$/, '');

    // Step 1: Find or create base folder
    let baseFolderId = await findOrCreateFolder(accessToken, baseFolderName, null);

    // Step 2: Find or create project folder
    let projectFolderId = await findOrCreateFolder(accessToken, projectFolderName, baseFolderId);

    // Step 3: Create transcription folder
    let transcriptionFolderId = await findOrCreateFolder(accessToken, transcriptionFolderName, projectFolderId);

    const uploadedFiles = [];

    // Format 1: TXT with timestamps and speakers
    const txtContent = formatAsText(transcription);
    const txtFile = await uploadToDrive(
      accessToken,
      `${transcription.filename.replace(/\.[^/.]+$/, '')}_transcript.txt`,
      txtContent,
      'text/plain',
      transcriptionFolderId
    );
    uploadedFiles.push({ name: 'Transcript (TXT)', url: txtFile.webViewLink });

    // Format 2: JSON with full metadata
    const jsonContent = JSON.stringify({
      filename: transcription.filename,
      project: transcription.project_id,
      duration: transcription.duration,
      created_at: transcription.created_at,
      text: transcription.text,
      utterances: transcription.metadata?.utterances || [],
      speaker_labels: transcription.metadata?.speaker_labels,
      words: transcription.metadata?.words,
      auto_tags: transcription.metadata?.auto_tags,
      action_items: transcription.metadata?.action_items,
      key_topics: transcription.metadata?.key_topics
    }, null, 2);
    const jsonFile = await uploadToDrive(
      accessToken,
      `${transcription.filename.replace(/\.[^/.]+$/, '')}_data.json`,
      jsonContent,
      'application/json',
      transcriptionFolderId
    );
    uploadedFiles.push({ name: 'Full Data (JSON)', url: jsonFile.webViewLink });

    // Format 3: SRT subtitles
    const srtContent = formatAsSRT(transcription);
    const srtFile = await uploadToDrive(
      accessToken,
      `${transcription.filename.replace(/\.[^/.]+$/, '')}_subtitles.srt`,
      srtContent,
      'text/plain',
      transcriptionFolderId
    );
    uploadedFiles.push({ name: 'Subtitles (SRT)', url: srtFile.webViewLink });

    // Format 4: Copy original M4A file if provided
    if (googleDriveFileId) {
      const copiedFile = await copyDriveFile(
        accessToken,
        googleDriveFileId,
        transcription.filename,
        transcriptionFolderId
      );
      uploadedFiles.push({ name: 'Original Audio (M4A)', url: copiedFile.webViewLink });
    }

    return NextResponse.json({
      success: true,
      message: `Exported to Google Drive: kimbleai-transcriptions/${projectName}/${transcriptionFolderName}`,
      folderUrl: `https://drive.google.com/drive/folders/${transcriptionFolderId}`,
      files: uploadedFiles
    });

  } catch (error: any) {
    console.error('[EXPORT-TO-DRIVE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export to Google Drive', details: error.message },
      { status: 500 }
    );
  }
}

async function findOrCreateFolder(accessToken: string, folderName: string, parentId: string | null): Promise<string> {
  // Search for existing folder
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }

  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    }),
  });

  const createData = await createResponse.json();
  return createData.id;
}

async function uploadToDrive(
  accessToken: string,
  filename: string,
  content: string,
  mimeType: string,
  parentId: string
): Promise<any> {
  const metadata = {
    name: filename,
    mimeType: mimeType,
    parents: [parentId]
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: form,
    }
  );

  return await uploadResponse.json();
}

async function copyDriveFile(
  accessToken: string,
  sourceFileId: string,
  newName: string,
  parentId: string
): Promise<any> {
  const copyResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sourceFileId}/copy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newName,
        parents: [parentId]
      }),
    }
  );

  const copyData = await copyResponse.json();

  // Get webViewLink
  const fileResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${copyData.id}?fields=id,name,webViewLink`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  return await fileResponse.json();
}

function formatAsText(transcription: any): string {
  let content = `TRANSCRIPTION: ${transcription.filename}\n`;
  content += `Project: ${transcription.project_id || 'general'}\n`;
  content += `Duration: ${Math.floor(transcription.duration / 60)}:${(transcription.duration % 60).toString().padStart(2, '0')}\n`;
  content += `Date: ${new Date(transcription.created_at).toLocaleString()}\n`;
  content += `\n${'='.repeat(80)}\n\n`;

  const utterances = transcription.metadata?.utterances || [];

  if (utterances.length > 0) {
    utterances.forEach((utterance: any) => {
      const startTime = Math.floor(utterance.start / 1000);
      const minutes = Math.floor(startTime / 60);
      const seconds = startTime % 60;
      content += `[${minutes}:${seconds.toString().padStart(2, '0')}] Speaker ${utterance.speaker}: ${utterance.text}\n\n`;
    });
  } else {
    content += transcription.text;
  }

  // Add tags and action items
  if (transcription.metadata?.auto_tags?.length > 0) {
    content += `\n\n${'='.repeat(80)}\n`;
    content += `TAGS: ${transcription.metadata.auto_tags.join(', ')}\n`;
  }

  if (transcription.metadata?.action_items?.length > 0) {
    content += `\nACTION ITEMS:\n`;
    transcription.metadata.action_items.forEach((item: string, i: number) => {
      content += `${i + 1}. ${item}\n`;
    });
  }

  return content;
}

function formatAsSRT(transcription: any): string {
  const utterances = transcription.metadata?.utterances || [];
  let content = '';

  utterances.forEach((utterance: any, index: number) => {
    const startTime = formatSRTTime(utterance.start);
    const endTime = formatSRTTime(utterance.end);

    content += `${index + 1}\n`;
    content += `${startTime} --> ${endTime}\n`;
    content += `${utterance.text}\n\n`;
  });

  return content || 'No subtitle data available';
}

function formatSRTTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
