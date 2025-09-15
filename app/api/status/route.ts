import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  const keyLength = process.env.OPENAI_API_KEY?.length || 0;
  
  return NextResponse.json({
    status: 'API Status Check',
    openai_key_configured: hasKey,
    key_length: keyLength,
    supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    message: hasKey ? 'OpenAI key is configured' : 'OpenAI key is MISSING'
  });
}