// Create export_logs table in Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTable() {
  console.log('\n📊 Creating export_logs table...\n');

  const sql = `
    -- Create export_logs table for tracking export history
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
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative method using direct query
      console.log('⚠️  RPC method failed, trying alternative...');

      // For Supabase, we'll just verify the table exists by trying to select from it
      const { error: selectError } = await supabase
        .from('export_logs')
        .select('id')
        .limit(1);

      if (selectError) {
        console.log('📝 Table needs to be created manually.');
        console.log('\n🔗 Please run this SQL in your Supabase SQL Editor:');
        console.log('━'.repeat(60));
        console.log(sql);
        console.log('━'.repeat(60));
        console.log('\nOr visit: https://supabase.com/dashboard/project/[your-project]/editor\n');
      } else {
        console.log('✅ export_logs table already exists!');
      }
    } else {
      console.log('✅ export_logs table created successfully!');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please create the table manually in Supabase SQL Editor:');
    console.log('━'.repeat(60));
    console.log(sql);
    console.log('━'.repeat(60));
  }
}

createTable();
