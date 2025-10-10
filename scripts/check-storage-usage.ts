/**
 * Storage Usage Analysis Script
 * Checks actual data stored in KimbleAI Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeStorageUsage() {
  console.log('='.repeat(80));
  console.log('KIMBLEAI STORAGE USAGE ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Knowledge Base (main content storage)
    console.log('📚 KNOWLEDGE BASE:');
    const { data: kbData, error: kbError } = await supabase
      .from('knowledge_base')
      .select('id, content, metadata, source_type, created_at', { count: 'exact' });

    if (kbError) {
      console.log('  ❌ Error:', kbError.message);
    } else {
      const count = kbData?.length || 0;
      const totalSize = kbData?.reduce((sum, item) => {
        const contentSize = (item.content || '').length;
        const metadataSize = JSON.stringify(item.metadata || {}).length;
        return sum + contentSize + metadataSize;
      }, 0) || 0;

      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(3);

      console.log(`  ✅ Total entries: ${count.toLocaleString()}`);
      console.log(`  ✅ Total size: ${sizeInMB} MB (${sizeInGB} GB)`);
      console.log(`  ✅ Average per entry: ${(totalSize / (count || 1) / 1024).toFixed(2)} KB`);

      // Source type breakdown
      const sourceTypes: Record<string, number> = {};
      kbData?.forEach(item => {
        const type = item.source_type || 'unknown';
        sourceTypes[type] = (sourceTypes[type] || 0) + 1;
      });

      console.log('  📊 Source types:');
      Object.entries(sourceTypes).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count.toLocaleString()}`);
      });
    }
    console.log('');

    // 2. Audio Transcriptions
    console.log('🎤 AUDIO TRANSCRIPTIONS:');
    const { data: audioData, error: audioError } = await supabase
      .from('audio_transcriptions')
      .select('id, content, metadata, created_at', { count: 'exact' });

    if (audioError) {
      console.log('  ❌ Error:', audioError.message);
    } else {
      const count = audioData?.length || 0;
      const totalSize = audioData?.reduce((sum, item) => {
        const contentSize = (item.content || '').length;
        const metadataSize = JSON.stringify(item.metadata || {}).length;
        return sum + contentSize + metadataSize;
      }, 0) || 0;

      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

      console.log(`  ✅ Total transcriptions: ${count.toLocaleString()}`);
      console.log(`  ✅ Total size: ${sizeInMB} MB`);
      console.log(`  ✅ Average per transcription: ${(totalSize / (count || 1) / 1024).toFixed(2)} KB`);

      // Estimate audio duration (assuming ~150 words per minute, ~5 chars per word)
      const totalWords = totalSize / 5;
      const totalMinutes = totalWords / 150;
      const totalHours = totalMinutes / 60;
      console.log(`  ⏱️  Estimated total audio: ${totalHours.toFixed(1)} hours`);
    }
    console.log('');

    // 3. Messages (conversation history)
    console.log('💬 MESSAGES:');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, created_at', { count: 'exact' });

    if (messagesError) {
      console.log('  ❌ Error:', messagesError.message);
    } else {
      const count = messagesData?.length || 0;
      const totalSize = messagesData?.reduce((sum, item) => {
        return sum + (item.content || '').length;
      }, 0) || 0;

      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

      console.log(`  ✅ Total messages: ${count.toLocaleString()}`);
      console.log(`  ✅ Total size: ${sizeInMB} MB`);
    }
    console.log('');

    // 4. Conversations
    console.log('💭 CONVERSATIONS:');
    const { data: convsData, error: convsError } = await supabase
      .from('conversations')
      .select('id, title, user_id', { count: 'exact' });

    if (convsError) {
      console.log('  ❌ Error:', convsError.message);
    } else {
      const count = convsData?.length || 0;
      console.log(`  ✅ Total conversations: ${count.toLocaleString()}`);

      // User breakdown
      const userCounts: Record<string, number> = {};
      convsData?.forEach(item => {
        const user = item.user_id || 'unknown';
        userCounts[user] = (userCounts[user] || 0) + 1;
      });

      console.log('  👥 User breakdown:');
      Object.entries(userCounts).forEach(([user, count]) => {
        console.log(`     - ${user}: ${count.toLocaleString()} conversations`);
      });
    }
    console.log('');

    // 5. Projects
    console.log('📁 PROJECTS:');
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, description', { count: 'exact' });

    if (projectsError) {
      console.log('  ❌ Error:', projectsError.message);
    } else {
      const count = projectsData?.length || 0;
      console.log(`  ✅ Total projects: ${count.toLocaleString()}`);
    }
    console.log('');

    // 6. API Cost Tracking
    console.log('💰 API COSTS (Last 30 days):');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: costData, error: costError } = await supabase
      .from('api_costs')
      .select('cost_usd, model, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (costError) {
      console.log('  ❌ Error:', costError.message);
    } else {
      const totalCost = costData?.reduce((sum, item) => sum + (item.cost_usd || 0), 0) || 0;
      const count = costData?.length || 0;

      console.log(`  ✅ Total API calls: ${count.toLocaleString()}`);
      console.log(`  ✅ Total cost: $${totalCost.toFixed(2)}`);
      console.log(`  ✅ Average per call: $${(totalCost / (count || 1)).toFixed(4)}`);
      console.log(`  ✅ Daily average: $${(totalCost / 30).toFixed(2)}`);
    }
    console.log('');

    // 7. TOTAL STORAGE SUMMARY
    console.log('='.repeat(80));
    console.log('TOTAL STORAGE IN SUPABASE:');

    const kbSize = kbData?.reduce((sum, item) => {
      const contentSize = (item.content || '').length;
      const metadataSize = JSON.stringify(item.metadata || {}).length;
      return sum + contentSize + metadataSize;
    }, 0) || 0;

    const audioSize = audioData?.reduce((sum, item) => {
      const contentSize = (item.content || '').length;
      const metadataSize = JSON.stringify(item.metadata || {}).length;
      return sum + contentSize + metadataSize;
    }, 0) || 0;

    const messagesSize = messagesData?.reduce((sum, item) => {
      return sum + (item.content || '').length;
    }, 0) || 0;

    const totalSupabaseSize = kbSize + audioSize + messagesSize;
    const totalMB = (totalSupabaseSize / (1024 * 1024)).toFixed(2);
    const totalGB = (totalSupabaseSize / (1024 * 1024 * 1024)).toFixed(3);

    console.log(`  📊 Knowledge Base: ${(kbSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  📊 Audio Transcriptions: ${(audioSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  📊 Messages: ${(messagesSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  ➡️  TOTAL SUPABASE: ${totalMB} MB (${totalGB} GB)`);
    console.log('');
    console.log('  ⚠️  Note: This is TEXT storage only (embeddings not included)');
    console.log('  ⚠️  Embeddings add ~6KB per entry (vector indexes)');
    console.log('  ⚠️  Actual files stored in Google Drive (not counted here)');
    console.log('='.repeat(80));
    console.log('');

    // 8. GOOGLE DRIVE ESTIMATION
    console.log('📁 GOOGLE DRIVE STORAGE ESTIMATE:');
    console.log('  ℹ️  Based on knowledge base source types...');

    const driveFiles = kbData?.filter(item =>
      item.source_type === 'google_drive' ||
      item.source_type === 'drive'
    ).length || 0;

    const localFiles = kbData?.filter(item =>
      item.source_type === 'local_file'
    ).length || 0;

    console.log(`  📄 Drive files indexed: ${driveFiles.toLocaleString()}`);
    console.log(`  📄 Local files indexed: ${localFiles.toLocaleString()}`);
    console.log(`  ⚠️  Actual file sizes in Drive not accessible from here`);
    console.log(`  ⚠️  Check your Google Drive directly for total storage`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

analyzeStorageUsage();
