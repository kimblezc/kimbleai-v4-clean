/**
 * Realtime Token API - Generate ephemeral tokens for OpenAI Realtime API
 *
 * Creates short-lived tokens for WebRTC connections to OpenAI's Realtime API.
 * Tokens expire after 60 seconds and should be used immediately.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get model from request
    const body = await req.json();
    const model = body.model || 'gpt-4o-realtime-preview-2024-12-17';

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Request ephemeral token from OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: 'alloy',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Realtime Token] OpenAI error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to create session' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the client_secret for WebRTC connection
    return NextResponse.json({
      client_secret: data.client_secret,
      expires_at: data.expires_at,
      model: data.model,
    });
  } catch (error) {
    console.error('[Realtime Token] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
