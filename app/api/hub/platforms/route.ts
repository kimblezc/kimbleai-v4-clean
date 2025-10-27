/**
 * PLATFORMS API
 * GET /api/hub/platforms - List all platform connections
 * POST /api/hub/platforms - Create new platform connection
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

    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json({ connections: [] });
    }

    return NextResponse.json({
      success: true,
      connections: connections || [],
    });
  } catch (error) {
    console.error('Platforms API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const body = await request.json();

    const { platformType, platformName, apiKey, syncSchedule } = body;

    if (!platformType || !platformName) {
      return NextResponse.json(
        { error: 'Platform type and name required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('platform_connections')
      .insert({
        user_id: userEmail,
        platform_type: platformType,
        platform_name: platformName,
        api_key_encrypted: apiKey ? btoa(apiKey) : null, // Simple encoding (use proper encryption in production)
        sync_schedule: syncSchedule || 'manual',
        status: 'active',
        sync_enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating connection:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      connection: data,
    });
  } catch (error) {
    console.error('Create platform error:', error);
    return NextResponse.json(
      { error: 'Failed to create platform connection' },
      { status: 500 }
    );
  }
}
