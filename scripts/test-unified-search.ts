/**
 * Unified Search Test Suite
 *
 * Comprehensive tests for all search sources:
 * - Gmail (Google API)
 * - Drive (Google API)
 * - Local files (database)
 * - Knowledge base (database)
 * - Calendar (Google API)
 *
 * Usage:
 *   npx tsx scripts/test-unified-search.ts [userId]
 *
 * Example:
 *   npx tsx scripts/test-unified-search.ts zach
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { getValidAccessToken, getTokenStatus } from '../lib/google-token-refresh';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  source: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  resultCount?: number;
  sampleResults?: any[];
  error?: string;
}

const results: TestResult[] = [];

function log(source: string, message: string) {
  console.log(`[${source}] ${message}`);
}

function logSuccess(source: string, message: string) {
  console.log(`\x1b[32m✓ [${source}] ${message}\x1b[0m`);
}

function logError(source: string, message: string) {
  console.log(`\x1b[31m✗ [${source}] ${message}\x1b[0m`);
}

function logWarning(source: string, message: string) {
  console.log(`\x1b[33m⚠ [${source}] ${message}\x1b[0m`);
}

/**
 * Test 1: Check Google OAuth tokens
 */
async function testGoogleAuth(userId: string): Promise<TestResult> {
  const source = 'Google Auth';
  log(source, 'Checking OAuth tokens...');

  try {
    const status = await getTokenStatus(userId);

    if (!status.hasToken) {
      return {
        source,
        status: 'FAIL',
        message: 'No access token found. User needs to authenticate.',
        error: 'User not authenticated'
      };
    }

    if (!status.hasRefreshToken) {
      return {
        source,
        status: 'FAIL',
        message: 'No refresh token found. User needs to re-authenticate.',
        error: 'No refresh token'
      };
    }

    if (status.isExpired) {
      log(source, 'Token expired, attempting refresh...');
      const newToken = await getValidAccessToken(userId);

      if (!newToken) {
        return {
          source,
          status: 'FAIL',
          message: 'Token expired and refresh failed. User needs to re-authenticate.',
          error: 'Token refresh failed'
        };
      }

      logSuccess(source, 'Token refreshed successfully');
    }

    logSuccess(source, `Token valid, expires in ${status.expiresInMinutes} minutes`);

    return {
      source,
      status: 'PASS',
      message: `Token valid, expires in ${status.expiresInMinutes} minutes`
    };

  } catch (error: any) {
    logError(source, error.message);
    return {
      source,
      status: 'FAIL',
      message: 'Authentication check failed',
      error: error.message
    };
  }
}

/**
 * Test 2: Gmail Search
 */
async function testGmailSearch(userId: string, query: string = 'test'): Promise<TestResult> {
  const source = 'Gmail';
  log(source, `Searching for: "${query}"`);

  try {
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return {
        source,
        status: 'FAIL',
        message: 'Failed to get valid access token',
        error: 'Token unavailable'
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 5
    });

    const messages = response.data.messages || [];
    const sampleResults = [];

    for (const message of messages.slice(0, 3)) {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date']
      });

      const headers = details.data.payload?.headers || [];
      sampleResults.push({
        id: message.id,
        subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
        from: headers.find(h => h.name === 'From')?.value || 'Unknown',
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: details.data.snippet || ''
      });
    }

    logSuccess(source, `Found ${messages.length} emails`);

    return {
      source,
      status: 'PASS',
      message: `Found ${messages.length} emails`,
      resultCount: messages.length,
      sampleResults
    };

  } catch (error: any) {
    logError(source, error.message);
    return {
      source,
      status: 'FAIL',
      message: 'Gmail search failed',
      error: error.message
    };
  }
}

/**
 * Test 3: Drive Search
 */
