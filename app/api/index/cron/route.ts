// app/api/index/cron/route.ts
// Automated indexing cron job - indexes Drive, Gmail, and uploaded files
// Runs every 6 hours to keep Digital Butler's knowledge up-to-date

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Performance limits to stay within Vercel/Supabase constraints
const MAX_EXECUTION_TIME = 280000; // 280 seconds (Vercel allows 300s for cron)
const BATCH_SIZE = 100; // Process 100 items at a time
// NO FILE LIMITS - index EVERYTHING across multiple cron runs
// Use cursor-based pagination to resume where we left off

// Generate embedding for content
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit to 8K chars
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[Indexing] Embedding generation failed:', error);
    return null;
  }
}

// Extract text content from Google Drive file
async function extractDriveFileContent(drive: any, file: any): Promise<string> {
  try {
    // For Google Docs/Sheets/Slides, export as plain text
    if (file.mimeType === 'application/vnd.google-apps.document') {
      const response = await drive.files.export({
        fileId: file.id,
        mimeType: 'text/plain'
      });
      return response.data || '';
    }

    // For PDFs and other text files, get the content
    if (
      file.mimeType === 'application/pdf' ||
      file.mimeType === 'text/plain' ||
      file.mimeType === 'text/markdown'
    ) {
      const response = await drive.files.get({
        fileId: file.id,
        alt: 'media'
      }, { responseType: 'text' });

      // For PDFs, just return first 10K chars as preview
      const content = String(response.data || '');
      return content.substring(0, 10000);
    }

    // For other file types, just return the filename as content
    return `File: ${file.name} (${file.mimeType})`;
  } catch (error) {
    console.error(`[Indexing] Failed to extract content from ${file.name}:`, error);
    return `File: ${file.name}`;
  }
}

// Get or create indexing state for a user
async function getIndexingState(userId: string, source: 'drive' | 'gmail') {
  const { data } = await supabase
    .from('indexing_state')
    .select('*')
    .eq('user_id', userId)
    .eq('source', source)
    .single();

  if (!data) {
    // Create initial state
    const { data: newState } = await supabase
      .from('indexing_state')
      .insert({
        user_id: userId,
        source: source,
        last_cursor: null,
        last_indexed_at: null,
        total_indexed: 0,
        status: 'in_progress'
      })
      .select()
      .single();
    return newState;
  }

  return data;
}

