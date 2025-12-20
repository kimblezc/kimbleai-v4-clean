/**
 * Bulk Processing API Endpoint
 * Process up to 100+ documents with DeepSeek V3.2
 *
 * Use cases:
 * - Process 100 emails → extract action items
 * - Summarize 50 Google Drive documents
 * - Categorize Gmail attachments
 *
 * Features:
 * - Batch processing with concurrency control
 * - Error handling and partial completion
 * - Cost tracking
 * - Progress monitoring
 * - Support for multiple task types
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDeepSeekClient } from '@/lib/deepseek-client';
import { trackAPICall } from '@/lib/cost-monitor';
import { getUserByIdentifier } from '@/lib/user-utils';
import type { BulkProcessingRequest, BulkProcessingResult } from '@/lib/deepseek-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET endpoint: Return API info and capabilities
 */
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    service: 'KimbleAI Bulk Processing API',
    version: '1.0',
    capabilities: {
      maxDocuments: 100,
      supportedTasks: ['summarize', 'extract', 'categorize', 'analyze'],
      maxConcurrency: 10,
      supportedFormats: [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/html',
        'application/json',
      ],
    },
    pricing: {
      model: 'deepseek-v3.2',
      inputCost: '$0.27 per 1M tokens',
      outputCost: '$1.10 per 1M tokens',
    },
    examples: {
      summarize: 'Condense document to key points',
      extract: 'Pull out important information in structured format',
      categorize: 'Classify content and identify topics',
      analyze: 'Detailed analysis with insights and recommendations',
    },
    endpoint: {
      method: 'POST',
      path: '/api/bulk-process',
      timeout: '5 minutes',
      maxPayload: '10 MB',
    },
  });
}

/**
 * POST endpoint: Process bulk documents
 *
 * Request body:
 * {
 *   userId: string (required)
 *   documents: Array<{id, name, content}> (required, max 100)
 *   task: 'summarize' | 'extract' | 'categorize' | 'analyze' (required)
 *   instructions?: string (optional, overrides default task prompt)
 *   temperature?: number (optional, 0-2, default 0.7)
 *   maxTokens?: number (optional, default 2048)
 *   concurrency?: number (optional, default 5, max 10)
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   jobId: string
 *   results: Array<{
 *     documentId: string
 *     filename: string
 *     status: 'success' | 'failed' | 'skipped'
 *     result?: string (if successful)
 *     error?: string (if failed)
 *     processingTime: number (ms)
 *   }>
 *   summary: {
 *     total: number
 *     successful: number
 *     failed: number
 *     skipped: number
 *     totalCost: number
 *     totalTime: number (ms)
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[BULK-PROCESS] Starting job ${jobId}`);

    // Parse request
    const body = await request.json();
    const { userId, documents, task, instructions, temperature, maxTokens, concurrency } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: 'documents array is required' },
        { status: 400 }
      );
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'documents array cannot be empty' },
        { status: 400 }
      );
    }

    if (documents.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 documents per request' },
        { status: 400 }
      );
    }

    if (!task || !['summarize', 'extract', 'categorize', 'analyze'].includes(task)) {
      return NextResponse.json(
        { error: 'task must be one of: summarize, extract, categorize, analyze' },
        { status: 400 }
      );
    }

    // Validate user
    let user;
    try {
      user = await getUserByIdentifier(userId, supabase);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error(`[BULK-PROCESS] User validation failed: ${error}`);
      return NextResponse.json(
        { error: 'Failed to validate user' },
        { status: 401 }
      );
    }

    // Validate documents
    const validatedDocuments = documents.map((doc: any, index: number) => ({
      id: doc.id || `doc-${index}`,
      name: doc.name || `document-${index}`,
      content: String(doc.content || ''),
    }));

    // Log processing start
    console.log(
      `[BULK-PROCESS] Job ${jobId}: Processing ${validatedDocuments.length} documents with task="${task}"`
    );

    // Get DeepSeek client
    const deepseekClient = getDeepSeekClient();
    if (!deepseekClient) {
      console.error('[BULK-PROCESS] DeepSeek API key not configured');
      return NextResponse.json(
        {
          error: 'DeepSeek service not configured',
          message: 'DEEPSEEK_API_KEY environment variable is required for bulk processing. Get your API key from https://platform.deepseek.com/api_keys'
        },
        { status: 503 }
      );
    }

    // Process documents
    const results: BulkProcessingResult[] = [];
    let totalCost = 0;

    try {
      const processingResults = await deepseekClient.processBulk({
        documents: validatedDocuments,
        task: task as any,
        instructions,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2048,
        concurrency: Math.min(concurrency || 5, 10), // Cap at 10
      });

      results.push(...processingResults);

      // Calculate cost (rough estimate based on token counts)
      totalCost = processingResults.reduce((sum, result) => {
        if (result.cost) return sum + result.cost;
        // Estimate: 300 input tokens per doc + 1000 output tokens on average
        return sum + (0.27 * 300 / 1000000) + (1.1 * 1000 / 1000000);
      }, 0);

    } catch (error) {
      console.error(`[BULK-PROCESS] Processing error: ${error}`);
      return NextResponse.json(
        { error: 'Bulk processing failed' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const processingTime = Date.now() - startTime;
    const summary = {
      total: results.length,
      successful: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      totalCost: Number(totalCost.toFixed(4)),
      totalTime: processingTime,
      averageTimePerDocument: Math.round(processingTime / results.length),
    };

    // Track API call for cost monitoring
    try {
      await trackAPICall({
        user_id: user.id,
        model: 'deepseek-v3.2',
        endpoint: '/api/bulk-process',
        input_tokens: validatedDocuments.reduce((sum, doc) => sum + Math.ceil(doc.content.length / 4), 0),
        output_tokens: results
          .filter((r) => r.status === 'success')
          .reduce((sum, doc) => sum + (doc.result ? Math.ceil(doc.result.length / 4) : 0), 0),
        cost_usd: summary.totalCost,
        timestamp: new Date().toISOString(),
        metadata: {
          jobId,
          task,
          documentCount: results.length,
          successCount: summary.successful,
          failureCount: summary.failed,
          skippedCount: summary.skipped,
          processingTime,
        },
      });
    } catch (error) {
      console.warn(`[BULK-PROCESS] Failed to track API call: ${error}`);
    }

    // Log completion
    console.log(
      `[BULK-PROCESS] Job ${jobId} completed: ${summary.successful}/${summary.total} successful, cost $${summary.totalCost}`
    );

    return NextResponse.json({
      success: true,
      jobId,
      results,
      summary,
    });

  } catch (error) {
    console.error(`[BULK-PROCESS] Unexpected error in job ${jobId}:`, error);
    return NextResponse.json(
      {
        success: false,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
