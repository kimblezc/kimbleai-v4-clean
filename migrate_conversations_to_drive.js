// Automated migration script to move all conversations from Supabase to Google Drive
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateAllConversations() {
  console.log('🚀 Starting automated migration: Supabase → Google Drive');

  try {
    // Step 1: Get all conversations from Supabase
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('❌ Failed to fetch conversations:', convError);
      return;
    }

    console.log(`📊 Found ${conversations?.length || 0} conversations to migrate`);

    // Step 2: Get all messages and group by conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('❌ Failed to fetch messages:', msgError);
      return;
    }

    console.log(`📊 Found ${messages?.length || 0} messages to migrate`);

    // Step 3: Group messages by conversation
    const conversationMap = new Map();

    conversations?.forEach(conv => {
      conversationMap.set(conv.id, {
        ...conv,
        messages: messages?.filter(msg => msg.conversation_id === conv.id) || []
      });
    });

    console.log(`📦 Grouped into ${conversationMap.size} conversation files`);

    // Step 4: Check OAuth tokens for each user
    const { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('user_id, email, access_token')
      .not('access_token', 'is', null);

    if (tokenError || !tokens?.length) {
      console.log('⚠️  No valid OAuth tokens found. Users need to re-authenticate.');
      console.log('👉 Go to kimbleai.com and sign in with Google to refresh tokens');
      return;
    }

    console.log(`✅ Found OAuth tokens for ${tokens.length} users`);

    // Step 5: Migrate conversations for each user
    let successCount = 0;
    let failCount = 0;

    for (const [convId, conversation] of conversationMap) {
      try {
        // Find user by conversation
        const userId = conversation.user_id;
        const userToken = tokens.find(t => t.user_id === (userId === 1 ? 'zach' : 'rebecca'));

        if (!userToken) {
          console.log(`⚠️  No token for conversation ${convId}, skipping`);
          failCount++;
          continue;
        }

        // Format conversation for Google Drive storage
        const conversationData = {
          id: conversation.id,
          title: conversation.title || 'Untitled Conversation',
          project: 'migrated-from-supabase',
          messages: conversation.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at || msg.timestamp
          }))
        };

        // Call workspace API to store conversation
        const response = await fetch(`http://localhost:3003/api/google/workspace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'store_conversation',
            userId: userToken.user_id,
            conversation: conversationData
          })
        });

        const result = await response.json();

        if (result.success) {
          console.log(`✅ Migrated conversation: ${conversation.title}`);
          successCount++;
        } else {
          console.log(`❌ Failed to migrate: ${conversation.title} - ${result.error}`);
          failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error migrating conversation ${convId}:`, error.message);
        failCount++;
      }
    }

    console.log('\\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} conversations`);
    console.log(`❌ Failed migrations: ${failCount} conversations`);
    console.log(`📊 Total conversations: ${conversationMap.size}`);

    if (successCount > 0) {
      console.log('\\n🎉 Migration completed! New chat conversations will now be stored in Google Drive.');
      console.log('💡 You can verify the migration by visiting kimbleai.com/workspace');
    }

    if (failCount > 0) {
      console.log('\\n⚠️  Some conversations failed to migrate. This could be due to:');
      console.log('   - Expired OAuth tokens (users need to re-authenticate)');
      console.log('   - Network issues (try running the script again)');
      console.log('   - Google API quota limits (wait and retry)');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Function to check migration status
async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking migration status...');

    // Check Supabase data
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, title')
      .limit(10);

    console.log(`📊 Supabase conversations: ${conversations?.length || 0}`);

    // Check Google Drive storage status
    const driveResponse = await fetch('http://localhost:3003/api/google/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_stats',
        userId: 'zach'
      })
    });

    const driveStats = await driveResponse.json();

    if (driveStats.success) {
      console.log(`📊 Google Drive memories: ${driveStats.stats?.totalMemories || 0}`);
      console.log(`💾 Storage used: ${driveStats.stats?.storageUsed || 'Unknown'}`);
    } else {
      console.log('⚠️  Could not check Google Drive status:', driveStats.error);
    }

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

// Run based on command line argument
const command = process.argv[2];

if (command === 'status') {
  checkMigrationStatus();
} else if (command === 'migrate') {
  migrateAllConversations();
} else {
  console.log('📋 Usage:');
  console.log('  node migrate_conversations_to_drive.js status   # Check current status');
  console.log('  node migrate_conversations_to_drive.js migrate  # Run full migration');
  console.log('');
  console.log('⚠️  Before running migration, ensure:');
  console.log('   1. Users have fresh OAuth tokens (sign in at kimbleai.com)');
  console.log('   2. Dev server is running (npm run dev)');
  console.log('   3. Google Drive API is accessible');
}