# Semantic Search - Quick Start Guide

**5-Minute Setup Guide**

---

## Step 1: Database Setup (2 minutes)

1. Open **Supabase SQL Editor**
2. Copy and paste the entire file: **`database/add-embedding-columns.sql`**
3. Click "Run"
4. Verify success message appears

✅ You should see:
```
✅ EMBEDDING COLUMNS AND SEARCH FUNCTIONS CREATED SUCCESSFULLY!
```

---

## Step 2: Backfill Embeddings (2 minutes)

```bash
cd D:\OneDrive\Documents\kimbleai-v4-clean

# Run backfill script
npx tsx scripts/backfill-embeddings.ts
```

✅ You should see:
- Processing messages, files, transcriptions, knowledge base
- All items processed successfully
- Total cost estimate (should be < $0.01)

---

## Step 3: Test Search (1 minute)

```bash
# Test that everything works
curl "http://localhost:3000/api/search/test?verbose=true"
```

✅ You should see:
- `"passRate": "100.0%"`
- `"performance": { "speed": "EXCELLENT" }`
- `"successful": 8` (all tests passed)

---

## Step 4: Try It Out!

### Search for something
```bash
curl "http://localhost:3000/api/search/semantic?q=project%20updates"
```

### Get search suggestions
```bash
curl "http://localhost:3000/api/search/suggestions?q=tran"
```

### Check embedding coverage
```bash
# In Supabase SQL Editor
SELECT * FROM get_search_stats('zach-admin-001');
```

✅ You should see 100% coverage for all content types

---

## What Just Happened?

You now have:
- ✅ Fast semantic search (< 500ms)
- ✅ Search across messages, files, transcripts
- ✅ Auto-embedding for new content
- ✅ Cost: ~$1/month

---

## Using Search

### Basic Search
```bash
GET /api/search/semantic?q=your+query
```

### Filter by Type
```bash
GET /api/search/semantic?q=test&type=message
```

### Advanced Filters
```bash
POST /api/search/semantic
{
  "query": "your query",
  "filters": {
    "projectId": "project-123",
    "contentTypes": ["message", "transcript"],
    "threshold": 0.75,
    "limit": 20
  }
}
```

---

## Troubleshooting

### Problem: No results found
**Solution:** Run backfill script again

### Problem: Slow performance
**Solution:** Check database indexes exist:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'messages' AND indexname LIKE '%embedding%';
```

### Problem: New content not searchable
**Solution:** Verify auto-embedding is working:
```sql
-- Send a test message, then check:
SELECT embedding IS NOT NULL FROM messages
ORDER BY created_at DESC LIMIT 1;
```

---

## Need More Help?

See full documentation:
- **Deployment Guide:** `SEMANTIC_SEARCH_DEPLOYMENT.md`
- **Complete Report:** `SEMANTIC_SEARCH_COMPLETE.md`

---

**Ready to use!** 🚀
