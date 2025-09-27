// Migration script to move data from Supabase to Google Drive
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateData() {
  console.log('🚀 Starting migration from Supabase to Google Drive...');

  try {
    // Step 1: Check current Supabase data
    console.log('\n📊 Checking current Supabase data...');

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: false });

    console.log(`Found ${conversations?.length || 0} conversations`);
    console.log(`Found ${messages?.length || 0} messages`);

    // Step 2: Check for user tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('user_id, email')
      .limit(5);

    if (tokenError) {
      console.log('❌ user_tokens table missing - need to create it first');
      console.log('Run the create_user_tokens_table.sql in Supabase SQL editor');
      return;
    }

    console.log(`Found ${tokens?.length || 0} OAuth tokens`);

    // Step 3: Group messages by conversation
    const conversationMap = new Map();

    conversations?.forEach(conv => {
      conversationMap.set(conv.id, {
        ...conv,
        messages: messages?.filter(msg => msg.conversation_id === conv.id) || []
      });
    });

    console.log('\n📦 Migration Summary:');
    console.log(`- Total conversations to migrate: ${conversationMap.size}`);

    conversationMap.forEach((conv, id) => {
      console.log(`  - ${conv.title}: ${conv.messages.length} messages`);
    });

    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Create user_tokens table in Supabase (run create_user_tokens_table.sql)');
    console.log('2. Log into kimbleai.com to populate OAuth tokens');
    console.log('3. Run migration API calls to move data to Google Drive');
    console.log('4. Update chat system to use Google Drive instead of Supabase');

  } catch (error) {
    console.error('❌ Migration check failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };