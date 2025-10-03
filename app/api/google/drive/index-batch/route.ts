import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Process files in smaller batches to avoid timeout
const BATCH_SIZE = 100;
const MAX_EXECUTION_TIME = 50000; // 50 seconds (leave 10s buffer)

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { folderId, pageToken } = await request.json();
    const isEntireDrive = folderId === 'root';

    // Get user's Google tokens
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', 'zach')
      .single();

    if (!tokenData) {
      return NextResponse.json({
        success: false,
        error: 'No Google Drive access token found'
      }, { status: 401 });
    }

    // Initialize Google Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let indexed = 0;
    let scanned = 0;
    let folders = 0;
    let nextPageToken: string | undefined = pageToken;
    let hasMore = false;

    // List files with pagination
    const response = await drive.files.list({
      q: isEntireDrive ? 'trashed=false' : `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)',
      pageSize: BATCH_SIZE,
      pageToken: nextPageToken,
      orderBy: 'folder,modifiedTime desc'
    });

    const files = response.data.files || [];
    scanned = files.length;

    // Process this batch
    for (const file of files) {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        hasMore = true;
        break;
      }

      // Count folders
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        folders++;
        continue;
      }

      // Index the file
      const { error } = await supabase
        .from('knowledge_base')
        .upsert({
          title: file.name,
          content: `Google Drive file: ${file.name} (${file.mimeType})`,
          source_type: 'google_drive',
          source_id: file.id,
          metadata: {
            mimeType: file.mimeType,
            size: file.size,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            parents: file.parents,
            folderId: folderId
          },
          user_id: 'zach',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'source_id'
        });

      if (!error) {
        indexed++;
      }
    }

    // Check if there are more pages
    nextPageToken = response.data.nextPageToken;
    hasMore = hasMore || !!nextPageToken;

    // Get total indexed so far from database
    const { count: totalIndexed } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'google_drive');

    const message = hasMore
      ? `Batch complete: ${indexed} files indexed in this batch (${totalIndexed || 0} total). Continue scanning...`
      : `Scan complete: ${totalIndexed || 0} total files indexed from Drive`;

    return NextResponse.json({
      success: true,
      message,
      indexed,
      scanned,
      folders,
      totalIndexed: totalIndexed || 0,
      hasMore,
      nextPageToken,
      isEntireDrive
    });

  } catch (error: any) {
    console.error('[Drive Index Batch] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
