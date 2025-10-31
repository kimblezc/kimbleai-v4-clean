import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupConversations() {
  console.log('🗑️  Starting conversation cleanup...');

  // Get user ID for 'zach' (try multiple fields)
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, email')
    .or('name.ilike.%zach%,email.ilike.%zach%');

  if (userError || !users || users.length === 0) {
    console.error('❌ User not found:', userError);
    console.log('💡 Trying to query all users...');

    // If that fails, just get all conversations without user filter
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(5);

    console.log('Available users:', allUsers);
    return;
  }

  const user = users[0];

  console.log(`✅ Found user: ${user.id}`);

  // Get all conversations
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', user.id);

  if (conversationsError) {
    console.error('❌ Error fetching conversations:', conversationsError);
    return;
  }

  console.log(`📋 Found ${conversations?.length || 0} conversations`);

  if (!conversations || conversations.length === 0) {
    console.log('✅ No conversations to clean up');
    return;
  }

  // Delete all conversations
  for (const conv of conversations) {
    console.log(`  Deleting: ${conv.id} - "${conv.title || 'Untitled'}"`);

    // Delete messages first
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conv.id)
      .eq('user_id', user.id);

    if (messagesError) {
      console.error(`    ❌ Error deleting messages: ${messagesError.message}`);
    }

    // Delete conversation
    const { error: convError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conv.id)
      .eq('user_id', user.id);

    if (convError) {
      console.error(`    ❌ Error deleting conversation: ${convError.message}`);
    } else {
      console.log(`    ✅ Deleted successfully`);
    }
  }

  console.log('🎉 Cleanup complete!');
}

cleanupConversations().catch(console.error);