async function testDriveSearch(userId: string, query: string = 'test'): Promise<TestResult> {
  const source = 'Drive';
  log(source, `Searching for: "${query}"`);

  try {
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return {
        source,
        status: 'FAIL',
        message: 'Failed to get valid access token',
        error: 'Token unavailable'
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.list({
      q: `fullText contains '${query}' or name contains '${query}'`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
      pageSize: 5,
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];
    const sampleResults = files.slice(0, 3).map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      url: file.webViewLink
    }));

    logSuccess(source, `Found ${files.length} files`);

    return {
      source,
      status: 'PASS',
      message: `Found ${files.length} files`,
      resultCount: files.length,
      sampleResults
    };

  } catch (error: any) {
    logError(source, error.message);
    return {
      source,
      status: 'FAIL',
      message: 'Drive search failed',
      error: error.message
    };
  }
}

/**
 * Test 4: Local Files Search
 */
async function testLocalFilesSearch(userId: string, query: string = 'test'): Promise<TestResult> {
  const source = 'Local Files';
  log(source, `Searching for: "${query}"`);

  try {
    // Get user's UUID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return {
        source,
        status: 'FAIL',
        message: 'User not found in database',
        error: 'User not found'
      };
    }

    // Search indexed files
    const { data: files, error } = await supabase
      .from('indexed_files')
      .select('id, filename, file_type, file_size, full_text, indexed_at')
      .eq('user_id', userData.id)
      .or(`filename.ilike.%${query}%,full_text.ilike.%${query}%`)
      .limit(5);

    if (error) {
      throw error;
    }

    const resultCount = files?.length || 0;
    const sampleResults = files?.slice(0, 3).map(file => ({
      id: file.id,
      filename: file.filename,
      fileType: file.file_type,
      size: file.file_size,
      snippet: file.full_text?.substring(0, 200) || '',
      indexedAt: file.indexed_at
    })) || [];

    if (resultCount === 0) {
      logWarning(source, 'No files found. Database may be empty.');
    } else {
      logSuccess(source, `Found ${resultCount} files`);
    }

    return {
      source,
      status: resultCount > 0 ? 'PASS' : 'SKIP',
      message: resultCount > 0 ? `Found ${resultCount} files` : 'No files in database',
      resultCount,
      sampleResults
    };

  } catch (error: any) {
    logError(source, error.message);
    return {
      source,
      status: 'FAIL',
      message: 'Local files search failed',
      error: error.message
    };
  }
}

/**
 * Test 5: Knowledge Base Search
 */
async function testKnowledgeBaseSearch(userId: string, query: string = 'test'): Promise<TestResult> {
  const source = 'Knowledge Base';
  log(source, `Searching for: "${query}"`);

  try {
    // Get user's UUID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (!userData) {
      return {
        source,
        status: 'FAIL',
        message: 'User not found in database',
        error: 'User not found'
      };
    }

    // Search knowledge base
    const { data: knowledge, error } = await supabase
      .from('knowledge_base')
      .select('id, title, content, source_type, category, importance, created_at')
      .eq('user_id', userData.id)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(5)
      .order('importance', { ascending: false });

    if (error) {
      throw error;
    }

    const resultCount = knowledge?.length || 0;
    const sampleResults = knowledge?.slice(0, 3).map(item => ({
      id: item.id,
      title: item.title,
      sourceType: item.source_type,
      category: item.category,
      importance: item.importance,
      snippet: item.content?.substring(0, 200) || '',
      createdAt: item.created_at
    })) || [];

    if (resultCount === 0) {
      logWarning(source, 'No knowledge base entries found. Database may be empty.');
    } else {
      logSuccess(source, `Found ${resultCount} entries`);
    }

    return {
      source,
      status: resultCount > 0 ? 'PASS' : 'SKIP',
      message: resultCount > 0 ? `Found ${resultCount} entries` : 'No entries in database',
      resultCount,
      sampleResults
    };

  } catch (error: any) {
    logError(source, error.message);
    return {
      source,
      status: 'FAIL',
      message: 'Knowledge base search failed',
      error: error.message
    };
  }
}

