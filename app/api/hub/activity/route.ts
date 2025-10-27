/**
 * HUB ACTIVITY API
 * GET /api/hub/activity
 *
 * Returns recent activity across all platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get activity from platform_activity_feed
    const { data: activity, error } = await supabase
      .from('platform_activity_feed')
      .select('*')
      .eq('user_id', userEmail)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity:', error);
      return NextResponse.json({ activity: [] });
    }

    return NextResponse.json({
      success: true,
      activity: activity || [],
    });
  } catch (error) {
    console.error('Hub activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
