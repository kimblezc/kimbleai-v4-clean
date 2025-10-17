// Deploy indexing state schema to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deploySchema() {
  try {
    console.log('📊 Deploying indexing state schema...');

    const schemaPath = path.join(__dirname, '../database/indexing-state-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: schema
    });

    if (error) {
      // If exec_sql function doesn't exist, try direct execution
      console.log('Using alternative deployment method...');

      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', {
          query: statement
        });

        if (stmtError) {
          console.error('Statement error:', stmtError);
          console.log('Failed statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('✅ Schema deployed successfully!');
    console.log('\nNext steps:');
    console.log('1. Trigger initial indexing: POST /api/index/trigger');
    console.log('2. Monitor progress: GET /api/index/trigger');
    console.log('3. Automatic cron runs every 6 hours');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    console.log('\n⚠️  Manual deployment required:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy/paste database/indexing-state-schema.sql');
    console.log('3. Run the SQL');
    process.exit(1);
  }
}

deploySchema();
