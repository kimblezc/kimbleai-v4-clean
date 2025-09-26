import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check if user_tokens table exists and has data
    const { data: tokens, error } = await supabase
      .from('user_tokens')
      .select('*')
      .limit(10);

    if (error) {
      return NextResponse.json({
        error: 'Failed to query tokens',
        details: error.message,
        hint: 'user_tokens table might not exist'
      });
    }

    // Check specifically for Zach's tokens
    const { data: zachTokens, error: zachError } = await supabase
      .from('user_tokens')
      .select('user_id, email, access_token, scope, updated_at')
      .eq('user_id', 'zach')
      .single();

    return NextResponse.json({
      success: true,
      totalTokens: tokens?.length || 0,
      allTokens: tokens?.map(t => ({
        user_id: t.user_id,
        email: t.email,
        hasAccessToken: !!t.access_token,
        scope: t.scope,
        updated_at: t.updated_at
      })) || [],
      zachSpecific: zachTokens ? {
        user_id: zachTokens.user_id,
        email: zachTokens.email,
        hasAccessToken: !!zachTokens.access_token,
        accessTokenLength: zachTokens.access_token?.length || 0,
        scope: zachTokens.scope,
        updated_at: zachTokens.updated_at
      } : null,
      zachError: zachError?.message || null
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message
    }, { status: 500 });
  }
}