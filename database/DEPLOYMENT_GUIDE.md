# Database Migration Deployment Guide

**Date:** 2025-10-01
**Database:** Supabase PostgreSQL
**Target:** kimbleai.com (gbmefnaqsxtoseufjixp.supabase.co)

---

## Pre-Deployment Checklist

- [ ] Backup current database (Supabase Dashboard → Database → Backups)
- [ ] Verify you have access to Supabase SQL Editor
- [ ] Confirm you are deploying to the correct project
- [ ] Review SCHEMA.md documentation
- [ ] Have this deployment guide open

---

## Deployment Steps

### Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `gbmefnaqsxtoseufjixp`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Enable Required Extensions

```sql
-- Run this first to enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Click **Run** and verify no errors.

### Step 3: Run Complete Migration

1. Open `database/COMPLETE_MIGRATION.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. Wait for completion (should take 10-30 seconds)
6. Check for errors in the output

**Expected Output:**
```
NOTICE:  ✅ Migration complete! Found 23 core tables.
```

### Step 4: Verify Deployment

Run the test script locally:

```bash
node scripts/test-database-schema.js
```

**Expected Output:**
- All tables should exist
- All key columns should exist
- Success rate should be ~95-100%

### Step 5: Verify Key Components

Run these queries in Supabase SQL Editor to verify:

#### Check Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected:** 23+ tables including:
- users, projects, conversations, messages
- knowledge_base, audio_transcriptions, files
- activity_logs, auth_logs, api_cost_tracking
- content_categories, zapier_webhook_logs

#### Check Views

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected:** 10+ views including:
- dashboard_stats
- recent_activity
- user_activity_summary
- monthly_cost_summary
- file_stats

#### Check Functions

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Expected:** 15+ functions including:
- search_knowledge_base
- search_files
- log_activity
- get_user_recent_activity
- cleanup_old_activity_logs

#### Check Indexes

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('files', 'activity_logs', 'knowledge_base', 'messages')
ORDER BY tablename, indexname;
```

**Expected:** Multiple indexes per table including vector indexes (ivfflat).

#### Test Vector Search

```sql
-- Verify pgvector extension is working
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```

**Expected:** vector extension with version number.

---

## Post-Deployment Verification

### 1. Test Dashboard Stats View

```sql
SELECT
  user_id,
  user_name,
  project_count,
  conversation_count,
  file_count
FROM dashboard_stats;
```

**Expected:** 2 rows (Zach and Rebecca).

### 2. Test Activity Logging

```sql
SELECT log_activity(
  'zach-admin-001',
  'tested',
  'database',
  NULL,
  'Migration Test',
  '{"test": true}'::jsonb
);

SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5;
```

**Expected:** New activity log entry appears.

### 3. Test File Stats View

```sql
SELECT * FROM file_stats;
```

**Expected:** Empty result set (no files yet) or existing file stats.

### 4. Test Cost Tracking

```sql
SELECT
  month,
  total_cost_usd,
  total_api_calls
FROM monthly_cost_summary
ORDER BY month DESC
LIMIT 3;
```

**Expected:** Empty or existing cost data.

### 5. Test RLS Policies

```sql
-- As service role, you should see all rows
SELECT COUNT(*) FROM files;
SELECT COUNT(*) FROM activity_logs;
SELECT COUNT(*) FROM auth_logs;
```

**Expected:** Counts return without errors.

---

## Troubleshooting

### Error: "relation already exists"

**Cause:** Tables already exist from previous migrations.
**Solution:** This is normal. The migration is idempotent and will skip existing tables.

### Error: "column already exists"

**Cause:** Columns already exist from previous migrations.
**Solution:** This is normal. The migration uses `ADD COLUMN IF NOT EXISTS`.

### Error: "extension 'vector' does not exist"

**Cause:** pgvector extension not installed.
**Solution:**
1. Go to Supabase Dashboard → Database → Extensions
2. Search for "vector"
3. Enable the extension
4. Re-run the migration

### Error: "permission denied"

**Cause:** Using anon key instead of service role key.
**Solution:** Ensure you're using the service role key from `.env.local`.

### Slow queries

**Cause:** Indexes not yet built or need ANALYZE.
**Solution:**
```sql
VACUUM ANALYZE;
```

---

## Rollback Plan

If you need to rollback the migration:

### Option 1: Restore from Backup

1. Go to Supabase Dashboard → Database → Backups
2. Select the backup from before migration
3. Click **Restore**

### Option 2: Manual Rollback

```sql
-- Drop new tables (BE CAREFUL!)
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS auth_logs CASCADE;

-- Drop new views
DROP VIEW IF EXISTS dashboard_stats CASCADE;
DROP VIEW IF EXISTS recent_activity CASCADE;
DROP VIEW IF EXISTS user_activity_summary CASCADE;
DROP VIEW IF EXISTS monthly_cost_summary CASCADE;
DROP VIEW IF EXISTS file_stats CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS log_activity CASCADE;
DROP FUNCTION IF EXISTS get_user_recent_activity CASCADE;
DROP FUNCTION IF EXISTS search_files CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_activity_logs CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_auth_logs CASCADE;
```

**WARNING:** This will delete all data in these tables!

---

## Performance Optimization (Post-Deployment)

### Run ANALYZE

After migration, run ANALYZE to update query planner statistics:

```sql
ANALYZE users;
ANALYZE projects;
ANALYZE conversations;
ANALYZE messages;
ANALYZE knowledge_base;
ANALYZE files;
ANALYZE activity_logs;
```

### Verify Vector Indexes

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexdef LIKE '%ivfflat%';
```

**Expected:** Vector indexes on:
- knowledge_base.embedding
- messages.embedding
- files.embedding
- memory_chunks.embedding

---

## Maintenance Schedule

### Daily
- Monitor dashboard_stats for anomalies
- Check recent_activity for unusual patterns

### Weekly
- Review monthly_cost_summary
- Run VACUUM ANALYZE on high-traffic tables:
  ```sql
  VACUUM ANALYZE messages;
  VACUUM ANALYZE activity_logs;
  VACUUM ANALYZE api_cost_tracking;
  ```

### Monthly
- Run cleanup functions:
  ```sql
  SELECT cleanup_old_activity_logs();
  SELECT cleanup_old_auth_logs();
  SELECT cleanup_old_cost_data();
  ```
- Review storage usage in file_stats
- Archive old conversations if needed

---

## Next Steps

After successful deployment:

1. ✅ Update application code to use new tables
2. ✅ Test file upload and processing
3. ✅ Test activity logging in API routes
4. ✅ Test cost tracking integration
5. ✅ Set up automated cleanup jobs (optional)
6. ✅ Configure budget alerts in budget_config table
7. ✅ Review and test RLS policies with real users

---

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs
2. Review error messages carefully
3. Verify SQL syntax in SQL Editor
4. Test queries incrementally
5. Check SCHEMA.md for reference

---

## Success Criteria

Migration is successful when:

- ✅ All 23 core tables exist
- ✅ All views are accessible
- ✅ All functions execute without errors
- ✅ Vector search returns results
- ✅ RLS policies enforce access control
- ✅ Test script shows 95%+ success rate
- ✅ No errors in Supabase logs

---

**Good luck with your deployment!** 🚀
