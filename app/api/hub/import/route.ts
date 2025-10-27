/**
 * HUB IMPORT API
 * POST /api/hub/import
 *
 * Import conversations from various platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { parseClaudeExport, convertClaudeToKimbleAI } from '@/lib/importers/claude-parser';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as string || 'auto';
    const generateEmbeddings = formData.get('generateEmbeddings') === 'true';
    const detectDuplicates = formData.get('detectDuplicates') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();
    let parsedData: any = null;
    let importStats: any = {};

    // Parse based on platform
    if (platform === 'claude' || platform === 'auto') {
      try {
        parsedData = await parseClaudeExport(fileContent);

        // Import conversations
        const batchId = crypto.randomUUID();
        const conversations = [];

        for (const project of parsedData.projects) {
          for (const conversation of project.conversations || []) {
            const converted = convertClaudeToKimbleAI(conversation);
            const fullText = converted.messages.map((m: any) => m.content).join('\n\n');

            // Generate embedding if requested
            let embedding = null;
            if (generateEmbeddings) {
              const embResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: fullText.substring(0, 8000), // Limit length
              });
              embedding = embResponse.data[0].embedding;
            }

            // Calculate dedup hash
            const dedupHash = hashString(fullText);

            // Check for duplicates if requested
            if (detectDuplicates) {
              const { data: existing } = await supabase
                .from('imported_conversations')
                .select('id')
                .eq('user_id', userEmail)
                .eq('dedup_hash', dedupHash)
                .limit(1);

              if (existing && existing.length > 0) {
                continue; // Skip duplicate
              }
            }

            conversations.push({
              user_id: userEmail,
              source_platform: 'claude',
              source_id: conversation.id,
              title: converted.title,
              content: fullText,
              message_count: converted.messages.length,
              created_date: converted.created_at,
              modified_date: converted.updated_at,
              embedding,
              tags: [],
              category: project.name,
              import_batch_id: batchId,
              dedup_hash: dedupHash,
              metadata: converted.metadata,
            });
          }
        }

        // Insert conversations
        if (conversations.length > 0) {
          const { error } = await supabase
            .from('imported_conversations')
            .insert(conversations);

          if (error) {
            console.error('Error inserting conversations:', error);
            throw error;
          }
        }

        importStats = {
          totalProjects: parsedData.projects.length,
          totalConversations: parsedData.totalConversations,
          imported: conversations.length,
          skipped: parsedData.totalConversations - conversations.length,
          totalMessages: parsedData.totalMessages,
          dateRange: parsedData.dateRange,
        };

      } catch (error) {
        console.error('Claude parse error:', error);
        return NextResponse.json(
          { error: 'Failed to parse Claude export', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      platform: 'claude',
      stats: importStats,
      message: `Successfully imported ${importStats.imported} conversations`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
