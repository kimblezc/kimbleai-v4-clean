// Apply transcription job tracking migration
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Applying transcription job tracking migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/add-transcription-job-tracking.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement (simple split by semicolon and newline)
    const statements = sql
      .split(';\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('RPC failed, trying direct execution...');

        // For direct execution, we need to use the SQL editor or supabase CLI
        // For now, just log the error and continue
        console.warn('Warning:', error.message);
        console.log('You may need to run this SQL manually in the Supabase dashboard');
      } else {
        console.log('✓ Success');
      }
    }

    // Verify the migration by checking if the columns exist
    console.log('\nVerifying migration...');
    const { data: tableInfo, error: verifyError } = await supabase
      .from('audio_transcriptions')
      .select('status, job_id, assemblyai_id, progress, error')
      .limit(1);

    if (verifyError) {
      console.error('\n✗ Verification failed:', verifyError.message);
      console.log('\nPlease run the following SQL manually in your Supabase dashboard:');
      console.log('SQL Editor URL: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'));
      console.log('\n--- SQL to run ---');
      console.log(sql);
      console.log('--- End SQL ---\n');
    } else {
      console.log('✓ Migration verified successfully!');
      console.log('\nNew columns available:');
      console.log('  - status: TEXT (job status)');
      console.log('  - job_id: TEXT (internal job ID)');
      console.log('  - assemblyai_id: TEXT (AssemblyAI transcript ID)');
      console.log('  - progress: INTEGER (0-100)');
      console.log('  - error: TEXT (error message)');
    }

  } catch (error: any) {
    console.error('\nError applying migration:', error.message);
    console.log('\nPlease run the SQL manually in your Supabase dashboard.');
    console.log('File location:', path.join(__dirname, '../database/add-transcription-job-tracking.sql'));
    process.exit(1);
  }
}

applyMigration();
