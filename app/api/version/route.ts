// Public version endpoint - no authentication required
import { NextResponse } from 'next/server';
import versionData from '@/version.json';

export async function GET() {
  return NextResponse.json({
    version: versionData.version,
    commit: versionData.commit,
    lastUpdated: versionData.lastUpdated,
    changelog: versionData.changelog,
    platform: versionData.platform,
    timestamp: new Date().toISOString()
  });
}
