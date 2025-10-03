import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function indexFolder(
  drive: any,
  folderId: string,
  recursive: boolean = false
): Promise<{ indexed: number; scanned: number; folders: number }> {
  let stats = { indexed: 0, scanned: 0, folders: 0 };

  // List all files in the current folder
  let pageToken: string | undefined = undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
      pageSize: 1000,
      pageToken
    });

    const files = response.data.files || [];
    stats.scanned += files.length;

    for (const file of files) {
      // If it's a folder and we're doing recursive scan
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        stats.folders++;

        if (recursive) {
          // Recursively index this folder
          const subStats = await indexFolder(drive, file.id!, true);
          stats.indexed += subStats.indexed;
          stats.scanned += subStats.scanned;
          stats.folders += subStats.folders;
        }
        continue;
      }

      // Index the file into knowledge base
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
            folderId: folderId
          },
          user_id: 'zach',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'source_id'
        });

      if (!error) {
        stats.indexed++;
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return stats;
}

export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json();
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

    // Index the folder (recursively if entire drive)
    const stats = await indexFolder(drive, folderId, isEntireDrive);

    const message = isEntireDrive
      ? `Scanned entire Drive: ${stats.indexed} files indexed, ${stats.scanned} files scanned, ${stats.folders} folders explored`
      : `Indexed ${stats.indexed} files from folder (${stats.scanned} files scanned)`;

    return NextResponse.json({
      success: true,
      message,
      indexed: stats.indexed,
      scanned: stats.scanned,
      folders: stats.folders,
      isEntireDrive
    });

  } catch (error: any) {
    console.error('[Drive Index] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
