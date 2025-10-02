# Knowledge Base Maintenance Guide

## Overview

This guide covers the maintenance and optimization of the KimbleAI knowledge base system, including regular backfill operations, deduplication, performance tuning, and monitoring.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Regular Maintenance Tasks](#regular-maintenance-tasks)
3. [Backfill Operations](#backfill-operations)
4. [Deduplication & Cleanup](#deduplication--cleanup)
5. [Performance Monitoring](#performance-monitoring)
6. [Query Optimization](#query-optimization)
7. [Troubleshooting](#troubleshooting)
8. [Automation](#automation)

---

## System Architecture

### Core Tables

1. **knowledge_base** - Main repository for all indexed knowledge
   - Stores: conversations, files, emails, drive content, manual entries
   - Key fields: `embedding` (vector), `source_type`, `category`, `importance`
   - Indexes: HNSW vector index, composite indexes for common queries

2. **memory_chunks** - Extracted memory fragments from conversations
   - Stores: facts, preferences, decisions, events, relationships
   - Key fields: `embedding`, `chunk_type`, `importance`
   - Linked to: `conversations`, `messages`

3. **message_references** - Detailed message tracking
   - Stores: full message context with metadata
   - Key fields: `metadata->search_vector`, code blocks, decisions, action items
   - Enables: granular message search and reference

### Background Processes

- **BackgroundIndexer**: Automatically indexes NEW messages as they're created
- **Backfill Scripts**: Process historical data that wasn't indexed
- **Cleanup Jobs**: Remove duplicates and orphaned entries

---

## Regular Maintenance Tasks

### Daily Tasks (Automated)

✅ **Cleanup Expired Knowledge**
```sql
SELECT cleanup_expired_knowledge();
```
- Removes entries past their `expires_at` date
- Should be run via cron job at 2 AM daily

### Weekly Tasks

✅ **Check Coverage Stats**
```bash
npx ts-node scripts/backfill-embeddings.ts --estimate-only
```
- Shows how many items are missing embeddings
- Provides cost estimate for backfill
- Recommended: Run every Monday morning

✅ **Review Health Metrics**
```sql
SELECT * FROM knowledge_health_metrics;
SELECT * FROM memory_health_metrics;
```
- Check embedding coverage percentage (target: >95%)
- Monitor table sizes
- Verify active vs inactive entries ratio

### Monthly Tasks

✅ **Run Deduplication**
```bash
npx ts-node scripts/deduplicate-knowledge.ts --dry-run
```
- Find and analyze duplicates
- Review results before running actual cleanup

✅ **Database Maintenance**
```sql
SELECT maintain_knowledge_tables();
```
- Vacuums and analyzes tables
- Rebuilds statistics for query planner
- Recommended: Run on first Sunday of each month

---

## Backfill Operations

### When to Run Backfill

Run backfill when:
- New data was imported without embeddings
- System was down and missed auto-indexing
- Historical data needs to be indexed
- Coverage percentage drops below 90%

### Basic Usage

**Estimate Only (No Changes)**
```bash
npx ts-node scripts/backfill-embeddings.ts --estimate-only
```

Shows:
- Total items missing embeddings
- Estimated cost (OpenAI API charges)
- Estimated time to complete

**Dry Run (See What Would Happen)**
```bash
npx ts-node scripts/backfill-embeddings.ts --dry-run
```

Shows:
- First 5 items that would be processed
- Total count that would be affected
- No actual changes made

**Run Actual Backfill**
```bash
npx ts-node scripts/backfill-embeddings.ts
```

Options:
- `--limit N` - Process only N items (for testing)
- `--batch-size N` - Process N items per batch (default: 50)
- `--source TYPE` - Process only specific source type

### Examples

**Test with small batch:**
```bash
npx ts-node scripts/backfill-embeddings.ts --limit 10
```

**Process only conversations:**
```bash
npx ts-node scripts/backfill-embeddings.ts --source conversation
```

**Large backfill with custom batch size:**
```bash
npx ts-node scripts/backfill-embeddings.ts --batch-size 100
```

### Rate Limiting

The backfill script automatically handles OpenAI rate limits:
- Default: 3,500 requests per minute
- Automatic delays between batches
- Can resume if interrupted (idempotent)

### Cost Management

Expected costs (approximate):
- $0.02 per 1M tokens
- ~1,000 tokens per embedding
- **Cost per item: ~$0.00002**

Examples:
- 1,000 items = $0.02
- 10,000 items = $0.20
- 100,000 items = $2.00

---

## Deduplication & Cleanup

### When to Run Deduplication

Run when:
- Multiple imports created duplicate entries
- Same content indexed from different sources
- Database size growing unexpectedly
- Query performance degrading

### Basic Usage

**Analyze for Issues**
```bash
npx ts-node scripts/deduplicate-knowledge.ts --dry-run
```

Shows:
- Duplicate groups found
- Orphaned entries (source deleted)
- Malformed data
- Estimated space savings

**Run Specific Cleanup Operations**

Remove duplicates only:
```bash
npx ts-node scripts/deduplicate-knowledge.ts --compact-duplicates
```

Remove orphaned entries:
```bash
npx ts-node scripts/deduplicate-knowledge.ts --remove-orphaned
```

Fix malformed data:
```bash
npx ts-node scripts/deduplicate-knowledge.ts --fix-malformed
```

**Run Full Cleanup**
```bash
npx ts-node scripts/deduplicate-knowledge.ts \
  --compact-duplicates \
  --remove-orphaned \
  --fix-malformed
```

### Similarity Threshold

Default: 0.95 (95% similar)

Adjust for more/less aggressive deduplication:
```bash
# More strict (only very similar items)
npx ts-node scripts/deduplicate-knowledge.ts --similarity 0.98

# Less strict (more duplicates found)
npx ts-node scripts/deduplicate-knowledge.ts --similarity 0.90
```

### What Gets Removed

**Duplicates:**
- Keeps: Original entry (earliest created)
- Removes: Duplicate entries with high vector similarity
- Considers: Importance score when choosing which to keep

**Orphaned Entries:**
- Removed: Knowledge entries where source (conversation/file) no longer exists
- Example: Conversation was deleted but knowledge_base entry remained

**Malformed Data:**
- Fixed: Invalid source_types, corrupted metadata
- Removed: Empty content, completely invalid entries

---

## Performance Monitoring

### Using the Stats API

**Get Overview**
```bash
curl "http://localhost:3000/api/knowledge/stats?userId=USER_ID"
```

Returns:
- Total entries and coverage
- Breakdown by source type
- Memory chunks stats
- Quality metrics
- Recent activity

**Get Detailed Stats**
```bash
curl -X POST http://localhost:3000/api/knowledge/stats \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "sourceType": "conversation",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }'
```

### Direct Database Queries

**Coverage by Source Type**
```sql
SELECT * FROM knowledge_source_distribution;
```

**User-Specific Coverage**
```sql
SELECT * FROM get_coverage_stats('USER_ID');
```

**Find Entries Missing Embeddings**
```sql
SELECT COUNT(*) as missing_embeddings
FROM knowledge_base
WHERE embedding IS NULL;
```

**Check Index Usage**
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('knowledge_base', 'memory_chunks')
ORDER BY idx_scan DESC;
```

### Performance Benchmarks

Target metrics:
- **Vector Search**: < 100ms for 10 results
- **Full-text Search**: < 50ms
- **Embedding Coverage**: > 95%
- **Orphaned Entries**: < 1%
- **Duplicate Rate**: < 2%

---

## Query Optimization

### Use Optimized Search Functions

**Standard Search (Good)**
```sql
SELECT * FROM search_knowledge_base(
  query_embedding,
  user_id,
  20  -- limit
);
```

**Ranked Search (Better)**
```sql
SELECT * FROM search_knowledge_base_ranked(
  query_embedding,
  user_id,
  20,     -- limit
  NULL,   -- category filter
  NULL,   -- source filter
  0.5     -- min importance
);
```

Benefits:
- Combines similarity + importance for better ranking
- Filters low-importance entries
- Faster when using filters

### Index Optimization

The optimization migration adds:
- 15+ performance indexes
- HNSW vector indexes (faster than ivfflat)
- Composite indexes for common query patterns
- Partial indexes for frequently filtered columns

**Verify Indexes Are Being Used**
```sql
EXPLAIN ANALYZE
SELECT * FROM search_knowledge_base_ranked(
  '[...]'::vector(1536),
  'user-id'::uuid,
  20
);
```

Look for:
- "Index Scan" (good) vs "Seq Scan" (bad)
- Low execution time
- High plan efficiency

### Query Tips

✅ **DO:**
- Always filter by `user_id` first
- Use `is_active = true` filter when possible
- Limit results appropriately
- Use importance filters to reduce result set

❌ **DON'T:**
- Query without user_id filter (full table scan)
- Request more results than needed
- Mix vector search with complex text searches
- Query very old data without date filters

---

## Troubleshooting

### Issue: Backfill Fails with Rate Limit Error

**Symptoms:**
```
OpenAI API error: Rate limit exceeded
```

**Solution:**
Reduce batch size:
```bash
npx ts-node scripts/backfill-embeddings.ts --batch-size 25
```

### Issue: Slow Vector Searches

**Symptoms:**
- Queries taking > 500ms
- Timeouts on search endpoints

**Diagnosis:**
```sql
-- Check if vector index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'knowledge_base'
  AND indexname LIKE '%embedding%';
```

**Solution:**
1. Run optimization migration (creates HNSW indexes)
2. Vacuum and analyze tables
3. Check if too many results being requested

### Issue: High Duplicate Count

**Symptoms:**
- Deduplication script finds many duplicates
- Database size larger than expected

**Diagnosis:**
```bash
npx ts-node scripts/deduplicate-knowledge.ts --dry-run
```

**Solution:**
1. Review what's creating duplicates (check source_type)
2. Run deduplication with appropriate similarity threshold
3. Check if BackgroundIndexer is running multiple times

### Issue: Missing Embeddings

**Symptoms:**
- Coverage percentage below 90%
- Search not finding recent entries

**Diagnosis:**
```bash
npx ts-node scripts/backfill-embeddings.ts --estimate-only
```

**Solution:**
1. Check if BackgroundIndexer is running
2. Verify OpenAI API key is valid
3. Run backfill for missing items
4. Check error logs for indexing failures

### Issue: Orphaned Entries Growing

**Symptoms:**
- Deduplication finds many orphaned entries
- References to deleted conversations

**Diagnosis:**
```sql
SELECT * FROM find_orphaned_knowledge() LIMIT 10;
```

**Solution:**
1. Run cleanup: `--remove-orphaned`
2. Add CASCADE delete to conversation deletion logic
3. Schedule weekly orphan cleanup

---

## Automation

### Recommended Cron Schedule

**Daily (2 AM):**
```bash
0 2 * * * cd /app && npx ts-node -e "require('@supabase/supabase-js').createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).rpc('cleanup_expired_knowledge')"
```

**Weekly (Sunday 3 AM):**
```bash
0 3 * * 0 cd /app && npx ts-node scripts/backfill-embeddings.ts --limit 1000
```

**Monthly (1st Sunday 4 AM):**
```bash
0 4 1-7 * 0 cd /app && npx ts-node scripts/deduplicate-knowledge.ts --dry-run > /var/log/dedup-report.txt
```

**Monthly (1st Sunday 5 AM):**
```bash
0 5 1-7 * 0 cd /app && npx ts-node -e "require('@supabase/supabase-js').createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).rpc('maintain_knowledge_tables')"
```

### Using GitHub Actions

Create `.github/workflows/knowledge-maintenance.yml`:

```yaml
name: Knowledge Base Maintenance

on:
  schedule:
    # Daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run backfill check
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npx ts-node scripts/backfill-embeddings.ts --estimate-only

      - name: Run cleanup
        if: github.event_name == 'workflow_dispatch'
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx ts-node scripts/deduplicate-knowledge.ts --remove-orphaned
```

### Monitoring Alerts

Set up alerts for:
- **Coverage below 90%**: Trigger backfill
- **Orphaned entries > 100**: Trigger cleanup
- **Table size growth > 20%/week**: Investigate duplicates
- **Query time > 200ms**: Check indexes

---

## Maintenance Checklist

### Daily
- [ ] Automated cleanup of expired entries
- [ ] Monitor error logs for indexing failures

### Weekly
- [ ] Check coverage stats
- [ ] Review health metrics
- [ ] Run small backfill if needed (< 1000 items)

### Monthly
- [ ] Run deduplication analysis
- [ ] Review and clean orphaned entries
- [ ] Vacuum and analyze tables
- [ ] Review query performance metrics
- [ ] Update documentation with any issues found

### Quarterly
- [ ] Full database backup before major cleanup
- [ ] Run comprehensive deduplication
- [ ] Review and optimize frequently used queries
- [ ] Update this documentation
- [ ] Train team on new procedures

---

## Additional Resources

- **SQL Schema**: `sql/complete_rag_knowledge_base.sql`
- **Optimization Migration**: `sql/optimize_knowledge_base.sql`
- **Backfill Script**: `scripts/backfill-embeddings.ts`
- **Deduplication Script**: `scripts/deduplicate-knowledge.ts`
- **Stats API**: `app/api/knowledge/stats/route.ts`
- **Background Indexer**: `lib/background-indexer.ts`

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review error logs in Supabase dashboard
3. Run diagnostic scripts with `--dry-run`
4. Contact system administrator with full error details

Last Updated: 2025-10-01
