// Check if Google access token in Supabase is expired
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkToken() {
  const { data, error } = await supabase
    .from('user_tokens')
    .select('*')
    .eq('user_id', 'zach')
    .single();

  if (error) {
    console.error('❌ Error fetching token:', error);
    return;
  }

  if (!data) {
    console.log('❌ No token found for user zach');
    return;
  }

  console.log('\n📊 Token Status:');
  console.log('━'.repeat(60));
  console.log(`User: ${data.user_id}`);
  console.log(`Email: ${data.email}`);
  console.log(`Updated: ${new Date(data.updated_at).toLocaleString()}`);
  console.log(`Expires at: ${data.expires_at} (Unix timestamp)`);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = data.expires_at;
  const secondsUntilExpiry = expiresAt - now;
  const minutesUntilExpiry = Math.floor(secondsUntilExpiry / 60);

  console.log(`\nCurrent time: ${now}`);
  console.log(`Seconds until expiry: ${secondsUntilExpiry}`);
  console.log(`Minutes until expiry: ${minutesUntilExpiry}`);

  if (secondsUntilExpiry < 0) {
    console.log(`\n❌ Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
  } else if (secondsUntilExpiry < 300) {
    console.log(`\n⚠️  Token expires in less than 5 minutes`);
  } else {
    console.log(`\n✅ Token is still valid`);
  }

  console.log(`\nHas refresh token: ${data.refresh_token ? 'Yes' : 'No'}`);
  console.log('━'.repeat(60));
}

checkToken();
