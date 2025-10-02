require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Get a sample message to see the columns
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .limit(1);
  
  console.log('Message columns:', messages?.[0] ? Object.keys(messages[0]) : 'No messages');
  
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .limit(1);
  
  console.log('Conversation columns:', conversations?.[0] ? Object.keys(conversations[0]) : 'No conversations');
}

checkSchema();
