/**
 * Backfill Embeddings Script
 * Generates embeddings for all existing data that doesn't have them yet
 *
 * Usage:
 *   npx ts-node scripts/backfill-embeddings.ts [options]
 *
 * Options:
 *   --dry-run          Show what would be processed without making changes
 *   --limit N          Process only N items (for testing)
 *   --batch-size N     Process N items per batch (default: 50)
 *   --source TYPE      Process only specific source type (conversation|file|email|drive|manual)
 *   --estimate-only    Show cost estimate and exit
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import { generateEmbedding, generateEmbeddings } from '../lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BackfillStats {
  totalConversations: number;
  conversationsWithEmbeddings: number;
  conversationsMissingEmbeddings: number;

  totalMessages: number;
  messagesWithEmbeddings: number;
  messagesMissingEmbeddings: number;

  totalKnowledgeBase: number;
  knowledgeWithEmbeddings: number;
  knowledgeMissingEmbeddings: number;

  totalMemoryChunks: number;
  memoryChunksWithEmbeddings: number;
  memoryChunksMissingEmbeddings: number;

  orphanedKnowledgeBase: number;

  estimatedCost: number;
  estimatedTime: string;
}

interface ProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
  startTime: Date;
  endTime: Date;
  totalCost: number;
}

class EmbeddingBackfiller {
  private batchSize = 50;
  private rateLimit = 3500; // OpenAI embeddings rate limit (requests per minute)
  private costPerEmbedding = 0.00002; // $0.02 per 1M tokens, ~1000 tokens per embedding
  private processedCount = 0;
  private rateLimitDelay = 0;

  constructor(batchSize?: number) {
    if (batchSize) this.batchSize = batchSize;
    // Calculate delay needed to stay under rate limit
    this.rateLimitDelay = (60000 / this.rateLimit) * this.batchSize;
  }

  /**
   * Audit current state of knowledge base
   */
  async audit(): Promise<BackfillStats> {
    console.log('🔍 Auditing knowledge base...\n');

    const stats: BackfillStats = {
      totalConversations: 0,
      conversationsWithEmbeddings: 0,
      conversationsMissingEmbeddings: 0,
      totalMessages: 0,
      messagesWithEmbeddings: 0,
      messagesMissingEmbeddings: 0,
      totalKnowledgeBase: 0,
      knowledgeWithEmbeddings: 0,
      knowledgeMissingEmbeddings: 0,
      totalMemoryChunks: 0,
      memoryChunksWithEmbeddings: 0,
      memoryChunksMissingEmbeddings: 0,
      orphanedKnowledgeBase: 0,
      estimatedCost: 0,
      estimatedTime: ''
    };

    // Audit knowledge_base table
    try {
      const { count: totalKb } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true });

      const { count: kbWithEmbeddings } = await supabase
        .from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null);

      stats.totalKnowledgeBase = totalKb || 0;
      stats.knowledgeWithEmbeddings = kbWithEmbeddings || 0;
      stats.knowledgeMissingEmbeddings = stats.totalKnowledgeBase - stats.knowledgeWithEmbeddings;
    } catch (error) {
      console.warn('Could not audit knowledge_base table:', error);
    }

    // Audit memory_chunks table
    try {
      const { count: totalMemory } = await supabase
        .from('memory_chunks')
        .select('*', { count: 'exact', head: true });

      const { count: memoryWithEmbeddings } = await supabase
        .from('memory_chunks')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null);

      stats.totalMemoryChunks = totalMemory || 0;
      stats.memoryChunksWithEmbeddings = memoryWithEmbeddings || 0;
      stats.memoryChunksMissingEmbeddings = stats.totalMemoryChunks - stats.memoryChunksWithEmbeddings;
    } catch (error) {
      console.warn('Could not audit memory_chunks table:', error);
    }

    // Audit message_references table (if it exists)
    try {
      const { count: totalMessages } = await supabase
        .from('message_references')
        .select('*', { count: 'exact', head: true });

      const { count: messagesWithEmbeddings } = await supabase
        .from('message_references')
        .select('*', { count: 'exact', head: true })
        .not('metadata->search_vector', 'is', null);

      stats.totalMessages = totalMessages || 0;
      stats.messagesWithEmbeddings = messagesWithEmbeddings || 0;
      stats.messagesMissingEmbeddings = stats.totalMessages - stats.messagesWithEmbeddings;
    } catch (error) {
      console.warn('Could not audit message_references table:', error);
    }

    // Check for orphaned knowledge_base entries
    try {
      const { data: orphaned } = await supabase
        .from('knowledge_base')
        .select('id, source_type, source_id')
        .eq('source_type', 'conversation');

      if (orphaned) {
        for (const entry of orphaned) {
          // Check if source still exists
          const { data: sourceExists } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', entry.source_id)
            .single();

          if (!sourceExists) {
            stats.orphanedKnowledgeBase++;
          }
        }
      }
    } catch (error) {
      console.warn('Could not check for orphaned entries:', error);
    }

    // Calculate estimates
    const totalMissing =
      stats.knowledgeMissingEmbeddings +
      stats.memoryChunksMissingEmbeddings +
      stats.messagesMissingEmbeddings;

    stats.estimatedCost = totalMissing * this.costPerEmbedding;

    const estimatedMinutes = Math.ceil(totalMissing / (this.rateLimit * 0.8)); // 80% of rate limit for safety
    stats.estimatedTime = estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`;

    return stats;
  }

  /**
   * Display audit results
   */
  displayAudit(stats: BackfillStats): void {
    console.log('📊 KNOWLEDGE BASE AUDIT RESULTS');
    console.log('='.repeat(60));
    console.log('\n📚 Knowledge Base Table:');
    console.log(`   Total entries:        ${stats.totalKnowledgeBase.toLocaleString()}`);
    console.log(`   With embeddings:      ${stats.knowledgeWithEmbeddings.toLocaleString()} (${this.percentage(stats.knowledgeWithEmbeddings, stats.totalKnowledgeBase)}%)`);
    console.log(`   Missing embeddings:   ${stats.knowledgeMissingEmbeddings.toLocaleString()}`);

    console.log('\n🧠 Memory Chunks Table:');
    console.log(`   Total chunks:         ${stats.totalMemoryChunks.toLocaleString()}`);
    console.log(`   With embeddings:      ${stats.memoryChunksWithEmbeddings.toLocaleString()} (${this.percentage(stats.memoryChunksWithEmbeddings, stats.totalMemoryChunks)}%)`);
    console.log(`   Missing embeddings:   ${stats.memoryChunksMissingEmbeddings.toLocaleString()}`);

    if (stats.totalMessages > 0) {
      console.log('\n💬 Message References Table:');
      console.log(`   Total messages:       ${stats.totalMessages.toLocaleString()}`);
      console.log(`   With embeddings:      ${stats.messagesWithEmbeddings.toLocaleString()} (${this.percentage(stats.messagesWithEmbeddings, stats.totalMessages)}%)`);
      console.log(`   Missing embeddings:   ${stats.messagesMissingEmbeddings.toLocaleString()}`);
    }

    if (stats.orphanedKnowledgeBase > 0) {
      console.log('\n⚠️  Data Quality:');
      console.log(`   Orphaned entries:     ${stats.orphanedKnowledgeBase.toLocaleString()} (source deleted)`);
    }

    console.log('\n💰 Backfill Estimates:');
    console.log(`   Total items to process: ${(stats.knowledgeMissingEmbeddings + stats.memoryChunksMissingEmbeddings + stats.messagesMissingEmbeddings).toLocaleString()}`);
    console.log(`   Estimated cost:         $${stats.estimatedCost.toFixed(4)}`);
    console.log(`   Estimated time:         ${stats.estimatedTime}`);
    console.log('='.repeat(60));
    console.log('');
  }

  /**
   * Backfill embeddings for knowledge_base table
   */
  async backfillKnowledgeBase(dryRun: boolean = false, limit?: number): Promise<ProcessingResult> {
    console.log(`\n🚀 Backfilling knowledge_base embeddings${dryRun ? ' (DRY RUN)' : ''}...\n`);

    const result: ProcessingResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: new Date(),
      endTime: new Date(),
      totalCost: 0
    };

    // Get items without embeddings
    let query = supabase
      .from('knowledge_base')
      .select('id, content, user_id')
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Failed to fetch items:', error);
      return result;
    }

    if (!items || items.length === 0) {
      console.log('✅ No items need backfilling!');
      return result;
    }

    console.log(`Found ${items.length} items without embeddings`);

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would process:');
      items.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. ID: ${item.id}, Content length: ${item.content?.length || 0} chars`);
      });
      if (items.length > 5) {
        console.log(`   ... and ${items.length - 5} more`);
      }
      return result;
    }

    // Process in batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(items.length / this.batchSize)} (${batch.length} items)...`);

      for (const item of batch) {
        try {
          result.processed++;

          if (!item.content || item.content.trim().length === 0) {
            result.skipped++;
            continue;
          }

          // Generate embedding
          const embedding = await this.generateEmbedding(item.content);

          if (!embedding) {
            result.failed++;
            result.errors.push({ id: item.id, error: 'Failed to generate embedding' });
            continue;
          }

          // Update database
          const { error: updateError } = await supabase
            .from('knowledge_base')
            .update({ embedding })
            .eq('id', item.id);

          if (updateError) {
            result.failed++;
            result.errors.push({ id: item.id, error: updateError.message });
          } else {
            result.succeeded++;
            result.totalCost += this.costPerEmbedding;
          }

          // Progress indicator
          if (result.processed % 10 === 0) {
            this.showProgress(result.processed, items.length, result.succeeded, result.failed);
          }

        } catch (error: any) {
          result.failed++;
          result.errors.push({ id: item.id, error: error.message });
        }
      }

      // Rate limiting delay between batches
      if (i + this.batchSize < items.length) {
        await this.sleep(this.rateLimitDelay);
      }
    }

    result.endTime = new Date();
    return result;
  }

  /**
   * Backfill embeddings for memory_chunks table
   */
  async backfillMemoryChunks(dryRun: boolean = false, limit?: number): Promise<ProcessingResult> {
    console.log(`\n🧠 Backfilling memory_chunks embeddings${dryRun ? ' (DRY RUN)' : ''}...\n`);

    const result: ProcessingResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: new Date(),
      endTime: new Date(),
      totalCost: 0
    };

    let query = supabase
      .from('memory_chunks')
      .select('id, content, user_id')
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Failed to fetch items:', error);
      return result;
    }

    if (!items || items.length === 0) {
      console.log('✅ No items need backfilling!');
      return result;
    }

    console.log(`Found ${items.length} items without embeddings`);

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would process:');
      items.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. ID: ${item.id}, Content length: ${item.content?.length || 0} chars`);
      });
      if (items.length > 5) {
        console.log(`   ... and ${items.length - 5} more`);
      }
      return result;
    }

    // Process in batches (same logic as knowledge_base)
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(items.length / this.batchSize)} (${batch.length} items)...`);

      for (const item of batch) {
        try {
          result.processed++;

          if (!item.content || item.content.trim().length === 0) {
            result.skipped++;
            continue;
          }

          const embedding = await this.generateEmbedding(item.content);

          if (!embedding) {
            result.failed++;
            result.errors.push({ id: item.id, error: 'Failed to generate embedding' });
            continue;
          }

          const { error: updateError } = await supabase
            .from('memory_chunks')
            .update({ embedding })
            .eq('id', item.id);

          if (updateError) {
            result.failed++;
            result.errors.push({ id: item.id, error: updateError.message });
          } else {
            result.succeeded++;
            result.totalCost += this.costPerEmbedding;
          }

          if (result.processed % 10 === 0) {
            this.showProgress(result.processed, items.length, result.succeeded, result.failed);
          }

        } catch (error: any) {
          result.failed++;
          result.errors.push({ id: item.id, error: error.message });
        }
      }

      if (i + this.batchSize < items.length) {
        await this.sleep(this.rateLimitDelay);
      }
    }

    result.endTime = new Date();
    return result;
  }

  /**
   * Generate embedding using OpenAI API (now uses lib/embeddings)
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      return await generateEmbedding(text);
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return null;
    }
  }

  /**
   * Backfill embeddings for messages table
   */
  async backfillMessages(dryRun: boolean = false, limit?: number): Promise<ProcessingResult> {
    console.log(`\n💬 Backfilling messages embeddings${dryRun ? ' (DRY RUN)' : ''}...\n`);

    const result: ProcessingResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: new Date(),
      endTime: new Date(),
      totalCost: 0
    };

    let query = supabase
      .from('messages')
      .select('id, content, role')
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Failed to fetch messages:', error);
      return result;
    }

    if (!items || items.length === 0) {
      console.log('✅ No messages need backfilling!');
      return result;
    }

    console.log(`Found ${items.length} messages without embeddings`);

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would process:');
      items.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. ID: ${item.id}, Role: ${item.role}, Content length: ${item.content?.length || 0} chars`);
      });
      if (items.length > 5) {
        console.log(`   ... and ${items.length - 5} more`);
      }
      return result;
    }

    // Process in batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(items.length / this.batchSize)} (${batch.length} items)...`);

      // Generate embeddings for entire batch at once
      const texts = batch.map(item => `${item.role}: ${item.content}`);
      const embeddings = await generateEmbeddings(texts);

      // Update database
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];

        result.processed++;

        if (!embedding) {
          result.failed++;
          result.errors.push({ id: item.id, error: 'Failed to generate embedding' });
          continue;
        }

        const { error: updateError } = await supabase
          .from('messages')
          .update({ embedding })
          .eq('id', item.id);

        if (updateError) {
          result.failed++;
          result.errors.push({ id: item.id, error: updateError.message });
        } else {
          result.succeeded++;
          result.totalCost += this.costPerEmbedding;
        }

        if (result.processed % 10 === 0) {
          this.showProgress(result.processed, items.length, result.succeeded, result.failed);
        }
      }

      if (i + this.batchSize < items.length) {
        await this.sleep(this.rateLimitDelay);
      }
    }

    result.endTime = new Date();
    return result;
  }

  /**
   * Backfill embeddings for audio_transcriptions table
   */
  async backfillTranscriptions(dryRun: boolean = false, limit?: number): Promise<ProcessingResult> {
    console.log(`\n🎤 Backfilling transcriptions embeddings${dryRun ? ' (DRY RUN)' : ''}...\n`);

    const result: ProcessingResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: new Date(),
      endTime: new Date(),
      totalCost: 0
    };

    let query = supabase
      .from('audio_transcriptions')
      .select('id, filename, text')
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Failed to fetch transcriptions:', error);
      return result;
    }

    if (!items || items.length === 0) {
      console.log('✅ No transcriptions need backfilling!');
      return result;
    }

    console.log(`Found ${items.length} transcriptions without embeddings`);

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would process:');
      items.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i + 1}. ID: ${item.id}, File: ${item.filename}, Text length: ${item.text?.length || 0} chars`);
      });
      if (items.length > 5) {
        console.log(`   ... and ${items.length - 5} more`);
      }
      return result;
    }

    // Process in batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(items.length / this.batchSize)} (${batch.length} items)...`);

      // Generate embeddings for entire batch
      const texts = batch.map(item => `Transcription: ${item.filename}\n\n${item.text?.substring(0, 8000) || ''}`);
      const embeddings = await generateEmbeddings(texts);

      // Update database
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];

        result.processed++;

        if (!embedding) {
          result.failed++;
          result.errors.push({ id: item.id, error: 'Failed to generate embedding' });
          continue;
        }

        const { error: updateError } = await supabase
          .from('audio_transcriptions')
          .update({ embedding })
          .eq('id', item.id);

        if (updateError) {
          result.failed++;
          result.errors.push({ id: item.id, error: updateError.message });
        } else {
          result.succeeded++;
          result.totalCost += this.costPerEmbedding * 2; // Transcriptions typically larger
        }

        if (result.processed % 10 === 0) {
          this.showProgress(result.processed, items.length, result.succeeded, result.failed);
        }
      }

      if (i + this.batchSize < items.length) {
        await this.sleep(this.rateLimitDelay);
      }
    }

    result.endTime = new Date();
    return result;
  }

  /**
   * Display processing results
   */
  displayResults(results: ProcessingResult[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL RESULTS SUMMARY');
    console.log('='.repeat(60));

    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalCost = 0;
    let allErrors: Array<{ id: string; error: string }> = [];

    results.forEach((result, index) => {
      const tableName = index === 0 ? 'knowledge_base' : 'memory_chunks';
      const duration = (result.endTime.getTime() - result.startTime.getTime()) / 1000;

      console.log(`\n📋 ${tableName}:`);
      console.log(`   Processed:  ${result.processed.toLocaleString()}`);
      console.log(`   Succeeded:  ${result.succeeded.toLocaleString()}`);
      console.log(`   Failed:     ${result.failed.toLocaleString()}`);
      console.log(`   Skipped:    ${result.skipped.toLocaleString()}`);
      console.log(`   Duration:   ${duration.toFixed(1)}s`);
      console.log(`   Cost:       $${result.totalCost.toFixed(4)}`);

      totalProcessed += result.processed;
      totalSucceeded += result.succeeded;
      totalFailed += result.failed;
      totalSkipped += result.skipped;
      totalCost += result.totalCost;
      allErrors.push(...result.errors);
    });

    console.log('\n' + '-'.repeat(60));
    console.log('🎯 TOTALS:');
    console.log(`   Processed:  ${totalProcessed.toLocaleString()}`);
    console.log(`   Succeeded:  ${totalSucceeded.toLocaleString()} (${this.percentage(totalSucceeded, totalProcessed)}%)`);
    console.log(`   Failed:     ${totalFailed.toLocaleString()}`);
    console.log(`   Skipped:    ${totalSkipped.toLocaleString()}`);
    console.log(`   Total Cost: $${totalCost.toFixed(4)}`);

    if (allErrors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      allErrors.slice(0, 10).forEach(err => {
        console.log(`   ${err.id}: ${err.error}`);
      });
      if (allErrors.length > 10) {
        console.log(`   ... and ${allErrors.length - 10} more errors`);
      }
    }

    console.log('='.repeat(60));
  }

  // Utility methods
  private percentage(part: number, whole: number): string {
    if (whole === 0) return '0.0';
    return ((part / whole) * 100).toFixed(1);
  }

  private showProgress(current: number, total: number, succeeded: number, failed: number): void {
    const percent = ((current / total) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${current}/${total} (${percent}%) | ✅ ${succeeded} | ❌ ${failed}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const estimateOnly = args.includes('--estimate-only');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined;
  const batchSizeIndex = args.indexOf('--batch-size');
  const batchSize = batchSizeIndex !== -1 ? parseInt(args[batchSizeIndex + 1]) : 50;

  console.log('\n🔧 KNOWLEDGE BASE EMBEDDING BACKFILL TOOL');
  console.log('==========================================\n');

  const backfiller = new EmbeddingBackfiller(batchSize);

  // Run audit
  const stats = await backfiller.audit();
  backfiller.displayAudit(stats);

  if (estimateOnly) {
    console.log('💡 Use --dry-run to see what would be processed');
    console.log('💡 Remove --estimate-only to run actual backfill\n');
    return;
  }

  const totalMissing =
    stats.knowledgeMissingEmbeddings +
    stats.memoryChunksMissingEmbeddings;

  if (totalMissing === 0) {
    console.log('✅ All data already has embeddings! Nothing to do.\n');
    return;
  }

  // Confirm before proceeding (unless dry run)
  if (!dryRun) {
    const answer = await askQuestion(
      `\n⚠️  About to process ${totalMissing.toLocaleString()} items (estimated cost: $${stats.estimatedCost.toFixed(4)}). Continue? (yes/no): `
    );

    if (answer.toLowerCase() !== 'yes') {
      console.log('Cancelled.\n');
      return;
    }
  }

  // Run backfill
  const results: ProcessingResult[] = [];

  if (stats.knowledgeMissingEmbeddings > 0) {
    results.push(await backfiller.backfillKnowledgeBase(dryRun, limit));
  }

  if (stats.memoryChunksMissingEmbeddings > 0) {
    results.push(await backfiller.backfillMemoryChunks(dryRun, limit));
  }

  // Display results
  if (!dryRun) {
    backfiller.displayResults(results);
  }

  console.log('\n✅ Backfill complete!\n');
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { EmbeddingBackfiller };
export type { BackfillStats, ProcessingResult };
