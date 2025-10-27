import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/analytics/models/feedback
 *
 * Submit user feedback (thumbs up/down) for a model response
 *
 * Body:
 * - metricId: UUID of the specific metric (optional)
 * - conversationId: conversation ID to find the latest metric (optional)
 * - rating: 1 (thumbs up) or -1 (thumbs down)
 */
export async function POST(request: NextRequest) {
  try {
    const { metricId, rating, conversationId } = await request.json();

    // Validation
    if (!metricId && !conversationId) {
      return NextResponse.json({
        error: 'Either metricId or conversationId is required'
      }, { status: 400 });
    }

    if (rating !== 1 && rating !== -1) {
      return NextResponse.json({
        error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)'
      }, { status: 400 });
    }

    // Update the performance metric with user rating
    if (metricId) {
      // Update specific metric by ID
      const { error } = await supabase
        .from('model_performance_metrics')
        .update({ user_rating: rating })
        .eq('id', metricId);

      if (error) {
        console.error('[Feedback] Error updating metric by ID:', error);
        return NextResponse.json({
          error: 'Failed to save feedback',
          details: error.message
        }, { status: 500 });
      }

    } else if (conversationId) {
      // Find and update the most recent metric for this conversation
      const { data: latestMetric, error: fetchError } = await supabase
        .from('model_performance_metrics')
        .select('id')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !latestMetric) {
        console.error('[Feedback] Error finding latest metric:', fetchError);
        return NextResponse.json({
          error: 'No performance metric found for this conversation',
          details: fetchError?.message
        }, { status: 404 });
      }

      const { error: updateError } = await supabase
        .from('model_performance_metrics')
        .update({ user_rating: rating })
        .eq('id', latestMetric.id);

      if (updateError) {
        console.error('[Feedback] Error updating metric:', updateError);
        return NextResponse.json({
          error: 'Failed to save feedback',
          details: updateError.message
        }, { status: 500 });
      }
    }

    console.log(`[Feedback] Saved rating ${rating} for ${metricId || conversationId}`);

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully',
      rating,
    });

  } catch (error: any) {
    console.error('[Feedback] Error processing feedback:', error);
    return NextResponse.json({
      error: 'Failed to save feedback',
      details: error.message
    }, { status: 500 });
  }
}
