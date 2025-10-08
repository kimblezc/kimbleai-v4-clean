# Knowledge Base Maintenance - Quick Reference

> **Quick access commands for daily knowledge base operations**

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Run optimization migration (in Supabase SQL Editor)
# File: sql/optimize_knowledge_base.sql

# 2. Install dependencies
npm install

# 3. Check current state
npx ts-node scripts/backfill-embeddings.ts --estimate-only
```

---

## 📊 Common Commands

### Check Status
```bash
# Get coverage estimate (no changes)
npx ts-node scripts/backfill-embeddings.ts --estimate-only

# Get detailed stats via API
curl "http://localhost:3000/api/knowledge/stats?userId=USER_ID"

# Check health in database
psql -c "SELECT * FROM knowledge_health_metrics;"
```

### Backfill Embeddings
```bash
# Small test (10 items)
npx ts-node scripts/backfill-embeddings.ts --limit 10

# Full backfill
npx ts-node scripts/backfill-embeddings.ts

# Custom batch size
npx ts-node scripts/backfill-embeddings.ts --batch-size 100
```

### Clean Up Duplicates
```bash
# Analyze (dry run)
npx ts-node scripts/deduplicate-knowledge.ts --dry-run

# Remove duplicates only
npx ts-node scripts/deduplicate-knowledge.ts --compact-duplicates

# Full cleanup
npx ts-node scripts/deduplicate-knowledge.ts \
  --compact-duplicates \
  --remove-orphaned \
  --fix-malformed
```

---

## 🔧 SQL Quick Queries

### Check Coverage
```sql
-- Overall health
SELECT * FROM knowledge_health_metrics;

-- By source type
SELECT * FROM knowledge_source_distribution;

-- User specific
SELECT * FROM get_coverage_stats('user-id');
```

### Find Issues
```sql
-- Missing embeddings
SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NULL;

-- Orphaned entries
SELECT * FROM find_orphaned_knowledge();

-- Similar entries (potential duplicates)
SELECT * FROM find_similar_knowledge('entry-id');
```

### Maintenance
```sql
-- Clean expired
SELECT cleanup_expired_knowledge();

-- Vacuum tables
SELECT maintain_knowledge_tables();
```

---

## 🎯 Troubleshooting

### Rate Limit Errors
```bash
# Reduce batch size
npx ts-node scripts/backfill-embeddings.ts --batch-size 25
```

### Slow Queries
```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM search_knowledge_base_ranked(...);

-- Rebuild statistics
ANALYZE knowledge_base;
ANALYZE memory_chunks;
```

### High Duplicates
```bash
# More strict similarity
npx ts-node scripts/deduplicate-knowledge.ts \
  --similarity 0.98 \
  --compact-duplicates
```

---

## 📅 Maintenance Schedule

**Daily (Automated):**
```sql
SELECT cleanup_expired_knowledge();
```

**Weekly:**
```bash
npx ts-node scripts/backfill-embeddings.ts --estimate-only
# If needed: npx ts-node scripts/backfill-embeddings.ts --limit 1000
```

**Monthly:**
```bash
npx ts-node scripts/deduplicate-knowledge.ts --dry-run
# Review, then run cleanup
SELECT maintain_knowledge_tables();
```

---

## 🔗 File Locations

| File | Purpose |
|------|---------|
| `scripts/backfill-embeddings.ts` | Generate missing embeddings |
| `scripts/deduplicate-knowledge.ts` | Clean duplicates/orphans |
| `sql/optimize_knowledge_base.sql` | Database optimization |
| `app/api/knowledge/stats/route.ts` | Statistics API |
| `docs/KNOWLEDGE_BASE_MAINTENANCE.md` | Full documentation |

---

## 💰 Cost Reference

| Items | Cost |
|-------|------|
| 100 | $0.002 |
| 1,000 | $0.02 |
| 10,000 | $0.20 |
| 100,000 | $2.00 |

*Based on text-embedding-3-small at $0.02 per 1M tokens*

---

## ✅ Health Targets

- **Coverage:** > 95%
- **Orphans:** < 1%
- **Duplicates:** < 2%
- **Vector Search:** < 100ms
- **Active Entries:** > 90%

---

## 🆘 Emergency Commands

### System Unresponsive
```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active' AND query LIKE '%knowledge_base%';

-- Rebuild indexes
REINDEX TABLE knowledge_base;
```

### Rollback Recent Changes
```sql
-- Restore from backup
-- (Make sure you have backups before major operations!)
```

### Quick Recovery
```bash
# Re-run optimization
# File: sql/optimize_knowledge_base.sql

# Verify system
npx ts-node scripts/backfill-embeddings.ts --estimate-only
```

---

For detailed information, see: `docs/KNOWLEDGE_BASE_MAINTENANCE.md`
