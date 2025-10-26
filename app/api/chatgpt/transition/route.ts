import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ChatGPTTransitionAgent } from '@/lib/chatgpt-transition-agent';

/**
 * ChatGPT Transition API Endpoint
 *
 * POST /api/chatgpt/transition
 * - Execute comprehensive ChatGPT to KimbleAI transition
 * - Intelligent project matching and migration
 * - Returns detailed transition report
 *
 * GET /api/chatgpt/transition
 * - Get transition status and history
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const body = await request.json();

    const options = {
      autoCreateProjects: body.autoCreateProjects ?? true,
      minMatchConfidence: body.minMatchConfidence ?? 0.7,
      migrateToMainSystem: body.migrateToMainSystem ?? true,
      preserveChatGPTData: body.preserveChatGPTData ?? true,
      generateEmbeddings: body.generateEmbeddings ?? false,
      analyzeSentiment: body.analyzeSentiment ?? false,
      extractKeywords: body.extractKeywords ?? true,
      groupByTopic: body.groupByTopic ?? true,
      dryRun: body.dryRun ?? false,
    };

    console.log(`[ChatGPT Transition] Starting for user: ${userId}`);
    console.log(`[ChatGPT Transition] Options:`, options);

    const agent = ChatGPTTransitionAgent.getInstance(userId);
    const result = await agent.executeTransition(options);

    console.log(`[ChatGPT Transition] Completed:`, {
      success: result.success,
      stats: result.stats,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Transition completed',
        data: result,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[ChatGPT Transition] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Transition failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'ChatGPT Transition Agent is ready',
        capabilities: [
          'Intelligent project matching using semantic analysis',
          'Automatic project creation for unmatched conversations',
          'Conversation migration to main system with project linking',
          'Keyword extraction and topic grouping',
          'Duplicate detection and skipping',
          'Comprehensive transition reporting',
          'Dry run mode for testing',
          'Preserves original ChatGPT data',
        ],
        options: {
          autoCreateProjects: 'boolean - Create projects for unmatched conversations',
          minMatchConfidence: 'number (0-1) - Minimum confidence for auto-matching',
          migrateToMainSystem: 'boolean - Migrate to main conversations table',
          preserveChatGPTData: 'boolean - Keep original chatgpt_* tables',
          generateEmbeddings: 'boolean - Generate embeddings for migrated data',
          analyzeSentiment: 'boolean - Analyze conversation sentiment',
          extractKeywords: 'boolean - Extract keywords for better matching',
          groupByTopic: 'boolean - Group conversations by topic',
          dryRun: 'boolean - Test run without actual changes',
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get transition agent status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
