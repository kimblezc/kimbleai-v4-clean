/**
 * Debug endpoint to check cost tracking database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const userId = '2965a7d1-a188-4368-8460-75b90cc62a97';

  // Test 1: Check if table exists by trying to query it
  console.log('🔍 Test 1: Checking if api_cost_tracking table exists...');
  const { data: tableTest, error: tableError } = await supabase
    .from('api_cost_tracking')
    .select('*')
    .limit(1);

  // Test 2: Try to count all records
  console.log('🔍 Test 2: Counting all records...');
  const { count: totalCount, error: countError } = await supabase
    .from('api_cost_tracking')
    .select('*', { count: 'exact', head: true });

  // Test 3: Try to get recent records for user
  console.log('🔍 Test 3: Getting recent records for user...');
  const { data: userRecords, error: userError } = await supabase
    .from('api_cost_tracking')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(10);

  // Test 4: Try to get ALL records (no filter)
  console.log('🔍 Test 4: Getting all records...');
  const { data: allRecords, error: allError } = await supabase
    .from('api_cost_tracking')
    .select('*')
    .limit(20);

  return NextResponse.json({
    tests: {
      tableExists: {
        success: !tableError,
        error: tableError?.message,
        data: tableTest,
      },
      totalCount: {
        success: !countError,
        count: totalCount,
        error: countError?.message,
      },
      userRecords: {
        success: !userError,
        count: userRecords?.length || 0,
        records: userRecords,
        error: userError?.message,
      },
      allRecords: {
        success: !allError,
        count: allRecords?.length || 0,
        records: allRecords,
        error: allError?.message,
      },
    },
  });
}
