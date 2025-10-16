/**
 * User API
 * Get user information by email or ID
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
    const email = searchParams.get('email');
    const userId = searchParams.get('id');

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: 'Email or ID parameter required' },
        { status: 400 }
      );
    }

    let query = supabase.from('users').select('*');

    if (email) {
      query = query.eq('email', email);
    } else if (userId) {
      query = query.eq('id', userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: data.created_at,
      },
    });
  } catch (error: any) {
    console.error('[UserAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
