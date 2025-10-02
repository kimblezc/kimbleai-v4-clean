/**
 * Pre-deployment environment variable validation
 *
 * This script validates all critical environment variables to prevent
 * hidden character bugs (like the AssemblyAI newline bug) and format issues.
 *
 * Run: npx ts-node scripts/validate-env.ts
 * Or add to package.json: "validate-env": "ts-node scripts/validate-env.ts"
 */

import { validateEnvironment } from '../lib/env-utils';

const requiredEnvVars = {
  // ========================================
  // CRITICAL: API Keys for External Services
  // ========================================

  ASSEMBLYAI_API_KEY: {
    required: true,
    pattern: /^[a-f0-9]{32}$/,
    errorMessage: 'AssemblyAI API key must be exactly 32 hexadecimal characters (no spaces, no newlines)'
  },

  OPENAI_API_KEY: {
    required: true,
    pattern: /^sk-[a-zA-Z0-9_-]{32,}$/,
    errorMessage: 'OpenAI API key must start with "sk-" followed by at least 32 characters'
  },

  // ========================================
  // HIGH PRIORITY: Database Credentials
  // ========================================

  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    pattern: /^https:\/\/.+\.supabase\.co$/,
    errorMessage: 'Supabase URL must be in format: https://your-project.supabase.co'
  },

  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    pattern: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    errorMessage: 'Supabase anon key must be a valid JWT (format: header.payload.signature)'
  },

  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    pattern: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    errorMessage: 'Supabase service role key must be a valid JWT (format: header.payload.signature)'
  },

  // ========================================
  // HIGH PRIORITY: OAuth Credentials
  // ========================================

  GOOGLE_CLIENT_ID: {
    required: true,
    pattern: /^.+\.apps\.googleusercontent\.com$/,
    errorMessage: 'Google Client ID must end with .apps.googleusercontent.com'
  },

  GOOGLE_CLIENT_SECRET: {
    required: true,
    minLength: 20,
    errorMessage: 'Google Client Secret must be at least 20 characters'
  },

  // ========================================
  // HIGH PRIORITY: NextAuth Configuration
  // ========================================

  NEXTAUTH_URL: {
    required: true,
    pattern: /^https:\/\//,
    errorMessage: 'NEXTAUTH_URL must start with https:// in production'
  },

  NEXTAUTH_SECRET: {
    required: true,
    minLength: 32,
    errorMessage: 'NEXTAUTH_SECRET must be at least 32 characters for security'
  },

  // ========================================
  // MEDIUM PRIORITY: Webhooks (Optional)
  // ========================================

  ZAPIER_WEBHOOK_URL: {
    required: false,
    pattern: /^https:\/\/hooks\.zapier\.com\//,
    errorMessage: 'Zapier webhook URL must start with https://hooks.zapier.com/'
  },

  ZAPIER_MEMORY_WEBHOOK_URL: {
    required: false,
    pattern: /^https:\/\/hooks\.zapier\.com\//,
    errorMessage: 'Zapier memory webhook URL must start with https://hooks.zapier.com/'
  },

  ZAPIER_WEBHOOK_SECRET: {
    required: false,
    minLength: 10,
    errorMessage: 'Zapier webhook secret should be at least 10 characters'
  }
};

console.log('\n🔍 Validating environment variables...\n');
console.log('This checks for:');
console.log('  - Missing required variables');
console.log('  - Hidden characters (newlines, tabs, spaces)');
console.log('  - Invalid formats (API key patterns, URLs, etc.)');
console.log('  - Length requirements\n');
console.log('━'.repeat(60) + '\n');

const { valid, errors } = validateEnvironment(requiredEnvVars);

if (!valid) {
  console.error('❌ VALIDATION FAILED\n');
  console.error(`Found ${errors.length} error(s):\n`);

  errors.forEach((error, index) => {
    console.error(`${index + 1}. ${error.varName}`);
    console.error(`   Issue: ${error.reason}`);
    if (error.value) {
      console.error(`   Value: ${error.value}`);
    }
    console.error('');
  });

  console.error('━'.repeat(60));
  console.error('\n💡 How to fix:\n');
  console.error('1. Check your .env.local file for these variables');
  console.error('2. In production, update Vercel environment variables');
  console.error('3. Make sure to use: echo -n "value" | vercel env add VAR_NAME');
  console.error('   (Note the -n flag to prevent newline characters)');
  console.error('4. Or paste values directly when prompted by: vercel env add VAR_NAME\n');

  process.exit(1);
}

console.log('✅ All environment variables validated successfully!\n');
console.log('━'.repeat(60) + '\n');
console.log('Environment is ready for:');
console.log('  ✓ API calls (AssemblyAI, OpenAI)');
console.log('  ✓ Database connections (Supabase)');
console.log('  ✓ OAuth flows (Google)');
console.log('  ✓ Authentication (NextAuth)');
console.log('  ✓ Webhooks (Zapier)\n');
console.log('You can now safely run: npm run dev or vercel deploy\n');

process.exit(0);
