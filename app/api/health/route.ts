/**
 * Health Check Endpoint
 *
 * Used by Railway for deployment health checks and automated verification.
 * Returns comprehensive status for monitoring.
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  // Check required environment variables
  const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
  };

  const allPresent = Object.values(requiredEnvVars).every(v => v === true);

  // Read version info
  let versionInfo = { version: 'unknown', commit: 'unknown' };
  try {
    const versionPath = path.join(process.cwd(), 'version.json');
    if (fs.existsSync(versionPath)) {
      versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    }
  } catch {
    // Use defaults
  }

  const responseTime = Date.now() - startTime;

  return NextResponse.json({
    status: allPresent ? 'ok' : 'degraded',
    healthy: allPresent,
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    version: versionInfo.version,
    commit: versionInfo.commit,
    environment: requiredEnvVars,
    services: {
      supabase: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL,
      openai: requiredEnvVars.OPENAI_API_KEY,
      anthropic: requiredEnvVars.ANTHROPIC_API_KEY,
      auth: requiredEnvVars.NEXTAUTH_SECRET && requiredEnvVars.GOOGLE_CLIENT_ID,
    },
  });
}
