import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job: Index Gmail attachments automatically
 * Vercel Cron: Configure in vercel.json
 * Can also be called manually: GET /api/cron/index-attachments?userId=zach
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const maxMessages = parseInt(searchParams.get('maxMessages') || '50');
    const daysBack = parseInt(searchParams.get('daysBack') || '7');

    console.log(`[CRON: Attachment Indexer] Starting for user: ${userId}`);
    console.log(`[CRON: Attachment Indexer] Max messages: ${maxMessages}, Days back: ${daysBack}`);

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      console.error('[CRON: Attachment Indexer] User not authenticated');
      return NextResponse.json({
        success: false,
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Get user data
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

    // Calculate date range
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);
    const dateString = dateFrom.toISOString().split('T')[0].replace(/-/g, '/');

    // Search for messages with attachments
    const searchQuery = `has:attachment after:${dateString}`;

    console.log(`[CRON: Attachment Indexer] Searching: ${searchQuery}`);

    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: maxMessages
    });

    const messages = messagesResponse.data.messages || [];
    console.log(`[CRON: Attachment Indexer] Found ${messages.length} messages with attachments`);

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new messages with attachments found',
        messagesChecked: 0,
        attachmentsProcessed: 0
      });
    }

    let totalAttachments = 0;
    let processedAttachments = 0;
    let errors = 0;

    // Process each message
    for (const message of messages) {
      try {
        // Get full message details
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!
        });

        const headers = fullMessage.data.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';

        // Check if we've already processed this message
        const { data: existingIndex } = await supabase
          .from('indexed_files')
          .select('id')
          .eq('source_id', message.id)
          .eq('file_source', 'email_attachment')
          .limit(1);

        if (existingIndex && existingIndex.length > 0) {
          console.log(`[CRON: Attachment Indexer] Message ${message.id} already processed, skipping`);
          continue;
        }

        // Extract attachments
        const attachments: any[] = [];
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
        totalAttachments += attachments.length;

        console.log(`[CRON: Attachment Indexer] Message "${subject}" has ${attachments.length} attachments`);

        // Process each attachment
        for (const att of attachments) {
          try {
            // Call the attachment processing endpoint
            const processResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/google/gmail/attachments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                messageId: message.id,
                attachmentId: att.attachmentId,
                processAll: false
              })
            });

            if (processResponse.ok) {
              processedAttachments++;
              console.log(`[CRON: Attachment Indexer] ✓ Processed: ${att.filename}`);
            } else {
              errors++;
              console.error(`[CRON: Attachment Indexer] ✗ Failed: ${att.filename}`);
            }

          } catch (attError: any) {
            errors++;
            console.error(`[CRON: Attachment Indexer] Error processing attachment ${att.filename}:`, attError);
          }

          // Rate limiting: small delay between attachments
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (msgError: any) {
        errors++;
        console.error(`[CRON: Attachment Indexer] Error processing message ${message.id}:`, msgError);
      }
    }

    console.log(`[CRON: Attachment Indexer] Complete!`);
    console.log(`[CRON: Attachment Indexer] Messages checked: ${messages.length}`);
    console.log(`[CRON: Attachment Indexer] Total attachments found: ${totalAttachments}`);
    console.log(`[CRON: Attachment Indexer] Successfully processed: ${processedAttachments}`);
    console.log(`[CRON: Attachment Indexer] Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      message: 'Attachment indexing complete',
      messagesChecked: messages.length,
      attachmentsFound: totalAttachments,
      attachmentsProcessed: processedAttachments,
      errors
    });

  } catch (error: any) {
    console.error('[CRON: Attachment Indexer] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to index attachments'
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
