import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { folderId } = await request.json();

    // Get user's Google tokens
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', 'zach')
      .single();

    if (!tokenData) {
      return NextResponse.json({
        success: false,
        error: 'No Google Drive access token found'
      }, { status: 401 });
    }

    // Initialize Google Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // List all files in the folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, modifiedTime, createdTime)',
      pageSize: 1000
    });

    const files = response.data.files || [];

    // Analyze file statistics
    const analysis = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + (parseInt(f.size || '0')), 0),
      fileTypes: {} as Record<string, number>,
      largeFiles: files.filter(f => parseInt(f.size || '0') > 100 * 1024 * 1024).length, // >100MB
      oldFiles: files.filter(f => {
        const modTime = new Date(f.modifiedTime || '');
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return modTime < sixMonthsAgo;
      }).length,
      recentFiles: files.filter(f => {
        const modTime = new Date(f.modifiedTime || '');
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return modTime > oneWeekAgo;
      }).length
    };

    // Count file types
    files.forEach(file => {
      const type = file.mimeType || 'unknown';
      analysis.fileTypes[type] = (analysis.fileTypes[type] || 0) + 1;
    });

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    const summary = `Analyzed ${analysis.totalFiles} files (${formatBytes(analysis.totalSize)}). ` +
      `Found ${analysis.largeFiles} large files (>100MB), ` +
      `${analysis.oldFiles} files older than 6 months, ` +
      `${analysis.recentFiles} files modified in the last week.`;

    return NextResponse.json({
      success: true,
      summary,
      analysis
    });

  } catch (error: any) {
    console.error('[Drive Analyze] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
