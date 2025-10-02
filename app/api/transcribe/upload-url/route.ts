// app/api/transcribe/upload-url/route.ts
// Get transcription upload credentials with automatic fallback to Whisper

import { NextRequest, NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [UPLOAD-URL] Credentials request received`);

    // Debug: Check if API key is available
    console.log('[UPLOAD-URL] API Key available:', !!ASSEMBLYAI_API_KEY);
    console.log('[UPLOAD-URL] API Key length:', ASSEMBLYAI_API_KEY?.length || 0);
    console.log('[UPLOAD-URL] API Key first 8 chars:', ASSEMBLYAI_API_KEY?.substring(0, 8) || 'N/A');

    if (!ASSEMBLYAI_API_KEY) {
      console.error('[UPLOAD-URL] ERROR: API key not configured in environment');
      return NextResponse.json(
        {
          error: 'AssemblyAI not configured',
          fallback: 'whisper',
          message: 'Will use Whisper API for transcription (25MB file limit)'
        },
        { status: 200 } // Return 200 so frontend knows to use fallback
      );
    }

    // Test the API key quickly (just check if it's valid format)
    const trimmedKey = ASSEMBLYAI_API_KEY.trim();
    if (trimmedKey.length !== 32) {
      console.warn('[UPLOAD-URL] WARNING: API key length is not 32 characters (got', trimmedKey.length, ')');
    }

    // Check for hidden characters
    if (trimmedKey !== ASSEMBLYAI_API_KEY) {
      console.warn('[UPLOAD-URL] WARNING: API key has whitespace that was trimmed');
    }

    // Test if the API key actually works for uploads by making a quick test request
    console.log('[UPLOAD-URL] Testing API key upload permissions...');

    try {
      // Try a tiny test upload to verify the key has upload permissions
      const testData = Buffer.alloc(10, 'test');
      const testUpload = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${trimmedKey}`,
          'Content-Type': 'application/octet-stream',
        },
        body: testData,
      });

      if (!testUpload.ok) {
        const errorText = await testUpload.text();
        console.error('[UPLOAD-URL] API key test upload failed:', testUpload.status, errorText);

        // AssemblyAI account doesn't have upload permissions
        return NextResponse.json({
          error: 'AssemblyAI account limitation detected',
          fallback: 'whisper',
          message: 'Your AssemblyAI API key works for reading data but not uploading files. This typically means:\n\n' +
                   '1. The account is in a free/trial tier without upload permissions\n' +
                   '2. Billing needs to be enabled at https://www.assemblyai.com/app/account\n' +
                   '3. The API key may have read-only permissions\n\n' +
                   'KimbleAI will automatically use Whisper API for transcription (25MB file limit).',
          details: errorText,
          status: testUpload.status,
          troubleshooting: {
            step1: 'Visit https://www.assemblyai.com/app/account',
            step2: 'Check billing status and enable if needed',
            step3: 'Verify API key has full permissions',
            step4: 'Regenerate API key if necessary'
          }
        }, { status: 200 }); // Return 200 so frontend knows to use fallback
      }

      console.log('[UPLOAD-URL] API key test successful - upload permissions confirmed');

      // Key works! Return AssemblyAI credentials
      const response = {
        success: true,
        provider: 'assemblyai',
        upload_url: 'https://api.assemblyai.com/v2/upload',
        auth_token: `Bearer ${trimmedKey}`,
        features: ['speaker_diarization', 'unlimited_file_size']
      };

      console.log('[UPLOAD-URL] AssemblyAI credentials provided successfully');
      console.log('[UPLOAD-URL] Upload URL:', response.upload_url);
      console.log('[UPLOAD-URL] Auth token length:', response.auth_token.length);

      return NextResponse.json(response);

    } catch (testError: any) {
      console.error('[UPLOAD-URL] API key test failed with exception:', testError.message);

      // Network or other error - fall back to Whisper
      return NextResponse.json({
        error: 'AssemblyAI unavailable',
        fallback: 'whisper',
        message: 'Unable to connect to AssemblyAI. Will use Whisper API for transcription (25MB file limit).',
        details: testError.message
      }, { status: 200 }); // Return 200 so frontend knows to use fallback
    }

  } catch (error: any) {
    console.error('[UPLOAD-URL] ERROR: Failed to provide credentials:', error);
    console.error('[UPLOAD-URL] Error stack:', error.stack);

    // Return fallback info instead of error
    return NextResponse.json({
      error: 'Service error',
      fallback: 'whisper',
      message: 'Will use Whisper API for transcription (25MB file limit).',
      details: error.message
    }, { status: 200 }); // Return 200 so frontend knows to use fallback
  }
}