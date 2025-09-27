import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { WorkspaceMemorySystem } from '../memory-system';

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

    // Initialize and test the Workspace Memory System
    console.log('Starting Google Workspace Memory System Test...');
    const memorySystem = new WorkspaceMemorySystem(drive);

    // Run comprehensive test
    const testResult = await memorySystem.testWithCurrentAccess(userId);

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Google Workspace Memory System test completed successfully!',
        results: {
          folderId: testResult.folderId,
          testMemoryId: testResult.testMemoryId,
          compressionStats: testResult.compressionStats
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error,
        message: 'Workspace Memory System test failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Workspace Memory Test Error:', error);
    return NextResponse.json({
      error: 'Failed to test Workspace Memory System',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Google Workspace Memory System Test Endpoint',
    description: 'POST to run comprehensive test with current Google API access',
    endpoints: {
      test: 'POST /api/google/workspace/test'
    }
  });
}