// Check existing conversations and their structure
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkConversations() {
  console.log('🔍 Checking Conversations Status...\n');

  try {
    // Get user
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('name', 'Zach')
      .single();

    console.log(`✅ User: ${userData.name} (ID: ${userData.id})\n`);

    // Check all conversations
    console.log('📊 Checking ALL conversations...');
    const { data: allConvs, error: allError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userData.id);

    if (allError) {
      console.error('❌ Error:', allError);
    } else {
      console.log(`Found ${allConvs?.length || 0} total conversations\n`);

      if (allConvs && allConvs.length > 0) {
        console.log('Conversation details:');
        allConvs.forEach((conv, index) => {
          console.log(`\n${index + 1}. Conversation ID: ${conv.id}`);
          console.log(`   Title: ${conv.title || 'NO TITLE'}`);
          console.log(`   User ID: ${conv.user_id}`);
          console.log(`   Updated: ${conv.updated_at || 'NO updated_at'}`);
          console.log(`   Created: ${conv.created_at || 'NO created_at'}`);
          console.log(`   All fields:`, Object.keys(conv));
        });
      }
    }

    // Now check messages without conversations
    console.log('\n\n📝 Checking messages WITHOUT conversations...');
    const { data: allMessages, error: msgError } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    if (msgError) {
      console.error('❌ Error:', msgError);
    } else {
      console.log(`Found ${allMessages?.length || 0} total messages\n`);

      // Group messages by conversation_id
      const convGroups = new Map<string, number>();
      allMessages?.forEach(msg => {
        const count = convGroups.get(msg.conversation_id) || 0;
        convGroups.set(msg.conversation_id, count + 1);
      });

      console.log(`Messages grouped by ${convGroups.size} unique conversation IDs:\n`);
      convGroups.forEach((count, convId) => {
        console.log(`  - ${convId}: ${count} messages`);
      });

      // Check which conversation IDs from messages exist in conversations table
      console.log('\n\n🔗 Checking if message conversation_ids exist in conversations table...');
      const convIds = Array.from(convGroups.keys());
      const { data: existingConvs } = await supabase
        .from('conversations')
        .select('id')
        .in('id', convIds);

      const existingConvIds = new Set(existingConvs?.map(c => c.id) || []);

      console.log(`\nConversations that EXIST in conversations table: ${existingConvIds.size}`);
      existingConvIds.forEach(id => console.log(`  ✅ ${id}`));

      console.log(`\nConversations that DO NOT EXIST in conversations table: ${convIds.length - existingConvIds.size}`);
      convIds.filter(id => !existingConvIds.has(id)).forEach(id => {
        const msgCount = convGroups.get(id);
        console.log(`  ❌ ${id} (has ${msgCount} orphaned messages!)`);
      });
    }

    // Test the exact query used by the API
    console.log('\n\n🧪 Testing API query...');
    const { data: apiQueryResult, error: apiError } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        user_id,
        messages(id, content, role, created_at)
      `)
      .eq('user_id', userData.id)
      .order('id', { ascending: false })
      .limit(20);

    if (apiError) {
      console.error('❌ API query error:', apiError);
    } else {
      console.log(`✅ API query returned ${apiQueryResult?.length || 0} conversations`);
      apiQueryResult?.forEach(conv => {
        console.log(`  - ${conv.id}: "${conv.title}" (${conv.messages?.length || 0} messages)`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

checkConversations();