// Update indexing state
async function updateIndexingState(userId: string, source: 'drive' | 'gmail', cursor: string | null, indexed: number) {
  await supabase
    .from('indexing_state')
    .update({
      last_cursor: cursor,
      last_indexed_at: new Date().toISOString(),
      total_indexed: indexed,
      status: cursor ? 'in_progress' : 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('source', source);
}

// Index Drive files for a user (resumable across cron runs)
async function indexDriveFiles(userId: string, accessToken: string, refreshToken: string, startTime: number) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Get indexing state to resume from where we left off
  const state = await getIndexingState(userId, 'drive');
  let indexed = 0;
  let skipped = 0;
  let pageToken: string | undefined = state?.last_cursor || undefined;

  console.log(`[Indexing] Drive indexing for user ${userId} - resuming from cursor: ${pageToken ? 'yes' : 'start'}, total indexed so far: ${state?.total_indexed || 0}`);

  try {
    do {
      // Check timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`[Indexing] Drive timeout reached for user ${userId}, will resume next run`);
        await updateIndexingState(userId, 'drive', pageToken || null, (state?.total_indexed || 0) + indexed);
        break;
      }

      // Get batch of files - ALL files, not just recent
      const response = await drive.files.list({
        q: 'trashed=false',
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
        pageSize: BATCH_SIZE,
        pageToken,
        orderBy: 'folder,name' // Consistent ordering for pagination
      });

      const files = response.data.files || [];

      for (const file of files) {
        // Skip folders
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          continue;
        }

        // Check if already indexed (and recently modified)
        const { data: existing } = await supabase
          .from('knowledge_base')
          .select('id, metadata')
          .eq('source_id', file.id)
          .eq('source_type', 'drive')
          .eq('user_id', userId)
          .single();

        // Skip if already indexed and not modified
        if (existing && existing.metadata?.modifiedTime === file.modifiedTime) {
          skipped++;
          continue;
        }

        // Extract content
        const fullContent = await extractDriveFileContent(drive, file);

        // Generate embedding from FULL content (up to 8K chars)
        const embedding = await generateEmbedding(fullContent);

        // Store ONLY a small snippet (500 chars max) to save space
        // We rely on the embedding for semantic search, not the full content
        const contentSnippet = fullContent.substring(0, 500);

        // Index or update the file
        const { error } = await supabase
          .from('knowledge_base')
          .upsert({
            id: existing?.id, // Keep existing ID if updating
            user_id: userId,
            title: file.name,
            content: contentSnippet, // ONLY SNIPPET, not full content
            source_type: 'drive',
            source_id: file.id,
            category: 'file',
            embedding: embedding,
            metadata: {
              mimeType: file.mimeType,
              size: file.size,
              modifiedTime: file.modifiedTime,
              webViewLink: file.webViewLink
            },
            created_at: existing ? undefined : new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (!error) {
          indexed++;
        } else {
          console.error(`[Indexing] Failed to index ${file.name}:`, error);
        }
      }

      pageToken = response.data.nextPageToken;

      // Save progress after each batch
      await updateIndexingState(userId, 'drive', pageToken || null, (state?.total_indexed || 0) + indexed);

    } while (pageToken);

  } catch (error) {
    console.error(`[Indexing] Drive indexing error for user ${userId}:`, error);
  }

  return { indexed, skipped };
}

// Index Gmail messages for a user (resumable, indexes ALL mail)
async function indexGmailMessages(userId: string, accessToken: string, refreshToken: string, startTime: number) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get indexing state to resume from where we left off
  const state = await getIndexingState(userId, 'gmail');
  let indexed = 0;
  let skipped = 0;
  let pageToken: string | undefined = state?.last_cursor || undefined;

  console.log(`[Indexing] Gmail indexing for user ${userId} - resuming from cursor: ${pageToken ? 'yes' : 'start'}, total indexed so far: ${state?.total_indexed || 0}`);

  try {
    // Get ALL messages, not just recent (no date filter)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: BATCH_SIZE,
      pageToken
    });

    const messages = response.data.messages || [];
    pageToken = response.data.nextPageToken;

    for (const message of messages) {
      // Check timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`[Indexing] Gmail timeout reached for user ${userId}`);
        break;
      }

      // Check if already indexed
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('id')
        .eq('source_id', message.id)
        .eq('source_type', 'email')
        .eq('user_id', userId)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Get full message
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full'
      });

      const headers = fullMessage.data.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const snippet = fullMessage.data.snippet || '';

      // Create full content for embedding
      const fullContent = `From: ${from}\nSubject: ${subject}\nDate: ${date}\n\n${snippet}`;

      // Generate embedding from full content
      const embedding = await generateEmbedding(fullContent);

      // Store ONLY a small snippet (500 chars) to save database space
      const contentSnippet = fullContent.substring(0, 500);

      // Index the email
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          user_id: userId,
          title: subject,
          content: contentSnippet, // ONLY SNIPPET, not full email
          source_type: 'email',
          source_id: message.id,
          category: 'email',
          embedding: embedding,
          metadata: {
            from,
            date,
            messageId: message.id
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (!error) {
        indexed++;
      } else {
        console.error(`[Indexing] Failed to index email ${message.id}:`, error);
      }
    }

    // Save progress
    await updateIndexingState(userId, 'gmail', pageToken || null, (state?.total_indexed || 0) + indexed);

  } catch (error) {
    console.error(`[Indexing] Gmail indexing error for user ${userId}:`, error);
  }

  return { indexed, skipped, hasMore: !!pageToken };
}

