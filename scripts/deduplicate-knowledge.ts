/**
 * Knowledge Base Deduplication & Cleanup Script
 * Finds and removes duplicate entries, orphaned data, and malformed records
 *
 * Usage:
 *   npx ts-node scripts/deduplicate-knowledge.ts [options]
 *
 * Options:
 *   --dry-run              Show what would be changed without making changes
 *   --similarity N         Cosine similarity threshold (default: 0.95)
 *   --remove-orphaned      Remove orphaned knowledge_base entries
 *   --fix-malformed        Fix/remove malformed data
 *   --compact-duplicates   Keep best duplicate, remove others
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DuplicateGroup {
  primaryId: string;
  duplicates: Array<{
    id: string;
    similarity: number;
    content: string;
    created_at: string;
    importance: number;
  }>;
  totalCount: number;
}

interface CleanupStats {
  totalEntries: number;
  duplicateGroups: number;
  totalDuplicates: number;
  orphanedEntries: number;
  malformedEntries: number;
  emptyContent: number;
  nullEmbeddings: number;
  estimatedSpaceSaved: string;
}

interface CleanupResult {
  duplicatesRemoved: number;
  duplicatesMerged: number;
  orphansRemoved: number;
  malformedFixed: number;
  malformedRemoved: number;
  errors: Array<{ id: string; error: string }>;
  spaceSaved: number;
}

class KnowledgeDeduplicator {
  private similarityThreshold = 0.95;
  private batchSize = 100;

  constructor(similarityThreshold?: number) {
    if (similarityThreshold) {
      this.similarityThreshold = similarityThreshold;
    }
  }

  /**
   * Analyze knowledge base for duplicates and issues
   */
  async analyze(): Promise<CleanupStats> {
    console.log('🔍 Analyzing knowledge base for duplicates and issues...\n');

    const stats: CleanupStats = {
      totalEntries: 0,
      duplicateGroups: 0,
      totalDuplicates: 0,
      orphanedEntries: 0,
      malformedEntries: 0,
      emptyContent: 0,
      nullEmbeddings: 0,
      estimatedSpaceSaved: '0 KB'
    };

    // Get total count
    const { count: total } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });

    stats.totalEntries = total || 0;

    // Check for empty content
    const { count: empty } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .or('content.is.null,content.eq.');

    stats.emptyContent = empty || 0;

    // Check for null embeddings
    const { count: nullEmbed } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .is('embedding', null);

    stats.nullEmbeddings = nullEmbed || 0;

    // Find duplicates (this is expensive, so we'll sample)
    const duplicates = await this.findDuplicates();
    stats.duplicateGroups = duplicates.length;
    stats.totalDuplicates = duplicates.reduce((sum, group) => sum + group.duplicates.length, 0);

    // Check for orphaned entries
    const orphaned = await this.findOrphanedEntries();
    stats.orphanedEntries = orphaned.length;

    // Check for malformed entries
    const malformed = await this.findMalformedEntries();
    stats.malformedEntries = malformed.length;

    // Estimate space savings
    const totalToRemove = stats.totalDuplicates + stats.orphanedEntries + stats.emptyContent;
    const avgEntrySize = 2048; // Rough estimate: 2KB per entry
    const spaceSavedBytes = totalToRemove * avgEntrySize;
    stats.estimatedSpaceSaved = this.formatBytes(spaceSavedBytes);

    return stats;
  }

  /**
   * Find duplicate knowledge base entries using vector similarity
   */
  async findDuplicates(): Promise<DuplicateGroup[]> {
    console.log('🔎 Finding duplicates (this may take a while)...');

    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    // Get all entries with embeddings
    const { data: entries } = await supabase
      .from('knowledge_base')
      .select('id, content, embedding, created_at, importance')
      .not('embedding', 'is', null)
      .order('created_at', { ascending: true });

    if (!entries || entries.length === 0) {
      console.log('No entries with embeddings found.');
      return [];
    }

    console.log(`Checking ${entries.length} entries for duplicates...`);

    // Compare each entry with all others
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (processed.has(entry.id)) continue;

      const duplicates: DuplicateGroup['duplicates'] = [];

      // Compare with subsequent entries
      for (let j = i + 1; j < entries.length; j++) {
        const other = entries[j];

        if (processed.has(other.id)) continue;

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(entry.embedding, other.embedding);

        if (similarity >= this.similarityThreshold) {
          duplicates.push({
            id: other.id,
            similarity,
            content: other.content,
            created_at: other.created_at,
            importance: other.importance || 0.5
          });
          processed.add(other.id);
        }
      }

      if (duplicates.length > 0) {
        duplicateGroups.push({
          primaryId: entry.id,
          duplicates,
          totalCount: duplicates.length + 1
        });
        processed.add(entry.id);
      }

      // Progress indicator
      if (i % 100 === 0) {
        process.stdout.write(`\r   Progress: ${i}/${entries.length}`);
      }
    }

    process.stdout.write(`\r   Progress: ${entries.length}/${entries.length}\n`);
    console.log(`Found ${duplicateGroups.length} duplicate groups`);

    return duplicateGroups;
  }

  /**
   * Find orphaned knowledge_base entries (source no longer exists)
   */
  async findOrphanedEntries(): Promise<string[]> {
    console.log('🗑️  Finding orphaned entries...');

    const orphaned: string[] = [];

    // Check conversation sources
    const { data: conversationEntries } = await supabase
      .from('knowledge_base')
      .select('id, source_id')
      .eq('source_type', 'conversation');

    if (conversationEntries) {
      for (const entry of conversationEntries) {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', entry.source_id)
          .single();

        if (!conversation) {
          orphaned.push(entry.id);
        }
      }
    }

    // Check file sources (if indexed_files table exists)
    try {
      const { data: fileEntries } = await supabase
        .from('knowledge_base')
        .select('id, source_id')
        .eq('source_type', 'file');

      if (fileEntries) {
        for (const entry of fileEntries) {
          const { data: file } = await supabase
            .from('indexed_files')
            .select('id')
            .eq('id', entry.source_id)
            .single();

          if (!file) {
            orphaned.push(entry.id);
          }
        }
      }
    } catch (error) {
      // indexed_files table may not exist
    }

    console.log(`Found ${orphaned.length} orphaned entries`);
    return orphaned;
  }

  /**
   * Find malformed entries
   */
  async findMalformedEntries(): Promise<string[]> {
    console.log('🔧 Finding malformed entries...');

    const malformed: string[] = [];

    // Find entries with invalid data
    const { data: entries } = await supabase
      .from('knowledge_base')
      .select('id, content, source_type, category, metadata');

    if (entries) {
      for (const entry of entries) {
        let isMalformed = false;

        // Check for missing required fields
        if (!entry.content || entry.content.trim().length === 0) {
          isMalformed = true;
        }

        // Check for invalid source_type
        const validSourceTypes = ['conversation', 'file', 'email', 'drive', 'manual', 'extracted'];
        if (entry.source_type && !validSourceTypes.includes(entry.source_type)) {
          isMalformed = true;
        }

        // Check for malformed metadata
        if (entry.metadata) {
          try {
            JSON.stringify(entry.metadata);
          } catch {
            isMalformed = true;
          }
        }

        if (isMalformed) {
          malformed.push(entry.id);
        }
      }
    }

    console.log(`Found ${malformed.length} malformed entries`);
    return malformed;
  }

  /**
   * Remove duplicates, keeping the best one
   */
  async removeDuplicates(groups: DuplicateGroup[], dryRun: boolean = false): Promise<CleanupResult> {
    console.log(`\n🧹 Removing duplicates${dryRun ? ' (DRY RUN)' : ''}...\n`);

    const result: CleanupResult = {
      duplicatesRemoved: 0,
      duplicatesMerged: 0,
      orphansRemoved: 0,
      malformedFixed: 0,
      malformedRemoved: 0,
      errors: [],
      spaceSaved: 0
    };

    for (const group of groups) {
      try {
        // Sort duplicates by importance and creation date
        const sortedDuplicates = group.duplicates.sort((a, b) => {
          if (a.importance !== b.importance) {
            return b.importance - a.importance;
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        // Keep the primary (original) entry, remove duplicates
        const idsToRemove = sortedDuplicates.map(d => d.id);

        if (dryRun) {
          console.log(`Would remove ${idsToRemove.length} duplicates of entry ${group.primaryId}`);
          result.duplicatesRemoved += idsToRemove.length;
        } else {
          // Remove duplicates
          const { error } = await supabase
            .from('knowledge_base')
            .delete()
            .in('id', idsToRemove);

          if (error) {
            result.errors.push({ id: group.primaryId, error: error.message });
          } else {
            result.duplicatesRemoved += idsToRemove.length;
            result.spaceSaved += idsToRemove.length * 2048; // Rough estimate
          }
        }

      } catch (error: any) {
        result.errors.push({ id: group.primaryId, error: error.message });
      }
    }

    return result;
  }

  /**
   * Remove orphaned entries
   */
  async removeOrphaned(orphanedIds: string[], dryRun: boolean = false): Promise<number> {
    console.log(`\n🗑️  Removing orphaned entries${dryRun ? ' (DRY RUN)' : ''}...`);

    if (orphanedIds.length === 0) {
      console.log('No orphaned entries to remove.');
      return 0;
    }

    if (dryRun) {
      console.log(`Would remove ${orphanedIds.length} orphaned entries`);
      return orphanedIds.length;
    }

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .in('id', orphanedIds);

    if (error) {
      console.error('Failed to remove orphaned entries:', error);
      return 0;
    }

    console.log(`Removed ${orphanedIds.length} orphaned entries`);
    return orphanedIds.length;
  }

  /**
   * Fix or remove malformed entries
   */
  async fixMalformed(malformedIds: string[], dryRun: boolean = false): Promise<{ fixed: number; removed: number }> {
    console.log(`\n🔧 Fixing malformed entries${dryRun ? ' (DRY RUN)' : ''}...`);

    let fixed = 0;
    let removed = 0;

    if (malformedIds.length === 0) {
      console.log('No malformed entries to fix.');
      return { fixed, removed };
    }

    // Get malformed entries
    const { data: entries } = await supabase
      .from('knowledge_base')
      .select('*')
      .in('id', malformedIds);

    if (!entries) return { fixed, removed };

    for (const entry of entries) {
      try {
        // If content is empty, remove the entry
        if (!entry.content || entry.content.trim().length === 0) {
          if (!dryRun) {
            await supabase.from('knowledge_base').delete().eq('id', entry.id);
          }
          removed++;
          continue;
        }

        // Fix invalid source_type
        if (entry.source_type && !['conversation', 'file', 'email', 'drive', 'manual', 'extracted'].includes(entry.source_type)) {
          if (!dryRun) {
            await supabase
              .from('knowledge_base')
              .update({ source_type: 'manual' })
              .eq('id', entry.id);
          }
          fixed++;
        }

      } catch (error: any) {
        console.error(`Failed to fix entry ${entry.id}:`, error.message);
      }
    }

    console.log(`Fixed ${fixed} entries, removed ${removed} entries`);
    return { fixed, removed };
  }

  /**
   * Display analysis results
   */
  displayAnalysis(stats: CleanupStats): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 KNOWLEDGE BASE CLEANUP ANALYSIS');
    console.log('='.repeat(60));

    console.log(`\n📚 Total Entries: ${stats.totalEntries.toLocaleString()}`);

    console.log('\n🔄 Duplicates:');
    console.log(`   Duplicate groups:     ${stats.duplicateGroups.toLocaleString()}`);
    console.log(`   Total duplicates:     ${stats.totalDuplicates.toLocaleString()}`);

    console.log('\n🗑️  Data Quality Issues:');
    console.log(`   Orphaned entries:     ${stats.orphanedEntries.toLocaleString()}`);
    console.log(`   Malformed entries:    ${stats.malformedEntries.toLocaleString()}`);
    console.log(`   Empty content:        ${stats.emptyContent.toLocaleString()}`);
    console.log(`   Null embeddings:      ${stats.nullEmbeddings.toLocaleString()}`);

    console.log('\n💾 Cleanup Benefits:');
    console.log(`   Entries to remove:    ${(stats.totalDuplicates + stats.orphanedEntries + stats.emptyContent).toLocaleString()}`);
    console.log(`   Space savings:        ${stats.estimatedSpaceSaved}`);

    console.log('='.repeat(60));
    console.log('');
  }

  /**
   * Display cleanup results
   */
  displayResults(result: CleanupResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP RESULTS');
    console.log('='.repeat(60));

    console.log('\n📊 Changes Made:');
    console.log(`   Duplicates removed:   ${result.duplicatesRemoved.toLocaleString()}`);
    console.log(`   Duplicates merged:    ${result.duplicatesMerged.toLocaleString()}`);
    console.log(`   Orphans removed:      ${result.orphansRemoved.toLocaleString()}`);
    console.log(`   Malformed fixed:      ${result.malformedFixed.toLocaleString()}`);
    console.log(`   Malformed removed:    ${result.malformedRemoved.toLocaleString()}`);

    console.log('\n💾 Space Saved:');
    console.log(`   ${this.formatBytes(result.spaceSaved)}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.slice(0, 10).forEach(err => {
        console.log(`   ${err.id}: ${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('='.repeat(60));
    console.log('');
  }

  // Utility methods
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const removeOrphaned = args.includes('--remove-orphaned');
  const fixMalformed = args.includes('--fix-malformed');
  const compactDuplicates = args.includes('--compact-duplicates');
  const similarityIndex = args.indexOf('--similarity');
  const similarity = similarityIndex !== -1 ? parseFloat(args[similarityIndex + 1]) : 0.95;

  console.log('\n🧹 KNOWLEDGE BASE DEDUPLICATION & CLEANUP TOOL');
  console.log('==============================================\n');

  const deduplicator = new KnowledgeDeduplicator(similarity);

  // Run analysis
  const stats = await deduplicator.analyze();
  deduplicator.displayAnalysis(stats);

  const totalIssues = stats.totalDuplicates + stats.orphanedEntries + stats.malformedEntries + stats.emptyContent;

  if (totalIssues === 0) {
    console.log('✅ Knowledge base is clean! No issues found.\n');
    return;
  }

  // Confirm before proceeding (unless dry run)
  if (!dryRun) {
    const answer = await askQuestion(
      `\n⚠️  About to clean up ${totalIssues.toLocaleString()} issues. Continue? (yes/no): `
    );

    if (answer.toLowerCase() !== 'yes') {
      console.log('Cancelled.\n');
      return;
    }
  }

  // Run cleanup operations
  const result: CleanupResult = {
    duplicatesRemoved: 0,
    duplicatesMerged: 0,
    orphansRemoved: 0,
    malformedFixed: 0,
    malformedRemoved: 0,
    errors: [],
    spaceSaved: 0
  };

  // Remove duplicates
  if (compactDuplicates && stats.duplicateGroups > 0) {
    const duplicates = await deduplicator.findDuplicates();
    const dupResult = await deduplicator.removeDuplicates(duplicates, dryRun);
    result.duplicatesRemoved = dupResult.duplicatesRemoved;
    result.duplicatesMerged = dupResult.duplicatesMerged;
    result.errors.push(...dupResult.errors);
    result.spaceSaved += dupResult.spaceSaved;
  }

  // Remove orphaned entries
  if (removeOrphaned && stats.orphanedEntries > 0) {
    const orphaned = await deduplicator.findOrphanedEntries();
    result.orphansRemoved = await deduplicator.removeOrphaned(orphaned, dryRun);
    result.spaceSaved += result.orphansRemoved * 2048;
  }

  // Fix malformed entries
  if (fixMalformed && stats.malformedEntries > 0) {
    const malformed = await deduplicator.findMalformedEntries();
    const fixResult = await deduplicator.fixMalformed(malformed, dryRun);
    result.malformedFixed = fixResult.fixed;
    result.malformedRemoved = fixResult.removed;
    result.spaceSaved += fixResult.removed * 2048;
  }

  // Display results
  if (!dryRun) {
    deduplicator.displayResults(result);
  } else {
    console.log('\n📋 DRY RUN COMPLETE - No changes were made');
    console.log('💡 Remove --dry-run to perform actual cleanup\n');
  }

  console.log('✅ Cleanup complete!\n');
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

export { KnowledgeDeduplicator };
export type { CleanupStats, CleanupResult };
