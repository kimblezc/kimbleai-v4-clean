import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY!;

  // Test 1: Check key exists and format
  const test1 = {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    preview: apiKey ? apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4) : 'MISSING',
    hasWhitespace: apiKey !== apiKey?.trim(),
  };

  // Test 2: Try to list transcripts (read operation)
  let test2Result = null;
  try {
    const listResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    test2Result = {
      status: listResponse.status,
      ok: listResponse.ok,
      statusText: listResponse.statusText,
    };
  } catch (error: any) {
    test2Result = { error: error.message };
  }

  // Test 3: Try to upload test data
  let test3Result = null;
  try {
    const testBuffer = Buffer.from('test audio data for validation');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: testBuffer,
    });

    const responseText = await uploadResponse.text();
    test3Result = {
      status: uploadResponse.status,
      ok: uploadResponse.ok,
      statusText: uploadResponse.statusText,
      responseBody: responseText,
      responseLength: responseText.length,
    };
  } catch (error: any) {
    test3Result = { error: error.message };
  }

  return NextResponse.json({
    test1_KeyFormat: test1,
    test2_ListTranscripts: test2Result,
    test3_Upload: test3Result,
    timestamp: new Date().toISOString(),
  });
}
