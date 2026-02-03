/**
 * Version API Endpoint
 *
 * Returns version and commit information
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read version.json from project root
    const versionPath = path.join(process.cwd(), 'version.json');
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

    return NextResponse.json({
      version: versionData.version || process.env.NEXT_PUBLIC_APP_VERSION || '11.4.0',
      commit: versionData.commit || 'unknown',
      lastUpdated: versionData.lastUpdated,
      changelog: versionData.changelog,
    });
  } catch (error) {
    console.error('Failed to read version.json:', error);
    return NextResponse.json({
      version: process.env.NEXT_PUBLIC_APP_VERSION || '11.4.0',
      commit: 'unknown',
    });
  }
}
