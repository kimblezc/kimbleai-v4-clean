// Test script to verify chat persistence
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testChatPersistence() {
  console.log('🧪 Testing Chat Persistence...\n');

  try {
    // 1. Check if user exists
    console.log('1️⃣ Checking user...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('name', 'Zach')
      .single();

    if (userError) {
      console.error('❌ User fetch error:', userError);
      return;
    }

    console.log(`✅ User found: ${userData.name} (ID: ${userData.id})\n`);

    // 2. Check existing conversations
    console.log('2️⃣ Checking existing conversations...');
    const { data: existingConvs, error: convsError } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userData.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (convsError) {
      console.error('❌ Conversations fetch error:', convsError);
    } else {
      console.log(`✅ Found ${existingConvs?.length || 0} conversations`);
      existingConvs?.forEach(conv => {
        console.log(`  - ${conv.id}: "${conv.title}" (Updated: ${new Date(conv.updated_at).toLocaleString()})`);
      });
      console.log('');
    }

    // 3. Check existing messages
    console.log('3️⃣ Checking existing messages...');
    const { data: existingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      console.error('❌ Messages fetch error:', messagesError);
    } else {
      console.log(`✅ Found ${existingMessages?.length || 0} messages`);
      existingMessages?.forEach(msg => {
        const preview = msg.content.substring(0, 50).replace(/\n/g, ' ');
        console.log(`  - [${msg.role}] ${preview}... (${new Date(msg.created_at).toLocaleString()})`);
      });
      console.log('');
    }

    // 4. Test creating a new conversation
    console.log('4️⃣ Testing conversation creation...');
    const testConvId = `test-conv-${Date.now()}`;
    const { data: newConv, error: createConvError } = await supabase
      .from('conversations')
      .upsert({
        id: testConvId,
        user_id: userData.id,
        title: 'Test Conversation for Debugging',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createConvError) {
      console.error('❌ Conversation creation error:', createConvError);
      console.error('Error details:', JSON.stringify(createConvError, null, 2));
    } else {
      console.log(`✅ Conversation created: ${newConv.id}`);
    }

    // 5. Test creating messages
    console.log('\n5️⃣ Testing message creation...');

    const testUserMsg = {
      conversation_id: testConvId,
      user_id: userData.id,
      role: 'user',
      content: 'This is a test user message',
      embedding: null
    };

    const { data: userMsg, error: userMsgError } = await supabase
      .from('messages')
      .insert(testUserMsg)
      .select();

    if (userMsgError) {
      console.error('❌ User message creation error:', userMsgError);
      console.error('Error details:', JSON.stringify(userMsgError, null, 2));
    } else {
      console.log(`✅ User message created: ${userMsg[0].id}`);
    }

    const testAiMsg = {
      conversation_id: testConvId,
      user_id: userData.id,
      role: 'assistant',
      content: 'This is a test assistant message',
      embedding: null
    };

    const { data: aiMsg, error: aiMsgError } = await supabase
      .from('messages')
      .insert(testAiMsg)
      .select();

    if (aiMsgError) {
      console.error('❌ Assistant message creation error:', aiMsgError);
      console.error('Error details:', JSON.stringify(aiMsgError, null, 2));
    } else {
      console.log(`✅ Assistant message created: ${aiMsg[0].id}`);
    }

    // 6. Verify the test data was created
    console.log('\n6️⃣ Verifying test data...');
    const { data: verifyConv, error: verifyConvError } = await supabase
      .from('conversations')
      .select('id, title, messages(id, role, content)')
      .eq('id', testConvId)
      .single();

    if (verifyConvError) {
      console.error('❌ Verification error:', verifyConvError);
    } else {
      console.log(`✅ Verified conversation: ${verifyConv.id}`);
      console.log(`   Messages: ${verifyConv.messages?.length || 0}`);
    }

    // 7. Clean up test data
    console.log('\n7️⃣ Cleaning up test data...');
    await supabase.from('messages').delete().eq('conversation_id', testConvId);
    await supabase.from('conversations').delete().eq('id', testConvId);
    console.log('✅ Test data cleaned up');

    // 8. Check database schema
    console.log('\n8️⃣ Checking table schemas...');
    const { data: messagesSchema, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'messages' })
      .catch(() => ({ data: null, error: 'RPC function not available' }));

    if (messagesSchema) {
      console.log('Messages table columns:', messagesSchema);
    }

    console.log('\n✅ Chat persistence test complete!');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Error stack:', error.stack);
  }
}

testChatPersistence();
