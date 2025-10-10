/**
 * Deep Research API
 * Provides comprehensive multi-step research with real-time progress streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import { DeepResearchAgent } from '@/lib/deep-research-agent';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query, userId = 'zach', streaming = true } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    console.log('[DeepResearch] Starting research for:', query);

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
      .single();

    if (userError || !userData) {
      console.error('[DeepResearch] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (streaming) {
      // Stream progress updates using Server-Sent Events
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const agent = new DeepResearchAgent((progress) => {
            const data = JSON.stringify({ type: 'progress', progress }) + '\n';
            try {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } catch (err) {
              console.error('[DeepResearch] Error sending progress:', err);
            }
          });

          try {
            const result = await agent.conduct(query, userData.id);

            const finalData = JSON.stringify({
              type: 'complete',
              report: result.report,
              sources: result.sources,
              metadata: result.metadata
            }) + '\n';
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            controller.close();
          } catch (error: any) {
            console.error('[DeepResearch] Research error:', error);
            const errorData = JSON.stringify({
              type: 'error',
              error: error.message
            }) + '\n';
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no' // Disable buffering for Nginx
        }
      });
    } else {
      // Non-streaming response
      const agent = new DeepResearchAgent();
      const result = await agent.conduct(query, userData.id);

      return NextResponse.json({
        success: true,
        report: result.report,
        sources: result.sources,
        progress: result.progress,
        metadata: result.metadata
      });
    }
  } catch (error: any) {
    console.error('[DeepResearch] API error:', error);
    return NextResponse.json(
      {
        error: 'Deep research failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const userId = searchParams.get('userId') || 'zach';
  const streaming = searchParams.get('streaming') !== 'false';

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  // Forward to POST handler
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ query, userId, streaming }),
    headers: { 'Content-Type': 'application/json' }
  }));
}
