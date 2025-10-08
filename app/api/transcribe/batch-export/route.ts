// Batch export multiple transcriptions to Google Drive
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      transcriptionIds,  // Array of transcription IDs
      category = null,    // Optional: category name for folder
      userId = 'zach'     // User ID for Supabase token lookup
    } = await request.json();

    if (!transcriptionIds || !Array.isArray(transcriptionIds) || transcriptionIds.length === 0) {
      return NextResponse.json(
        { error: 'transcriptionIds array is required' },
        { status: 400 }
      );
    }

    // Try NextAuth session first
    const session = await getServerSession();
    let accessToken = session?.accessToken;

    // Fallback to Supabase token lookup if no session
    if (!accessToken) {
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .single();

      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google Drive' },
        { status: 401 }
      );
    }

    // Export each transcription
    const results = [];
    const errors = [];

    for (const transcriptionId of transcriptionIds) {
      try {
        // Call the single export endpoint internally
        const exportResponse = await fetch(`${request.nextUrl.origin}/api/transcribe/save-to-drive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            transcriptionId,
            category,
            userId,
            multiFormat: true
          })
        });

        const exportData = await exportResponse.json();

        if (exportResponse.ok) {
          results.push({
            transcriptionId,
            success: true,
            files: exportData.files,
            message: exportData.message
          });
        } else {
          errors.push({
            transcriptionId,
            error: exportData.error || 'Export failed'
          });
        }
      } catch (error: any) {
        errors.push({
          transcriptionId,
          error: error.message
        });
      }
    }

    // Log batch export to export history
    try {
      await supabase.from('export_logs').insert({
        user_id: userId,
        export_type: 'batch',
        transcription_count: transcriptionIds.length,
        success_count: results.length,
        error_count: errors.length,
        category: category,
        transcription_ids: transcriptionIds,
        results: results,
        errors: errors,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('[BATCH-EXPORT] Error logging to export_logs:', logError);
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      total: transcriptionIds.length,
      exported: results.length,
      failed: errors.length,
      results,
      errors,
      message: `Exported ${results.length} of ${transcriptionIds.length} transcriptions` +
               (category ? ` to "${category}" project` : '')
    });

  } catch (error: any) {
    console.error('[BATCH-EXPORT] Error:', error);
    return NextResponse.json(
      { error: 'Batch export failed', details: error.message },
      { status: 500 }
    );
  }
}
