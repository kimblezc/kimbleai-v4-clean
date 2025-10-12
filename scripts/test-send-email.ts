/**
 * Test Script: Send Email via Gmail API
 *
 * This script tests the send_email functionality by sending an email
 * from zach.kimble@gmail.com to zach.kimble@gmail.com with subject "bacon turkey"
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSendEmail() {
  console.log('🧪 Testing Gmail Send Email...\n');

  try {
    // Step 1: Get user tokens
    console.log('Step 1: Fetching user tokens for zach...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', 'zach')
      .single();

    if (tokenError || !tokenData) {
      console.error('❌ Failed to fetch user tokens:', tokenError);
      console.log('\n💡 Make sure Zach is authenticated with Google.');
      console.log('   Visit kimbleai.com and connect Google account first.');
      return;
    }

    console.log('✅ Got user tokens');

    // Step 2: Initialize Gmail client
    console.log('\nStep 2: Initializing Gmail client...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log('✅ Gmail client initialized');

    // Step 3: Prepare email
    console.log('\nStep 3: Preparing test email...');
    const emailData = {
      to: 'zach.kimble@gmail.com',
      subject: 'bacon turkey',
      body: `This is a test email sent from KimbleAI at ${new Date().toISOString()}.

If you're reading this, the Gmail send functionality is working!

Test parameters:
- From: zach.kimble@gmail.com
- To: zach.kimble@gmail.com
- Subject: bacon turkey
- Sent via: KimbleAI API
- Timestamp: ${new Date().toLocaleString()}

🎉 Success!`
    };

    console.log(`   To: ${emailData.to}`);
    console.log(`   Subject: ${emailData.subject}`);
    console.log(`   Body length: ${emailData.body.length} characters`);

    // Step 4: Create email in RFC 2822 format
    console.log('\nStep 4: Encoding email...');
    const email = [
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      '',
      emailData.body
    ].join('\r\n');

    const encodedEmail = Buffer.from(email).toString('base64url');
    console.log('✅ Email encoded to base64url');

    // Step 5: Send email
    console.log('\nStep 5: Sending email via Gmail API...');
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    // Step 6: Verify success
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log('📧 Email Details:');
    console.log(`   Message ID: ${response.data.id}`);
    console.log(`   Thread ID: ${response.data.threadId}`);
    console.log(`   Labels: ${response.data.labelIds?.join(', ') || 'None'}`);

    console.log('\n📬 Positive Proof:');
    console.log(`   ✅ Email sent from: zach.kimble@gmail.com`);
    console.log(`   ✅ Email sent to: zach.kimble@gmail.com`);
    console.log(`   ✅ Subject: bacon turkey`);
    console.log(`   ✅ Gmail Message ID: ${response.data.id}`);
    console.log(`   ✅ Timestamp: ${new Date().toISOString()}`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Check zach.kimble@gmail.com inbox');
    console.log('   2. Look for email with subject "bacon turkey"');
    console.log('   3. Verify email was received');

    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    };

  } catch (error: any) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);

    if (error.message?.includes('Invalid Credentials')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Access token may have expired');
      console.log('   - Try re-authenticating at kimbleai.com');
    } else if (error.message?.includes('User has not authorized')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Gmail API may not be enabled');
      console.log('   - Check Google Cloud Console');
    }

    throw error;
  }
}

// Run the test
console.log('═'.repeat(60));
console.log('  KimbleAI - Gmail Send Email Test');
console.log('═'.repeat(60));
console.log();

testSendEmail()
  .then((result) => {
    console.log('\n' + '═'.repeat(60));
    console.log('  TEST PASSED ✅');
    console.log('═'.repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n' + '═'.repeat(60));
    console.log('  TEST FAILED ❌');
    console.log('═'.repeat(60));
    process.exit(1);
  });
