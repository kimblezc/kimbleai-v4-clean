require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Try to insert with minimal data to see what's required
  const { data, error } = await supabase
    .from('device_sessions')
    .select('*')
    .limit(1);

  console.log('Sample row:', data);
  console.log('Error:', error);
}

checkSchema();