// Check storage usage and warn if approaching limits
async function checkStorageLimits() {
  try {
    const { count } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });

    // Estimate: Each row ~6.5 KB (500 char content + 1536 float embedding + metadata)
    const estimatedMB = ((count || 0) * 6.5) / 1024;
    const FREE_TIER_LIMIT_MB = 500;
    const usagePercent = (estimatedMB / FREE_TIER_LIMIT_MB) * 100;

    if (usagePercent >= 90) {
      console.error(`🚨 [STORAGE] CRITICAL: ${usagePercent.toFixed(1)}% of Supabase free tier used (${estimatedMB.toFixed(0)} MB / ${FREE_TIER_LIMIT_MB} MB). UPGRADE IMMEDIATELY!`);
    } else if (usagePercent >= 75) {
      console.warn(`⚠️  [STORAGE] WARNING: ${usagePercent.toFixed(1)}% of Supabase free tier used (${estimatedMB.toFixed(0)} MB / ${FREE_TIER_LIMIT_MB} MB). Consider upgrading soon.`);
    } else {
      console.log(`✅ [STORAGE] Storage healthy: ${usagePercent.toFixed(1)}% used (${estimatedMB.toFixed(0)} MB / ${FREE_TIER_LIMIT_MB} MB)`);
    }

    return { estimatedMB, usagePercent };
  } catch (error) {
    console.error('[STORAGE] Failed to check limits:', error);
    return null;
  }
}

/**
 * POST /api/index/cron
 * Scheduled indexing cron job
 * Runs every 6 hours (configured in vercel.json)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify this is a valid cron request
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    console.log('[INDEXING CRON DEBUG] Auth header:', authHeader);
    console.log('[INDEXING CRON DEBUG] Expected:', expectedAuth);
    console.log('[INDEXING CRON DEBUG] Match:', authHeader === expectedAuth);

    if (authHeader !== expectedAuth) {
      console.error('[INDEXING CRON] Unauthorized request');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('[INDEXING CRON] Starting scheduled indexing job');

    // Check storage before indexing
    const storageBefore = await checkStorageLimits();

    // Get all active users with Google tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('user_tokens')
      .select('user_id, access_token, refresh_token')
      .not('access_token', 'is', null);

    if (tokensError || !tokens || tokens.length === 0) {
      console.error('[INDEXING CRON] No users with tokens found:', tokensError);
      return NextResponse.json({
        success: false,
        error: 'No users to index'
      }, { status: 400 });
    }

    console.log(`[INDEXING CRON] Found ${tokens.length} users to index`);

    const results = {
      total: tokens.length,
      successful: 0,
      failed: 0,
      users: [] as any[]
    };

    // Process each user
    for (const token of tokens) {
      try {
        console.log(`[INDEXING CRON] Indexing data for user: ${token.user_id}`);

        // Index Drive files
        const driveStats = await indexDriveFiles(
          token.user_id,
          token.access_token,
          token.refresh_token,
          startTime
        );

        // Index Gmail messages
        const gmailStats = await indexGmailMessages(
          token.user_id,
          token.access_token,
          token.refresh_token,
          startTime
        );

        results.successful++;
        results.users.push({
          userId: token.user_id,
          drive: driveStats,
          gmail: gmailStats,
          success: true
        });

        console.log(`[INDEXING CRON] Completed for ${token.user_id}: Drive=${driveStats.indexed} indexed, Gmail=${gmailStats.indexed} indexed`);

      } catch (error: any) {
        console.error(`[INDEXING CRON] Failed to index user ${token.user_id}:`, error);
        results.failed++;
        results.users.push({
          userId: token.user_id,
          success: false,
          error: error.message
        });
      }

      // Check global timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log('[INDEXING CRON] Global timeout reached, stopping');
        break;
      }
    }

    const duration = Date.now() - startTime;

    // Check storage after indexing
    const storageAfter = await checkStorageLimits();

    // Log the cron job result
    await supabase.from('cron_logs').insert({
      job_name: 'auto_indexing',
      run_at: new Date().toISOString(),
      status: results.failed === 0 ? 'success' : results.successful > 0 ? 'partial' : 'failed',
      results: results,
      duration_ms: duration
    });

    console.log('[INDEXING CRON] Indexing job completed:', results);

    return NextResponse.json({
      success: true,
      message: `Indexing completed: ${results.successful} successful, ${results.failed} failed`,
      duration: `${(duration / 1000).toFixed(1)}s`,
      storage: {
        before: storageBefore,
        after: storageAfter
      },
      results
    });

  } catch (error: any) {
    console.error('[INDEXING CRON] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Indexing cron job failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/index/cron (for testing)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Indexing cron endpoint is active',
    schedule: 'Every 6 hours',
    config: {
      cronSecret: process.env.CRON_SECRET ? 'configured' : 'missing',
      openaiKey: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      googleClientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing'
    }
  });
}

// Export config for Vercel
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max
