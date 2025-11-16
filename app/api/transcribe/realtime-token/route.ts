// app/api/transcribe/realtime-token/route.ts
// Generate temporary token for AssemblyAI real-time transcription

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    // Create temporary token for real-time API
    const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_in: 3600 // 1 hour
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create real-time token');
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.token
    });

  } catch (error: any) {
    console.error('Real-time token error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}
