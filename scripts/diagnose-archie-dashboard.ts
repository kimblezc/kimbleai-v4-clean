import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function diagnoseDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('\n🔍 ARCHIE DASHBOARD DIAGNOSTIC REPORT\n');
  console.log('=' .repeat(60));

  const userId = 'zach';
  const tables = [
    { name: 'audio_transcriptions', description: 'Transcriptions table' },
    { name: 'transcriptions', description: 'Alternative transcriptions table (if exists)' },
    { name: 'device_sessions', description: 'Device sessions' },
    { name: 'agent_tasks', description: 'Agent tasks' },
    { name: 'agent_findings', description: 'Agent findings/insights' },
    { name: 'agent_logs', description: 'Agent activity logs' },
    { name: 'audio_files', description: 'Audio files' },
    { name: 'transcription_queue', description: 'Transcription queue' }
  ];

  for (const table of tables) {
    console.log(`\n📋 Table: ${table.name}`);
    console.log('-'.repeat(60));

    try {
      // Check if table exists by trying to count
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        console.log(`   Status: Table may not exist or access denied`);
      } else {
        console.log(`   ✅ Table exists`);
        console.log(`   Total rows: ${count}`);

        // Get sample data
        const { data: sample } = await supabase
          .from(table.name)
          .select('*')
          .limit(3);

        if (sample && sample.length > 0) {
          console.log(`   Sample columns:`, Object.keys(sample[0]).join(', '));
        }

        // For specific tables, get filtered counts
        if (table.name === 'audio_transcriptions') {
          const { count: userCount } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          console.log(`   User '${userId}' rows: ${userCount}`);
        }

        if (table.name === 'device_sessions') {
          const { count: activeCount } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_active', true);
          console.log(`   Active devices for '${userId}': ${activeCount}`);
        }

        if (table.name === 'agent_tasks') {
          const { count: pendingCount } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'in_progress']);
          console.log(`   Pending/In-progress tasks: ${pendingCount}`);
        }

        if (table.name === 'agent_findings') {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { count: recentCount } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true })
            .gte('detected_at', weekAgo);
          console.log(`   Recent findings (last 7 days): ${recentCount}`);
        }

        if (table.name === 'agent_logs') {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count: recentCount } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dayAgo);
          console.log(`   Recent logs (last 24h): ${recentCount}`);
        }
      }
    } catch (err: any) {
      console.log(`   ❌ EXCEPTION: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY & RECOMMENDATIONS\n');

  // Check for the main issue: transcriptions vs audio_transcriptions
  const { count: transcriptionsCount, error: transcriptionsError } = await supabase
    .from('transcriptions')
    .select('*', { count: 'exact', head: true });

  const { count: audioTranscriptionsCount, error: audioTranscriptionsError } = await supabase
    .from('audio_transcriptions')
    .select('*', { count: 'exact', head: true });

  if (transcriptionsError && !audioTranscriptionsError) {
    console.log('⚠️  ISSUE FOUND: Dashboard queries "transcriptions" but only "audio_transcriptions" exists');
    console.log('   Fix: Change dashboard to query "audio_transcriptions"');
  } else if (!transcriptionsError && audioTranscriptionsError) {
    console.log('⚠️  ISSUE FOUND: "transcriptions" exists but "audio_transcriptions" does not');
    console.log('   Current: Dashboard queries "transcriptions" (correct)');
  } else if (!transcriptionsError && !audioTranscriptionsError) {
    console.log('ℹ️  Both tables exist:');
    console.log(`   - transcriptions: ${transcriptionsCount} rows`);
    console.log(`   - audio_transcriptions: ${audioTranscriptionsCount} rows`);
    console.log('   Recommendation: Use the table with more data or merge them');
  } else {
    console.log('❌ Neither table exists - no transcription data available');
  }

  console.log('\n');
}

diagnoseDashboard();
