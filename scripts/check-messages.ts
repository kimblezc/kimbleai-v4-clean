import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMessages() {
  console.log('🔍 Checking database state...\n');

  // Get user
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .or('name.ilike.%zach%,email.ilike.%zach%')
    .limit(1);

  if (!users || users.length === 0) {
    console.error('❌ User not found');
    return;
  }

  const user = users[0];
  console.log(`✅ Found user: ${user.id}\n`);

  // Get conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10);

  console.log(`📋 Found ${conversations?.length || 0} conversations:\n`);

  if (conversations && conversations.length > 0) {
    for (const conv of conversations) {
      console.log(`  📁 ${conv.id}`);
      console.log(`     Title: "${conv.title}"`);
      console.log(`     Updated: ${new Date(conv.updated_at).toLocaleString()}`);

      // Get messages for this conversation
      const { data: messages } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      console.log(`     Messages: ${messages?.length || 0}`);

      if (messages && messages.length > 0) {
        messages.forEach((msg, i) => {
          const preview = msg.content.substring(0, 50).replace(/\n/g, ' ');
          console.log(`       ${i + 1}. [${msg.role}] ${preview}...`);
        });
      } else {
        console.log(`       ⚠️ No messages found!`);
      }

      console.log('');
    }
  } else {
    console.log('  (No conversations found)');
  }

  // Check total message count
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  console.log(`\n💬 Total messages for user: ${count}`);
}

checkMessages().catch(console.error);
