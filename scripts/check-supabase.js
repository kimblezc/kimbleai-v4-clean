require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('Using SUPABASE URL:', !!url);
  console.log('Using SERVICE ROLE KEY:', !!key);
  if (!url || !key) {
    console.error('Missing SUPABASE envs');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  try {
    const { data, error } = await supabase.from('users').select('id, name').limit(5);
    if (error) {
      console.error('Supabase select error:', error);
      process.exit(1);
    }
    console.log('Users sample:', data);
  } catch (e) {
    console.error('Exception querying supabase:', e);
    process.exit(1);
  }
})();
