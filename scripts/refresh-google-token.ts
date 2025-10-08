// Manually refresh Google access token using refresh token
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function refreshToken() {
  console.log('\n🔄 Refreshing Google Access Token...\n');

  // Get current token data
  const { data: tokenData, error } = await supabase
    .from('user_tokens')
    .select('*')
    .eq('user_id', 'zach')
    .single();

  if (error || !tokenData) {
    console.error('❌ Error fetching token from Supabase:', error);
    return;
  }

  if (!tokenData.refresh_token) {
    console.error('❌ No refresh token available');
    return;
  }

  console.log('✅ Found refresh token');
  console.log(`📧 User: ${tokenData.email}`);
  console.log(`⏰ Last updated: ${new Date(tokenData.updated_at).toLocaleString()}`);

  // Call Google OAuth token refresh endpoint
  console.log('\n🌐 Calling Google OAuth token endpoint...');

  try {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token
      })
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('❌ Token refresh failed:', errorText);
      return;
    }

    const refreshedTokens = await refreshResponse.json() as any;

    console.log('✅ Got new access token from Google');

    // Calculate new expiry time
    const expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in;
    const expiryDate = new Date(expiresAt * 1000);

    console.log(`⏱️  New token expires at: ${expiryDate.toLocaleString()}`);
    console.log(`⏱️  Valid for: ${Math.floor(refreshedTokens.expires_in / 60)} minutes`);

    // Update in Supabase
    console.log('\n💾 Updating Supabase...');
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({
        access_token: refreshedTokens.access_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', 'zach');

    if (updateError) {
      console.error('❌ Error updating Supabase:', updateError);
      return;
    }

    console.log('✅ Token successfully refreshed and stored!');
    console.log('\n━'.repeat(60));
    console.log('✨ New access token is now available for API requests');
    console.log('━'.repeat(60));

  } catch (error: any) {
    console.error('❌ Error refreshing token:', error.message);
  }
}

refreshToken();
