import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Drive Intelligence Debug Agent
 * Tests each step of the indexing process to identify failures
 */
export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    success: false,
    errors: []
  };

  try {
    // STEP 1: Check Supabase connection
    results.steps.push({ step: 1, name: 'Checking Supabase connection', status: 'running' });

    const { data: testQuery, error: testError } = await supabase
      .from('knowledge_base')
      .select('id')
      .limit(1);

    if (testError) {
      results.steps[0].status = 'failed';
      results.steps[0].error = testError.message;
      results.errors.push(`Supabase connection failed: ${testError.message}`);
    } else {
      results.steps[0].status = 'passed';
      results.steps[0].result = 'Supabase connected successfully';
    }

    // STEP 2: Check for user tokens
    results.steps.push({ step: 2, name: 'Checking Google Drive tokens', status: 'running' });

    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('user_id, access_token, refresh_token, expires_at')
      .eq('user_id', 'zach')
      .single();

    if (tokenError || !tokenData) {
      results.steps[1].status = 'failed';
      results.steps[1].error = tokenError?.message || 'No tokens found';
      results.errors.push(`Token retrieval failed: ${tokenError?.message || 'No tokens found for user zach'}`);

      // Try to find any tokens
      const { data: allTokens } = await supabase
        .from('user_tokens')
        .select('user_id');

      results.steps[1].allUsers = allTokens?.map(t => t.user_id) || [];
    } else {
      results.steps[1].status = 'passed';
      results.steps[1].result = {
        tokenFound: true,
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenLength: tokenData.access_token?.length || 0,
        expiresAt: tokenData.expires_at
      };
    }

    // STEP 3: Initialize Google OAuth client
    results.steps.push({ step: 3, name: 'Initializing Google OAuth', status: 'running' });

    if (!tokenData) {
      results.steps[2].status = 'skipped';
      results.steps[2].reason = 'No tokens available';
    } else {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.NEXTAUTH_URL + '/api/auth/callback/google'
        );

        oauth2Client.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token
        });

        results.steps[2].status = 'passed';
        results.steps[2].result = 'OAuth client initialized';
        results.steps[2].config = {
          hasClientId: !!process.env.GOOGLE_CLIENT_ID,
          hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
          callbackUrl: process.env.NEXTAUTH_URL + '/api/auth/callback/google'
        };

        // STEP 4: Test Google Drive API access
        results.steps.push({ step: 4, name: 'Testing Google Drive API access', status: 'running' });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        try {
          const response = await drive.files.list({
            q: 'trashed=false',
            fields: 'files(id, name, mimeType)',
            pageSize: 5, // Only fetch 5 files for testing
            orderBy: 'modifiedTime desc'
          });

          const files = response.data.files || [];

          results.steps[3].status = 'passed';
          results.steps[3].result = {
            filesFound: files.length,
            sampleFiles: files.map(f => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType
            }))
          };

          // STEP 5: Test database insertion (if files found)
          if (files.length > 0) {
            results.steps.push({ step: 5, name: 'Testing database insertion', status: 'running' });

            const testFile = files[0];

            try {
              const { data: insertResult, error: insertError } = await supabase
                .from('knowledge_base')
                .upsert({
                  title: `[TEST] ${testFile.name}`,
                  content: `Test file from Drive Intelligence debug: ${testFile.name}`,
                  source_type: 'google_drive',
                  source_id: `test-${testFile.id}`,
                  metadata: {
                    mimeType: testFile.mimeType,
                    test: true
                  },
                  user_id: 'zach',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'source_id'
                })
                .select();

              if (insertError) {
                results.steps[4].status = 'failed';
                results.steps[4].error = insertError.message;
                results.errors.push(`Database insert failed: ${insertError.message}`);
              } else {
                results.steps[4].status = 'passed';
                results.steps[4].result = {
                  inserted: true,
                  recordId: insertResult?.[0]?.id || 'unknown'
                };

                // Clean up test record
                await supabase
                  .from('knowledge_base')
                  .delete()
                  .eq('source_id', `test-${testFile.id}`);

                results.steps[4].cleanup = 'Test record deleted';
              }
            } catch (dbError: any) {
              results.steps[4].status = 'failed';
              results.steps[4].error = dbError.message;
              results.errors.push(`Database error: ${dbError.message}`);
            }
          } else {
            results.steps.push({
              step: 5,
              name: 'Testing database insertion',
              status: 'skipped',
              reason: 'No files found in Drive'
            });
          }

        } catch (driveError: any) {
          results.steps[3].status = 'failed';
          results.steps[3].error = driveError.message;
          results.errors.push(`Google Drive API failed: ${driveError.message}`);

          // Check if it's an auth error
          if (driveError.message?.includes('invalid_grant') || driveError.message?.includes('401')) {
            results.steps[3].authError = true;
            results.steps[3].suggestion = 'Access token may be expired. User needs to re-authenticate.';
          }
        }

      } catch (oauthError: any) {
        results.steps[2].status = 'failed';
        results.steps[2].error = oauthError.message;
        results.errors.push(`OAuth initialization failed: ${oauthError.message}`);
      }
    }

    // STEP 6: Check existing indexed files
    results.steps.push({ step: 6, name: 'Checking existing indexed files', status: 'running' });

    const { count: existingCount, error: countError } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'google_drive');

    if (countError) {
      results.steps[results.steps.length - 1].status = 'failed';
      results.steps[results.steps.length - 1].error = countError.message;
    } else {
      results.steps[results.steps.length - 1].status = 'passed';
      results.steps[results.steps.length - 1].result = {
        existingFiles: existingCount || 0
      };
    }

    // Determine overall success
    results.success = results.errors.length === 0;

    // Summary
    results.summary = {
      totalSteps: results.steps.length,
      passed: results.steps.filter((s: any) => s.status === 'passed').length,
      failed: results.steps.filter((s: any) => s.status === 'failed').length,
      skipped: results.steps.filter((s: any) => s.status === 'skipped').length,
      errors: results.errors
    };

    // Recommendations
    results.recommendations = [];

    if (results.errors.some(e => e.includes('Token retrieval failed'))) {
      results.recommendations.push('User needs to sign in with Google to grant Drive access');
    }

    if (results.errors.some(e => e.includes('invalid_grant') || e.includes('401'))) {
      results.recommendations.push('Access token expired. User needs to re-authenticate with Google');
    }

    if (results.errors.some(e => e.includes('Database'))) {
      results.recommendations.push('Check Supabase schema and permissions for knowledge_base table');
    }

    if (results.errors.length === 0 && results.steps.some((s: any) => s.filesFound === 0)) {
      results.recommendations.push('Google Drive is empty or all files are trashed');
    }

    return NextResponse.json(results, {
      status: results.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Agent': 'drive-intelligence-v1'
      }
    });

  } catch (error: any) {
    results.fatalError = error.message;
    results.stack = error.stack;

    return NextResponse.json(results, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Agent': 'drive-intelligence-v1'
      }
    });
  }
}
