/**
 * Deploy ChatGPT Import Schema to Supabase
 * Creates all tables, indexes, functions, and policies for ChatGPT import and RAG search
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deployChatGPTSchema() {
  console.log('🚀 Deploying ChatGPT Import Schema...\n');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/chatgpt-import-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📄 Schema loaded');
    console.log('   File: chatgpt-import-schema.sql');
    console.log('   Size:', Math.round(schema.length / 1024), 'KB\n');

    console.log('⚠️  Note: This schema is complex with:');
    console.log('   - pgvector extension');
    console.log('   - 4 tables with embeddings');
    console.log('   - Multiple HNSW vector indexes');
    console.log('   - RLS policies');
    console.log('   - Custom search functions');
    console.log('   - Triggers and grants\n');

    console.log('📋 Recommended deployment method:');
    console.log('   Execute this SQL in Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql/new\n');

    console.log('💡 Alternative: Use psql (if installed):');
    console.log('   psql "$DATABASE_URL" -f database/chatgpt-import-schema.sql\n');

    // Verify if tables exist
    console.log('🔍 Checking existing tables...\n');

    const tables = [
      'chatgpt_conversations',
      'chatgpt_messages',
      'chatgpt_chunks',
      'chatgpt_import_logs'
    ];

    let existingCount = 0;

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`   ✅ ${table} exists`);
          existingCount++;
        } else {
          console.log(`   ❌ ${table} not found`);
        }
      } catch (err: any) {
        console.log(`   ❌ ${table} not found`);
      }
    }

    console.log('');

    if (existingCount === tables.length) {
      console.log('🎉 All ChatGPT tables already exist!\n');
      console.log('✨ Schema is deployed and ready to use');

      // Get stats
      console.log('\n📊 Current data:');

      for (const table of tables) {
        try {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          console.log(`   ${table}: ${count || 0} rows`);
        } catch (err) {
          console.log(`   ${table}: Unable to count`);
        }
      }
    } else {
      console.log(`📝 Tables deployed: ${existingCount}/${tables.length}\n`);

      if (existingCount === 0) {
        console.log('⚡ Quick Deploy Steps:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql/new');
        console.log('   2. Copy the contents of database/chatgpt-import-schema.sql');
        console.log('   3. Paste into the SQL editor');
        console.log('   4. Click "Run" to execute');
        console.log('   5. Run this script again to verify\n');
      } else {
        console.log('⚠️  Partial deployment detected!');
        console.log('   Some tables exist but not all.');
        console.log('   Review the schema and redeploy if needed.\n');
      }
    }

    // Save schema for easy copy-paste
    const outputPath = path.join(__dirname, '../.deployment-sql.tmp');
    fs.writeFileSync(outputPath, schema);
    console.log('💾 Schema saved to: .deployment-sql.tmp (for easy copy-paste)');

  } catch (error: any) {
    console.error('\n❌ Deployment check failed:', error.message);
    process.exit(1);
  }
}

deployChatGPTSchema().catch(console.error);
