/**
 * Migration endpoint to create cost tracking tables
 * WARNING: This should only be run once to set up the database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('🚀 Starting cost tracking table migration...');

    // Read the SQL migration file
    const sqlPath = join(process.cwd(), 'database', 'api-cost-tracking.sql');
    const fullSql = readFileSync(sqlPath, 'utf-8');

    console.log('📖 SQL file loaded, executing migration...');

    // Split SQL into individual statements and execute them
    // Remove comments and split by semicolons
    const statements = fullSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Execute each statement using raw SQL via Supabase
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      try {
        // Use Supabase's raw SQL execution (available with service role key)
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

        if (error) {
          // Try alternative: direct table creation for specific statements
          if (stmt.includes('CREATE TABLE')) {
            console.log(`⚠️  Skipping CREATE TABLE (may already exist): ${stmt.substring(0, 50)}...`);
            results.push({ statement: i + 1, status: 'skipped', message: 'Table may already exist' });
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            results.push({ statement: i + 1, status: 'error', error: error.message });
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          results.push({ statement: i + 1, status: 'success' });
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ Statement ${i + 1} error:`, err.message);
        results.push({ statement: i + 1, status: 'error', error: err.message });
        errorCount++;
      }
    }

    // Verify table was created
    console.log('🔍 Verifying table creation...');
    const { error: verifyError } = await supabase
      .from('api_cost_tracking')
      .select('id')
      .limit(1);

    const tableExists = !verifyError;

    return NextResponse.json({
      success: tableExists,
      message: tableExists
        ? 'Migration completed successfully! Cost tracking tables are ready.'
        : 'Migration had issues. Please run SQL manually in Supabase.',
      stats: {
        totalStatements: statements.length,
        successful: successCount,
        errors: errorCount,
        tableVerified: tableExists,
      },
      details: results,
      manualInstructions: !tableExists ? {
        message: 'If automatic migration failed, please run the SQL manually:',
        steps: [
          '1. Go to https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql',
          '2. Click "New Query"',
          '3. Copy content from database/api-cost-tracking.sql',
          '4. Click RUN',
        ],
      } : undefined,
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      manualInstructions: {
        message: 'Automatic migration failed. Please run the SQL manually:',
        steps: [
          '1. Go to https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql',
          '2. Click "New Query"',
          '3. Copy and paste the ENTIRE content from database/api-cost-tracking.sql',
          '4. Click RUN',
          '5. Refresh this page',
        ],
        sqlFile: 'database/api-cost-tracking.sql',
      },
    }, { status: 500 });
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    const { error } = await supabase
      .from('api_cost_tracking')
      .select('id')
      .limit(1);

    const tableExists = !error;

    return NextResponse.json({
      tableExists,
      message: tableExists
        ? 'Cost tracking tables exist and are ready!'
        : 'Cost tracking tables do not exist. Run POST /api/migrate-costs to create them.',
      nextSteps: tableExists ? [
        'Tables are ready!',
        'Run: npx tsx scripts/add-test-costs.ts',
        'Visit: http://localhost:3001/costs',
      ] : [
        'Run: curl -X POST http://localhost:3001/api/migrate-costs',
        'Or manually execute database/api-cost-tracking.sql in Supabase',
      ],
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      tableExists: false,
    }, { status: 500 });
  }
}
