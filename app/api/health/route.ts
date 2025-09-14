import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const checks = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ZAPIER_WEBHOOK_URL: !!process.env.ZAPIER_WEBHOOK_URL
    },
    supabase: {
      connected: false,
      tables_accessible: false
    },
    openai: {
      key_format_valid: false
    }
  };

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.supabase.connected = !error;
    checks.supabase.tables_accessible = !error;
  } catch (error) {
    console.error('Supabase check failed:', error);
  }

  // Check OpenAI key format
  const openaiKey = process.env.OPENAI_API_KEY;
  checks.openai.key_format_valid = !!openaiKey && openaiKey.startsWith('sk-');

  // Determine overall status
  const allEnvVarsPresent = Object.values(checks.environment).every(v => v);
  const supabaseWorking = checks.supabase.connected;
  const openaiValid = checks.openai.key_format_valid;

  checks.status = allEnvVarsPresent && supabaseWorking && openaiValid ? 'healthy' : 'unhealthy';

  return NextResponse.json(checks);
}
