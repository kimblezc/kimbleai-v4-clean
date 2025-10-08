// Get export logs for a user
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'zach';
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data: logs, error } = await supabase
      .from('export_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          logs: [],
          message: 'Export logs table not created yet. Exports will be logged once table is created.'
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: logs?.length || 0
    });

  } catch (error: any) {
    console.error('[EXPORT-LOGS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export logs', details: error.message },
      { status: 500 }
    );
  }
}
