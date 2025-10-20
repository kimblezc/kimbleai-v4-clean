/**
 * API ENDPOINT: Import ChatGPT Export
 *
 * POST /api/chatgpt/import
 *
 * Uploads a ChatGPT conversations.json export file,
 * stores it in Google Drive and database,
 * and generates embeddings for semantic search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import { importChatGPTExport } from '@/lib/chatgpt-import-system';

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadToDrive = formData.get('uploadToDrive') === 'true';
    const generateEmbeddings = formData.get('generateEmbeddings') !== 'false'; // Default true

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JSON file.' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Get Google auth (if uploading to Drive)
    let auth;
    if (uploadToDrive) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        // Get user's tokens from database
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: tokens } = await supabase
          .from('user_tokens')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (tokens) {
          oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
          });
          auth = oauth2Client;
        }
      } catch (error) {
        console.warn('[ChatGPT Import] Google auth failed, skipping Drive upload:', error);
        auth = null;
      }
    }

    // Import the export
    const result = await importChatGPTExport(
      fileBuffer,
      file.name,
      {
        userId,
        auth,
        uploadToDrive: uploadToDrive && !!auth,
        generateEmbeddings,
        onProgress: (stage, current, total) => {
          console.log(`[ChatGPT Import] ${stage}`, current ? `${current}/${total}` : '');
        }
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Import failed',
          importId: result.importId
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      importId: result.importId,
      driveFileId: result.driveFileId,
      stats: {
        totalConversations: result.stats.totalConversations,
        totalMessages: result.stats.totalMessages,
        dateRange: {
          earliest: new Date(result.stats.dateRange.earliest * 1000).toISOString(),
          latest: new Date(result.stats.dateRange.latest * 1000).toISOString()
        }
      },
      message: `Successfully imported ${result.stats.totalConversations} conversations with ${result.stats.totalMessages} messages`
    });

  } catch (error: any) {
    console.error('[ChatGPT Import API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    // Get import history
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: imports, error } = await supabase
      .from('chatgpt_import_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({
      imports
    });

  } catch (error: any) {
    console.error('[ChatGPT Import API] Error fetching imports:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
