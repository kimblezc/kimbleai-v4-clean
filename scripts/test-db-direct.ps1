# DIRECT DATABASE TEST
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "TESTING DIRECT DATABASE CONNECTION" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor White
Write-Host ""

# Test with a simple direct query request
$testBody = @{
    action = "test_db"
    query = "SELECT * FROM users"
} | ConvertTo-Json

Write-Host "Creating test endpoint..." -ForegroundColor Yellow

# Create a test API route
$testRoute = @'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Direct query to users table
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    return NextResponse.json({
      users: data,
      error: error?.message || null,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    });
  }
}
'@

Write-Host "Test route code ready. Check Vercel logs for errors." -ForegroundColor Green
Write-Host ""
Write-Host "Most likely issues:" -ForegroundColor Yellow
Write-Host "1. Wrong Supabase project ID in Vercel" -ForegroundColor White
Write-Host "2. Service role key not updated in Vercel" -ForegroundColor White
Write-Host "3. Users table doesn't exist in the connected database" -ForegroundColor White