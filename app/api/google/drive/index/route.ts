import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json();

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

    // List all files in the folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
      pageSize: 1000
    });

    const files = response.data.files || [];
    let indexed = 0;

    // Index each file into knowledge base
    for (const file of files) {
      // Skip folders
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;

      // Create knowledge base entry
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
        indexed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Indexed ${indexed} files into knowledge base for semantic search`,
      indexed,
      total: files.length
    });

  } catch (error: any) {
    console.error('[Drive Index] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
