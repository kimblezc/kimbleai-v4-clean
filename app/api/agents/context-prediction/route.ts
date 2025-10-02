import { NextRequest, NextResponse } from 'next/server';
import { contextPredictionService } from '@/lib/context-prediction';
import { behavioralAnalysis } from '@/lib/behavioral-analysis';

export async function POST(request: NextRequest) {
  try {
    const { action, context, userInteraction, userId = 'zach' } = await request.json();

    switch (action) {
      case 'predict': {
        const predictions = await contextPredictionService.predictUserNeeds({
          userId,
          currentContext: context,
          timestamp: new Date()
        });

        return NextResponse.json({
          predictions,
          confidence: predictions.confidence,
          suggestedActions: predictions.actions,
          preparedContent: predictions.content
        });
      }

      case 'track_interaction': {
        await behavioralAnalysis.trackUserInteraction({
          userId,
          type: userInteraction.type,
          data: userInteraction.data,
          context,
          timestamp: new Date()
        });

        return NextResponse.json({ success: true });
      }

      case 'get_patterns': {
        const patterns = await behavioralAnalysis.getUserPatterns(userId);

        return NextResponse.json({
          patterns,
          insights: patterns.insights,
          recommendations: patterns.recommendations
        });
      }

      case 'preload_content': {
        const preloadedContent = await contextPredictionService.preloadContent({
          userId,
          predictedNeeds: context.predictions
        });

        return NextResponse.json({
          content: preloadedContent,
          cached: true,
          readyTime: new Date()
        });
      }

      case 'get_suggestions': {
        const suggestions = await contextPredictionService.generateSuggestions({
          userId,
          currentContext: context,
          userHistory: context.history
        });

        return NextResponse.json({
          suggestions,
          priority: suggestions.priority,
          reasoning: suggestions.reasoning
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Context prediction error:', error);
    return NextResponse.json(
      { error: 'Context prediction failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId') || 'zach';

    switch (type) {
      case 'status': {
        const status = await contextPredictionService.getSystemStatus();
        return NextResponse.json(status);
      }

      case 'analytics': {
        const analytics = await behavioralAnalysis.getAnalytics(userId);
        return NextResponse.json(analytics);
      }

      case 'predictions': {
        const currentPredictions = await contextPredictionService.getCurrentPredictions(
          userId
        );
        return NextResponse.json(currentPredictions);
      }

      case 'model_performance': {
        const performance = await contextPredictionService.getModelPerformance();
        return NextResponse.json(performance);
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Context prediction GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve context prediction data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { modelUpdate, feedback, userId = 'zach' } = await request.json();

    if (modelUpdate) {
      await contextPredictionService.updateModel({
        userId,
        modelData: modelUpdate,
        timestamp: new Date()
      });
    }

    if (feedback) {
      await contextPredictionService.processFeedback({
        userId,
        feedback,
        timestamp: new Date()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Context prediction update error:', error);
    return NextResponse.json(
      { error: 'Failed to update context prediction' },
      { status: 500 }
    );
  }
}