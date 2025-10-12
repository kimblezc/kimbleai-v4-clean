import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { UnifiedFileSystem } from '@/lib/unified-file-system';
import { processFile } from '@/lib/file-processors';
import { RAGSearchSystem } from '@/lib/rag-search';

// Force dynamic rendering to avoid build-time static analysis issues
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/google/gmail/attachments
 * Download a single attachment from Gmail
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const messageId = searchParams.get('messageId');
    const attachmentId = searchParams.get('attachmentId');
    const filename = searchParams.get('filename') || 'attachment';
    const mimeType = searchParams.get('mimeType') || 'application/octet-stream';

    if (!messageId || !attachmentId) {
      return NextResponse.json({
        success: false,
        error: 'messageId and attachmentId are required'
      }, { status: 400 });
    }

    console.log(`[GMAIL ATTACHMENTS] Downloading attachment: ${filename} from message: ${messageId}`);

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Download attachment
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    if (!response.data.data) {
      return NextResponse.json({
        success: false,
        error: 'Attachment data not found'
      }, { status: 404 });
    }

    // Decode base64url data
    const attachmentData = Buffer.from(response.data.data, 'base64url');

    console.log(`[GMAIL ATTACHMENTS] Downloaded ${attachmentData.length} bytes`);

    // Return as downloadable file
    return new NextResponse(attachmentData, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': attachmentData.length.toString()
      }
    });

  } catch (error: any) {
    console.error('[GMAIL ATTACHMENTS] Download error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to download attachment'
    }, { status: 500 });
  }
}

/**
 * POST /api/google/gmail/attachments
 * Extract and process attachment(s) from an email
 */
export async function POST(request: NextRequest) {
  try {
    const { userId = 'zach', messageId, attachmentId, processAll = false, projectId } = await request.json();

    if (!messageId) {
      return NextResponse.json({
        success: false,
        error: 'messageId is required'
      }, { status: 400 });
    }

    console.log(`[GMAIL ATTACHMENTS] Processing attachments from message: ${messageId}`);

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Get user data for DB operations
    const { data: userData } = await supabase
      .from('users')
      .select('id, email')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Initialize Gmail client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get full message with attachments
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: messageId
    });

    const headers = fullMessage.data.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

    // Extract attachments
    let attachments: any[] = [];

    const extractAttachments = (payload: any) => {
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0,
              attachmentId: part.body.attachmentId
            });
          }
          if (part.parts) {
            extractAttachments(part);
          }
        }
      }
    };

    extractAttachments(fullMessage.data.payload);

    console.log(`[GMAIL ATTACHMENTS] Found ${attachments.length} attachments`);

    // Filter to specific attachment if requested
    if (!processAll && attachmentId) {
      attachments = attachments.filter(att => att.attachmentId === attachmentId);
    }

    const processedFiles = [];

    // Process each attachment
    for (const att of attachments) {
      try {
        console.log(`[GMAIL ATTACHMENTS] Processing: ${att.filename}`);

        // Download attachment
        const response = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: att.attachmentId
        });

        if (!response.data.data) {
          console.error(`[GMAIL ATTACHMENTS] No data for attachment: ${att.filename}`);
          continue;
        }

        const attachmentData = Buffer.from(response.data.data, 'base64url');

        // Upload to Supabase Storage
        const storagePath = `gmail-attachments/${userId}/${messageId}/${att.filename}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gmail-attachments')
          .upload(storagePath, attachmentData, {
            contentType: att.mimeType,
            upsert: true
          });

        if (uploadError) {
          console.error(`[GMAIL ATTACHMENTS] Upload error for ${att.filename}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('gmail-attachments')
          .getPublicUrl(storagePath);

        // Register in unified file system
        const fileEntry = await UnifiedFileSystem.registerFile(
          userData.id,
          'email_attachment',
          messageId,
          {
            filename: att.filename,
            mimeType: att.mimeType,
            fileSize: att.size,
            storagePath: urlData.publicUrl,
            sourceMetadata: {
              email_subject: subject,
              email_from: from,
              email_date: date,
              message_id: messageId,
              attachment_id: att.attachmentId
            },
            tags: ['email', 'attachment', projectId].filter(Boolean) as string[],
            projects: projectId ? [projectId] : []
          }
        );

        console.log(`[GMAIL ATTACHMENTS] Registered file: ${fileEntry.id}`);

        // Process file through appropriate processor
        try {
          const file = new File([attachmentData], att.filename, { type: att.mimeType });
          const processingResult = await processFile(
            file,
            userData.id,
            projectId || 'email-attachments',
            fileEntry.id,
            urlData.publicUrl
          );

          // Update file registry with processing result
          if (processingResult.success) {
            await UnifiedFileSystem.markAsProcessed(
              fileEntry.id,
              processingResult.data,
              [] // Knowledge base IDs would be added here
            );

            console.log(`[GMAIL ATTACHMENTS] Processed file: ${att.filename}`);

            // Index with RAG system for semantic search
            try {
              const indexResult = await RAGSearchSystem.indexFile(
                fileEntry.id,
                userData.id,
                projectId || 'email-attachments'
              );

              console.log(`[GMAIL ATTACHMENTS] Indexed file: ${att.filename} (${indexResult.entriesCreated} entries)`);
            } catch (indexError: any) {
              console.error(`[GMAIL ATTACHMENTS] Indexing error for ${att.filename}:`, indexError);
            }
          }

          processedFiles.push({
            filename: att.filename,
            fileId: fileEntry.id,
            processed: processingResult.success,
            processingType: processingResult.processingType,
            result: processingResult.data,
            storageUrl: urlData.publicUrl
          });

        } catch (procError: any) {
          console.error(`[GMAIL ATTACHMENTS] Processing error for ${att.filename}:`, procError);
          processedFiles.push({
            filename: att.filename,
            fileId: fileEntry.id,
            processed: false,
            error: procError.message
          });
        }

      } catch (attError: any) {
        console.error(`[GMAIL ATTACHMENTS] Error processing attachment:`, attError);
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      subject,
      from,
      attachmentsFound: attachments.length,
      attachmentsProcessed: processedFiles.length,
      files: processedFiles
    });

  } catch (error: any) {
    console.error('[GMAIL ATTACHMENTS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process attachments'
    }, { status: 500 });
  }
}
