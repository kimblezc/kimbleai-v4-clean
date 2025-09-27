import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId = 'zach' } = await request.json();

    // Get user's Google token
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({
        error: 'User not authenticated with Google'
      }, { status: 401 });
    }

    // Initialize Google Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Check storage quota and usage
    const aboutResponse = await drive.about.get({
      fields: 'storageQuota,user'
    });

    const storageQuota = aboutResponse.data.storageQuota;
    const user = aboutResponse.data.user;

    // Calculate storage stats
    const quotaTotal = parseInt(storageQuota?.limit || '0');
    const quotaUsed = parseInt(storageQuota?.usage || '0');
    const quotaAvailable = quotaTotal - quotaUsed;

    // Convert bytes to readable format
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Check for KimbleAI folders
    const kimbleAIFolders = await drive.files.list({
      q: "name='KimbleAI-Memory' and mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name, size, createdTime, modifiedTime)',
      pageSize: 10
    });

    // Calculate KimbleAI usage if folders exist
    let kimbleAIUsage = 0;
    const folderDetails = [];

    for (const folder of kimbleAIFolders.data.files || []) {
      // Get files in this folder
      const folderFiles = await drive.files.list({
        q: `'${folder.id}' in parents`,
        fields: 'files(name, size, mimeType, modifiedTime)',
        pageSize: 100
      });

      let folderSize = 0;
      for (const file of folderFiles.data.files || []) {
        folderSize += parseInt(file.size || '0');
      }

      kimbleAIUsage += folderSize;
      folderDetails.push({
        id: folder.id,
        name: folder.name,
        created: folder.createdTime,
        modified: folder.modifiedTime,
        fileCount: folderFiles.data.files?.length || 0,
        size: formatBytes(folderSize)
      });
    }

    // Test write permissions by creating a small test file
    let writeTest = { success: false, message: '' };
    try {
      const testFile = await drive.files.create({
        resource: {
          name: 'kimbleai-write-test.txt'
        },
        media: {
          mimeType: 'text/plain',
          body: 'KimbleAI write test - ' + new Date().toISOString()
        },
        fields: 'id, name'
      });

      // Delete the test file immediately
      await drive.files.delete({
        fileId: testFile.data.id!
      });

      writeTest = { success: true, message: 'Write permissions confirmed' };
    } catch (error: any) {
      writeTest = { success: false, message: error.message };
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user?.emailAddress,
        name: user?.displayName
      },
      storage: {
        total: formatBytes(quotaTotal),
        used: formatBytes(quotaUsed),
        available: formatBytes(quotaAvailable),
        usagePercent: Math.round((quotaUsed / quotaTotal) * 100),
        raw: {
          totalBytes: quotaTotal,
          usedBytes: quotaUsed,
          availableBytes: quotaAvailable
        }
      },
      kimbleAI: {
        foldersFound: kimbleAIFolders.data.files?.length || 0,
        totalUsage: formatBytes(kimbleAIUsage),
        usageBytes: kimbleAIUsage,
        folders: folderDetails
      },
      permissions: writeTest,
      workspaceStatus: {
        isWorkspace: quotaTotal > 17179869184, // > 16GB suggests Workspace
        estimatedType: quotaTotal > 2199023255552 ? 'Business Plus (2TB+)' :
                      quotaTotal > 1099511627776 ? 'Business Standard (1TB)' :
                      quotaTotal > 107374182400 ? 'Business Starter (100GB)' :
                      'Personal (15GB)'
      }
    });

  } catch (error: any) {
    console.error('Storage check error:', error);
    return NextResponse.json({
      error: 'Failed to check Google Workspace storage',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Google Workspace Storage Check',
    description: 'POST to check storage quota, usage, and KimbleAI folder usage',
    endpoints: {
      check: 'POST /api/google/workspace/storage-check'
    }
  });
}