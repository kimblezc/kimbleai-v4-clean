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
      userId = 'zach'    // User ID for Supabase token lookup
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
    const { data: transcription, error } = await supabase
      .from('audio_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
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

    // Create category folder if specified
    if (category && !folderId) {
      const folderName = `Transcriptions - ${category}`;
      const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (createFolderResponse.ok) {
        const folderData = await createFolderResponse.json();
        targetFolderId = folderData.id;
      }
    }

    // Upload to Google Drive
    const filename = `${transcription.filename.replace(/\.[^/.]+$/, '')}_transcript.txt`;

    const metadata = {
      name: filename,
      mimeType: 'text/plain',
      ...(targetFolderId && { parents: [targetFolderId] })
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'text/plain' }));

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Google Drive upload failed: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      fileId: uploadData.id,
      fileName: filename,
      webViewLink: `https://drive.google.com/file/d/${uploadData.id}/view`,
      message: category
        ? `Saved to Google Drive in "${category}" folder`
        : 'Saved to Google Drive'
    });

  } catch (error: any) {
    console.error('[SAVE-TO-DRIVE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save to Google Drive', details: error.message },
      { status: 500 }
    );
  }
}
