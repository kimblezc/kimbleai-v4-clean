// Setup export_logs table (one-time setup)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Try to create the table by inserting a test record
    // This will fail if table doesn't exist, which tells us we need to create it
    const { error: testError } = await supabase
      .from('export_logs')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      // Table doesn't exist
      return NextResponse.json({
        success: false,
        tableExists: false,
        message: 'Export logs table does not exist. Please create it manually in Supabase SQL Editor.',
        sql: `
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  transcription_count INTEGER NOT NULL DEFAULT 1,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  transcription_ids TEXT[],
  results JSONB,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_created_at ON export_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_type ON export_logs(export_type);
        `.trim()
      });
    }

    // Table exists
    return NextResponse.json({
      success: true,
      tableExists: true,
      message: 'Export logs table is ready!'
    });

  } catch (error: any) {
    console.error('[SETUP-EXPORT-LOGS] Error:', error);
    return NextResponse.json(
      { error: 'Setup check failed', details: error.message },
      { status: 500 }
    );
  }
}
