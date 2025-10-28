import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/sessions/[id]/end - End a session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, summary, nextSteps, keyDecisions, blockers } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the session to calculate duration
    const { data: session, error: fetchError } = await supabase
      .from('session_logs')
      .select('started_at')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate duration in minutes
    const endTime = new Date();
    const startTime = new Date(session.started_at);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    // Update session with end time and final details
    const updates: any = {
      ended_at: endTime.toISOString(),
      duration_minutes: durationMinutes
    };

    if (summary) updates.summary = summary;
    if (nextSteps) updates.next_steps = nextSteps;
    if (keyDecisions) updates.key_decisions = keyDecisions;
    if (blockers) updates.blockers = blockers;

    const { data, error } = await supabase
      .from('session_logs')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error ending session:', error);
      return NextResponse.json(
        { error: 'Failed to end session', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data,
      duration_minutes: durationMinutes
    });
  } catch (error) {
    console.error('Error in POST /api/sessions/[id]/end:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
