/**
 * Google API Integration Test Endpoint
 *
 * Comprehensive testing endpoint for all Google APIs (Drive, Gmail, Calendar).
 * Tests token refresh, API connectivity, and error handling.
 *
 * Usage:
 * GET /api/google/integration-test?userId=zach
 *
 * Returns detailed status report for:
 * - Token status (expires_at, refresh token availability)
 * - Drive API connectivity
 * - Gmail API connectivity
 * - Calendar API connectivity
 * - Token refresh functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken, getTokenStatus } from '@/lib/google-token-refresh';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  service: string;
  status: 'success' | 'failed' | 'error';
  message: string;
  details?: any;
  error?: string;
  duration?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'zach';

  console.log(`[INTEGRATION-TEST] Starting comprehensive test for user: ${userId}`);

  const results: TestResult[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Check token status
    console.log('[INTEGRATION-TEST] Step 1: Checking token status...');
    const tokenStatusStart = Date.now();
    const tokenStatus = await getTokenStatus(userId);
    results.push({
      service: 'Token Status',
      status: tokenStatus.hasToken && tokenStatus.hasRefreshToken ? 'success' : 'failed',
      message: tokenStatus.isExpired ? 'Token expired, will attempt refresh' : 'Token valid',
      details: {
        hasToken: tokenStatus.hasToken,
        hasRefreshToken: tokenStatus.hasRefreshToken,
        expiresAt: tokenStatus.expiresAt,
        isExpired: tokenStatus.isExpired,
        expiresInMinutes: tokenStatus.expiresInMinutes
      },
      duration: Date.now() - tokenStatusStart
    });

    // Step 2: Get valid access token (tests refresh)
    console.log('[INTEGRATION-TEST] Step 2: Getting valid access token...');
    const tokenRefreshStart = Date.now();
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      results.push({
        service: 'Token Refresh',
        status: 'failed',
        message: 'Failed to get valid access token',
        error: 'User needs to re-authenticate',
        duration: Date.now() - tokenRefreshStart
      });

      return NextResponse.json({
        success: false,
        userId,
        totalTests: results.length,
        passed: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        errors: results.filter(r => r.status === 'error').length,
        results,
        duration: Date.now() - startTime,
        recommendation: 'User needs to sign in again to grant fresh tokens'
      });
    }

    results.push({
      service: 'Token Refresh',
      status: 'success',
      message: 'Successfully obtained valid access token',
      details: {
        tokenLength: accessToken.length,
        tokenPreview: `${accessToken.substring(0, 20)}...`
      },
      duration: Date.now() - tokenRefreshStart
    });

    // Get refresh token for OAuth client
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single();

    // Initialize OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokenData?.refresh_token
    });

    // Step 3: Test Drive API
    console.log('[INTEGRATION-TEST] Step 3: Testing Drive API...');
    const driveStart = Date.now();
    try {
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const driveResponse = await drive.files.list({
        pageSize: 5,
        fields: 'files(id, name, mimeType)'
      });

      results.push({
        service: 'Google Drive API',
        status: 'success',
        message: `Successfully listed ${driveResponse.data.files?.length || 0} files`,
        details: {
          filesFound: driveResponse.data.files?.length || 0,
          files: driveResponse.data.files?.map(f => ({ id: f.id, name: f.name, type: f.mimeType }))
        },
        duration: Date.now() - driveStart
      });
    } catch (error: any) {
      console.error('[INTEGRATION-TEST] Drive API error:', error);
      results.push({
        service: 'Google Drive API',
        status: 'error',
        message: 'Drive API call failed',
        error: error.message,
        details: {
          code: error.code,
          status: error.status
        },
        duration: Date.now() - driveStart
      });
    }

    // Step 4: Test Gmail API
    console.log('[INTEGRATION-TEST] Step 4: Testing Gmail API...');
    const gmailStart = Date.now();
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const gmailResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
        labelIds: ['INBOX']
      });

      results.push({
        service: 'Gmail API',
        status: 'success',
        message: `Successfully listed ${gmailResponse.data.messages?.length || 0} messages`,
        details: {
          messagesFound: gmailResponse.data.messages?.length || 0,
          resultSizeEstimate: gmailResponse.data.resultSizeEstimate
        },
        duration: Date.now() - gmailStart
      });
    } catch (error: any) {
      console.error('[INTEGRATION-TEST] Gmail API error:', error);
      results.push({
        service: 'Gmail API',
        status: 'error',
        message: 'Gmail API call failed',
        error: error.message,
        details: {
          code: error.code,
          status: error.status
        },
        duration: Date.now() - gmailStart
      });
    }

    // Step 5: Test Calendar API
    console.log('[INTEGRATION-TEST] Step 5: Testing Calendar API...');
    const calendarStart = Date.now();
    try {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime'
      });

      results.push({
        service: 'Google Calendar API',
        status: 'success',
        message: `Successfully listed ${calendarResponse.data.items?.length || 0} upcoming events`,
        details: {
          eventsFound: calendarResponse.data.items?.length || 0,
          events: calendarResponse.data.items?.map(e => ({
            id: e.id,
            summary: e.summary,
            start: e.start?.dateTime || e.start?.date
          }))
        },
        duration: Date.now() - calendarStart
      });
    } catch (error: any) {
      console.error('[INTEGRATION-TEST] Calendar API error:', error);
      results.push({
        service: 'Google Calendar API',
        status: 'error',
        message: 'Calendar API call failed',
        error: error.message,
        details: {
          code: error.code,
          status: error.status
        },
        duration: Date.now() - calendarStart
      });
    }

    // Calculate summary statistics
    const totalTests = results.length;
    const passed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    const allPassed = passed === totalTests;

    console.log(`[INTEGRATION-TEST] Completed: ${passed}/${totalTests} tests passed`);

    return NextResponse.json({
      success: allPassed,
      userId,
      timestamp: new Date().toISOString(),
      totalTests,
      passed,
      failed,
      errors,
      results,
      duration: Date.now() - startTime,
      summary: allPassed
        ? 'All Google API integrations working correctly'
        : `${errors + failed} integration(s) failed`,
      recommendation: allPassed
        ? 'No action needed'
        : errors > 0
        ? 'Check API errors above for specific issues'
        : 'User may need to re-authenticate'
    });

  } catch (error: any) {
    console.error('[INTEGRATION-TEST] Fatal error:', error);
    return NextResponse.json({
      success: false,
      userId,
      timestamp: new Date().toISOString(),
      error: 'Integration test failed',
      details: error.message,
      results,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
