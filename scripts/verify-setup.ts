/**
 * Verify Laptop Setup
 *
 * Run this after syncing to laptop to verify everything works
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, status: 'pass' | 'fail' | 'warn', message: string) {
  results.push({ name, status, message });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
}

async function verify() {
  console.log('🔍 Verifying laptop setup...\n');

  // 1. Check environment variables
  console.log('📋 Checking environment variables...');

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];

  let allVarsPresent = true;
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      check(varName, 'pass', 'Present');
    } else {
      check(varName, 'fail', 'Missing!');
      allVarsPresent = false;
    }
  }

  if (!allVarsPresent) {
    console.log('\n❌ Missing environment variables!');
    console.log('Run: vercel env pull .env.local');
    process.exit(1);
  }

  // 2. Check Supabase connection
  console.log('\n🗄️  Checking Supabase connection...');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('agent_tasks')
      .select('count')
      .limit(1);

    if (error) {
      check('Supabase Connection', 'fail', error.message);
    } else {
      check('Supabase Connection', 'pass', 'Connected successfully');
    }
  } catch (error: any) {
    check('Supabase Connection', 'fail', error.message);
  }

  // 3. Check database tables
  console.log('\n📊 Checking database tables...');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tables = ['agent_tasks', 'agent_findings', 'agent_logs', 'agent_state'];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        check(table, 'fail', error.message);
      } else {
        check(table, 'pass', 'Accessible');
      }
    }
  } catch (error: any) {
    check('Database Tables', 'fail', error.message);
  }

  // 4. Check OpenAI API
  console.log('\n🤖 Checking OpenAI API...');
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    if (response.ok) {
      check('OpenAI API', 'pass', 'API key valid');
    } else {
      check('OpenAI API', 'fail', `HTTP ${response.status}`);
    }
  } catch (error: any) {
    check('OpenAI API', 'fail', error.message);
  }

  // 5. Check Archie status
  console.log('\n🦉 Checking Archie status...');
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('status');

    if (tasks) {
      const counts = {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length
      };

      check('Archie Tasks', 'pass', `${counts.pending} pending, ${counts.completed} completed, ${counts.in_progress} in progress`);
    }

    const { data: logs } = await supabase
      .from('agent_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (logs && logs.length > 0) {
      const lastRun = new Date(logs[0].timestamp);
      const minutesAgo = Math.floor((Date.now() - lastRun.getTime()) / 60000);
      check('Last Archie Run', 'pass', `${minutesAgo} minutes ago`);
    }
  } catch (error: any) {
    check('Archie Status', 'warn', error.message);
  }

  // 6. Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warned} warnings\n`);

  if (failed > 0) {
    console.log('❌ Setup incomplete. Fix the failed checks above.\n');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  Setup mostly complete, but check warnings.\n');
  } else {
    console.log('✅ All checks passed! Your laptop is ready to go.\n');
    console.log('Next steps:');
    console.log('  npm run dev          # Start development server');
    console.log('  npx tsx scripts/check-archie-status.ts  # Check Archie');
  }
}

verify().catch(console.error);
