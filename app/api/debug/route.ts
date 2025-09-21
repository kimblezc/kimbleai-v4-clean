import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Test 1: Check connection
    const connectionTest = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    // Test 2: Query users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    // Test 3: Get Zach specifically
    const { data: zachUser, error: zachError } = await supabase
      .from('users')
      .select('id, name')
      .eq('name', 'Zach')
      .single();
    
    return NextResponse.json({
      connection: connectionTest,
      users: {
        data: users,
        error: usersError?.message || null,
        count: users?.length || 0
      },
      zachLookup: {
        data: zachUser,
        error: zachError?.message || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    });
  }
}