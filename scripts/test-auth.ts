/**
 * Authentication System Test Script
 *
 * This script verifies the authentication configuration is correct.
 * Run with: npx tsx scripts/test-auth.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { authOptions } from '../app/api/auth/[...nextauth]/route';

console.log('🔐 Testing Authentication Configuration\n');
console.log('='.repeat(60));

// Test 1: Check authOptions exists
console.log('\n✅ Test 1: authOptions exported');
console.log('   - authOptions:', authOptions ? 'Found' : 'Missing');

// Test 2: Check providers
console.log('\n✅ Test 2: Providers configured');
console.log('   - Providers count:', authOptions.providers?.length || 0);
console.log('   - Provider type:', authOptions.providers?.[0]?.id || 'Unknown');

// Test 3: Check session strategy
console.log('\n✅ Test 3: Session configuration');
console.log('   - Strategy:', authOptions.session?.strategy || 'Not set');
console.log('   - Max age:', authOptions.session?.maxAge || 'Default');

// Test 4: Check pages configuration
console.log('\n✅ Test 4: Custom pages');
console.log('   - Sign-in page:', authOptions.pages?.signIn || 'Default');
console.log('   - Error page:', authOptions.pages?.error || 'Default');

// Test 5: Check callbacks
console.log('\n✅ Test 5: Callbacks');
console.log('   - signIn callback:', authOptions.callbacks?.signIn ? 'Configured' : 'Missing');
console.log('   - jwt callback:', authOptions.callbacks?.jwt ? 'Configured' : 'Missing');
console.log('   - session callback:', authOptions.callbacks?.session ? 'Configured' : 'Missing');

// Test 6: Check environment variables
console.log('\n✅ Test 6: Environment Variables');
console.log('   - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : '❌ MISSING');
console.log('   - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : '❌ MISSING');
console.log('   - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ MISSING');
console.log('   - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : '❌ MISSING');

// Test 7: Check secret
console.log('\n✅ Test 7: NextAuth Secret');
const secretConfigured = authOptions.secret || process.env.NEXTAUTH_SECRET;
console.log('   - Secret configured:', secretConfigured ? 'Yes' : '❌ MISSING');

// Test 8: Test authorized emails check (simulated)
console.log('\n✅ Test 8: Email Authorization (Simulated)');
const testEmails = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com',
  'unauthorized@example.com'
];

const AUTHORIZED_EMAILS = [
  'zach.kimble@gmail.com',
  'becky.aza.kimble@gmail.com'
];

testEmails.forEach(email => {
  const isAuthorized = AUTHORIZED_EMAILS.some(
    authorizedEmail => authorizedEmail.toLowerCase() === email.toLowerCase()
  );
  console.log(`   - ${email}: ${isAuthorized ? '✅ Authorized' : '❌ Blocked'}`);
});

console.log('\n' + '='.repeat(60));

// Final summary
const allChecks = [
  authOptions !== undefined,
  authOptions.providers?.length > 0,
  authOptions.session?.strategy === 'jwt',
  authOptions.pages?.signIn !== undefined,
  authOptions.callbacks?.signIn !== undefined,
  authOptions.callbacks?.jwt !== undefined,
  authOptions.callbacks?.session !== undefined,
  process.env.GOOGLE_CLIENT_ID !== undefined,
  process.env.GOOGLE_CLIENT_SECRET !== undefined,
  process.env.NEXTAUTH_URL !== undefined,
  process.env.NEXTAUTH_SECRET !== undefined,
  (authOptions.secret || process.env.NEXTAUTH_SECRET) !== undefined
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log('\n📊 Summary:');
console.log(`   - Passed: ${passedChecks}/${totalChecks} checks`);

if (passedChecks === totalChecks) {
  console.log('\n✅ All checks passed! Authentication is properly configured.\n');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please review the configuration.\n');
  process.exit(1);
}
