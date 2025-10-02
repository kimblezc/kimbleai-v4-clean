// Quick database connection test
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Connected! Found ${count} users`);
    process.exit(0);
  } catch (err: any) {
    console.log('❌ Exception:', err.message);
    process.exit(1);
  }
}

testConnection();
