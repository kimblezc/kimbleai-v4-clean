/**
 * Archie Issues API
 * GET /api/archie/issues - Get all tracked issues with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // Filters
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const runId = searchParams.get('runId');

    // Build query
    let query = supabase
      .from('archie_issues')
      .select('*, archie_fix_attempts(*)', { count: 'exact' });

    if (type) query = query.eq('type', type);
    if (severity) query = query.eq('severity', severity);
    if (status) query = query.eq('status', status);
    if (runId) query = query.eq('run_id', runId);

    query = query
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: issues, error, count } = await query;

    if (error) {
      console.error('Error fetching issues:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      issues: issues || [],
      total: count || 0,
      page,
      pageSize
    });

  } catch (error: any) {
    console.error('Issues API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
