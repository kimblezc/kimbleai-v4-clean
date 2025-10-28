import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/sessions/latest - Get most recent session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const device = searchParams.get('device');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('session_logs')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1);

    // Filter by device if specified
    if (device && device !== 'all') {
      query = query.eq('device_name', device);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching latest session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch latest session' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { session: null, message: 'No sessions found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: data[0] });
  } catch (error) {
    console.error('Error in GET /api/sessions/latest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