/**
 * Test 6: Calendar Search
 */
async function testCalendarSearch(userId: string, query: string = 'test'): Promise<TestResult> {
  const source = 'Calendar';
  log(source, `Searching for: "${query}"`);

  try {
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return {
        source,
        status: 'FAIL',
        message: 'Failed to get valid access token',
        error: 'Token unavailable'
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      q: query,
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
    });

    const events = response.data.items || [];
    const sampleResults = events.slice(0, 3).map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description?.substring(0, 200) || ''
    }));

    logSuccess(source, `Found ${events.length} events`);

    return {
      source,
      status: 'PASS',
      message: `Found ${events.length} events`,
      resultCount: events.length,
      sampleResults
    };

  } catch (error: any) {
    logError(source, error.message);
    return {
      source,
      status: 'FAIL',
      message: 'Calendar search failed',
      error: error.message
    };
  }
}

/**
 * Test Unified Search API endpoint
 */
async function testUnifiedAPI(userId: string, query: string = 'test'): Promise<TestResult> {
  const source = 'Unified API';
  log(source, `Testing API endpoint with query: "${query}"`);

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/search/unified?q=${encodeURIComponent(query)}&userId=${userId}&sources=gmail,drive,local,kb`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    logSuccess(source, `API returned ${data.totalResults} total results`);

    return {
      source,
      status: 'PASS',
      message: `API returned ${data.totalResults} results`,
      resultCount: data.totalResults,
      sampleResults: [data.breakdown]
    };

  } catch (error: any) {
    logError(source, error.message);
    return {
      source,
      status: 'FAIL',
      message: 'Unified API test failed',
      error: error.message
    };
  }
}

/**
 * Print summary
 */
function printSummary(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('UNIFIED SEARCH TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
  console.log(`\x1b[33mSkipped: ${skipped}\x1b[0m\n`);

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
    const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';

    console.log(`${color}${icon} ${result.source}: ${result.message}\x1b[0m`);

    if (result.resultCount !== undefined) {
      console.log(`  Results: ${result.resultCount}`);
    }

    if (result.sampleResults && result.sampleResults.length > 0) {
      console.log(`  Sample results:`);
      result.sampleResults.forEach((sample, idx) => {
        console.log(`    ${idx + 1}. ${JSON.stringify(sample, null, 2).split('\n').join('\n       ')}`);
      });
    }

    if (result.error) {
      console.log(`  \x1b[31mError: ${result.error}\x1b[0m`);
    }

    console.log('');
  });

  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    console.log('\x1b[31mSome tests failed. Please review the errors above.\x1b[0m\n');
    process.exit(1);
  } else if (skipped > 0) {
    console.log('\x1b[33mSome tests were skipped. This is normal if databases are empty.\x1b[0m\n');
  } else {
    console.log('\x1b[32mAll tests passed! Unified search is working correctly.\x1b[0m\n');
  }
}

/**
 * Main test runner
 */
async function main() {
  const userId = process.argv[2] || 'zach';
  const query = process.argv[3] || 'test';

  console.log('\n' + '='.repeat(80));
  console.log('UNIFIED SEARCH TEST SUITE');
  console.log('='.repeat(80));
  console.log(`User: ${userId}`);
  console.log(`Query: "${query}"`);
  console.log('='.repeat(80) + '\n');

  // Run tests sequentially
  results.push(await testGoogleAuth(userId));
  results.push(await testGmailSearch(userId, query));
  results.push(await testDriveSearch(userId, query));
  results.push(await testLocalFilesSearch(userId, query));
  results.push(await testKnowledgeBaseSearch(userId, query));
  results.push(await testCalendarSearch(userId, query));
  results.push(await testUnifiedAPI(userId, query));

  // Print summary
  printSummary(results);
}

main().catch(console.error);
