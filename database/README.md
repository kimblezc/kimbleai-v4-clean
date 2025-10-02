# Database Migration & Schema Documentation

**KimbleAI v4 - Complete Database Setup**

---

## Quick Start

**To deploy the complete database schema:**

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp/sql)
2. Run `COMPLETE_MIGRATION.sql`
3. Verify with `node scripts/test-database-schema.js`

**That's it!** All tables, indexes, views, and functions will be created.

---

## Documentation Files

### 🚀 **COMPLETE_MIGRATION.sql** - MAIN MIGRATION SCRIPT
**START HERE for deployment**

The complete, idempotent migration script that creates:
- All tables (23 total)
- All indexes (50+ including vector indexes)
- All views (10 analytics views)
- All functions (15+ utility functions)
- All RLS policies (comprehensive security)
- All foreign key constraints
- All triggers

**Safe to run multiple times.** Uses `IF NOT EXISTS` everywhere.

---

### 📚 **SCHEMA.md** - Complete Documentation
**Comprehensive reference guide**

1,000+ lines of detailed documentation covering:
- All 23 tables with column descriptions
- All 10+ views with example queries
- All 15+ functions with usage examples
- All indexes and their purposes
- RLS policies and security model
- Performance optimization tips
- Troubleshooting guide
- Example queries for common operations

**Read this to understand the entire database structure.**

---

### 🎯 **DEPLOYMENT_GUIDE.md** - Step-by-Step Instructions
**Follow this to deploy safely**

Complete deployment walkthrough:
- Pre-deployment checklist
- Step-by-step migration process
- Verification queries
- Post-deployment testing
- Troubleshooting common issues
- Rollback procedures
- Maintenance schedule

**Follow this for a successful deployment.**

---

### 📊 **DEPLOYMENT_SUMMARY.md** - Executive Summary
**High-level overview of everything**

Detailed summary including:
- What was created (all files and scripts)
- Current status and test results
- Database schema overview
- Performance optimizations
- Migration history
- Next steps for application integration

**Read this for the big picture.**

---

### ⚡ **QUICK_REFERENCE.md** - Common Operations
**Handy reference for daily use**

Quick access to:
- Common SQL queries
- Maintenance operations
- Performance monitoring
- Data validation
- TypeScript code examples
- Emergency procedures

**Keep this bookmarked for quick lookups.**

---

## Original Migration Files

### Historical Reference (Now Consolidated)

These original migration files are now **consolidated into COMPLETE_MIGRATION.sql**:

1. **api-cost-tracking.sql** - Cost monitoring tables and functions
2. **add-project-to-transcriptions.sql** - Project support for transcriptions
3. **content-organization-system.sql** - Content categories and organization
4. **zapier-webhook-logs.sql** - Zapier webhook logging

**You don't need to run these individually.** They're all included in COMPLETE_MIGRATION.sql.

---

## Test & Validation Scripts

### `../scripts/audit-database.js`
Audits current database state:
- Lists all existing tables
- Shows row counts
- Checks pgvector extension

**Usage:**
```bash
node scripts/audit-database.js
```

### `../scripts/test-database-schema.js`
Comprehensive test suite (45 tests):
- Validates all tables exist
- Checks key columns exist
- Tests RLS policies
- Tests sample queries

**Usage:**
```bash
node scripts/test-database-schema.js
```

**Current Results:**
- Before migration: 91.1% pass rate (41/45 tests)
- After migration: Expected 100% pass rate (45/45 tests)

---

## Database Schema Overview

### 23 Core Tables

**Users & Auth:**
- users, user_tokens, user_activity_log, auth_logs

**Projects:**
- projects, project_tasks, project_tags

**Conversations & AI:**
- conversations, messages, conversation_summaries

**Knowledge & Memory:**
- knowledge_base, memory_chunks, message_references

**Files:**
- indexed_files, audio_transcriptions, files

**Activity & Monitoring:**
- activity_logs, zapier_webhook_logs

**Cost & Budget:**
- api_cost_tracking, budget_alerts, budget_config

**Content Organization:**
- content_categories

### 10+ Database Views

Analytics and monitoring:
- dashboard_stats (user overview)
- recent_activity (activity feed)
- user_activity_summary (daily stats)
- monthly_cost_summary (API costs)
- file_stats (storage analytics)
- category_stats (content categories)
- daily_cost_summary, cost_by_model, cost_by_endpoint
- transcription_stats

### 15+ Utility Functions

**Vector Search:**
- search_knowledge_base
- search_memory_chunks
- search_files

**Activity Logging:**
- log_activity
- get_user_recent_activity

**Cost Tracking:**
- get_spending_since
- get_monthly_spending
- get_daily_spending
- get_hourly_spending
- get_top_expensive_calls

**Content Organization:**
- get_category_content
- auto_categorize_content
- search_category_content

**Maintenance:**
- cleanup_old_activity_logs
- cleanup_old_auth_logs
- cleanup_old_cost_data

---

## Deployment Status

### Current Status (Before Migration)

```
✅ All core tables exist
✅ Basic functionality working
⚠️ 4 missing columns (category_id on various tables)
⚠️ Some views may not be created
⚠️ Some functions may not exist

Test Results: 91.1% (41/45 tests passed)
```

### Expected Status (After Migration)

```
✅ All 23 tables exist with complete schema
✅ All 50+ indexes created (including vector indexes)
✅ All 10+ views created
✅ All 15+ functions created
✅ All RLS policies enforced
✅ All foreign key constraints added
✅ All triggers configured

Test Results: 100% (45/45 tests passed)
```

---

## How to Deploy

### Step 1: Backup (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gbmefnaqsxtoseufjixp)
2. Click **Database** → **Backups**
3. Create a manual backup

### Step 2: Run Migration

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy/paste entire contents of `COMPLETE_MIGRATION.sql`
4. Click **Run**
5. Wait for completion (~10-30 seconds)

**Expected output:**
```
NOTICE: ✅ Migration complete! Found 23 core tables.
```

### Step 3: Verify

Run test script:
```bash
node scripts/test-database-schema.js
```

**Expected:** 100% success rate

### Step 4: Optimize

```sql
VACUUM ANALYZE;
```

**Done!** Your database is ready.

---

## Maintenance

### Daily (Automated)
- Monitor dashboard_stats
- Check recent_activity

### Weekly (5 min)
- Review monthly_cost_summary
- Check file_stats

```sql
VACUUM ANALYZE messages;
VACUUM ANALYZE activity_logs;
```

### Monthly (15 min)
- Run cleanup functions

```sql
SELECT cleanup_old_activity_logs();  -- Returns deleted count
SELECT cleanup_old_auth_logs();
SELECT cleanup_old_cost_data();
```

---

## Common Operations

### Get User Dashboard

```sql
SELECT * FROM dashboard_stats WHERE user_id = 'zach-admin-001';
```

### Log Activity

```sql
SELECT log_activity(
  'zach-admin-001',
  'created',
  'project',
  'proj_123',
  'New Project',
  '{}'::jsonb
);
```

### Search Knowledge Base

```typescript
const { data } = await supabase.rpc('search_knowledge_base', {
  query_embedding: embedding,
  p_user_id: userId,
  match_count: 10,
  similarity_threshold: 0.5
});
```

### Check Monthly Costs

```sql
SELECT get_monthly_spending('zach-admin-001');
```

**More examples:** See QUICK_REFERENCE.md

---

## Troubleshooting

### Migration Fails

**Check:**
1. Are you using the correct Supabase project?
2. Do you have admin access?
3. Is pgvector extension enabled?

**Solution:** See DEPLOYMENT_GUIDE.md → Troubleshooting section

### Tests Fail

**Expected failures before migration:**
- 4 missing category_id columns (fixed by migration)

**Unexpected failures:**
- Check Supabase logs
- Verify migration completed
- Re-run migration (it's idempotent)

### Performance Issues

```sql
VACUUM ANALYZE;
```

**See:** QUICK_REFERENCE.md → Performance Monitoring

---

## File Structure

```
database/
├── README.md                          ← You are here
├── COMPLETE_MIGRATION.sql            ← ⭐ RUN THIS to deploy
├── SCHEMA.md                         ← 📚 Complete documentation
├── DEPLOYMENT_GUIDE.md               ← 🚀 Step-by-step guide
├── DEPLOYMENT_SUMMARY.md             ← 📊 Executive summary
├── QUICK_REFERENCE.md                ← ⚡ Common operations
├── api-cost-tracking.sql             ← ℹ️ Original (consolidated)
├── add-project-to-transcriptions.sql ← ℹ️ Original (consolidated)
├── content-organization-system.sql   ← ℹ️ Original (consolidated)
└── zapier-webhook-logs.sql           ← ℹ️ Original (consolidated)

../scripts/
├── audit-database.js                 ← 🔍 Audit tool
└── test-database-schema.js           ← ✅ Test suite
```

---

## Support

**Questions?** Check these in order:

1. **QUICK_REFERENCE.md** - Common operations
2. **SCHEMA.md** - Detailed documentation
3. **DEPLOYMENT_GUIDE.md** - Deployment help
4. **Supabase Logs** - Error messages

**Contact:**
- Owner: Zach Kimble (zach.kimble@gmail.com)
- Database: https://gbmefnaqsxtoseufjixp.supabase.co

---

## Success Criteria

✅ Migration successful when:

1. COMPLETE_MIGRATION.sql runs without errors
2. Test script shows 100% success rate
3. dashboard_stats returns data for 2 users
4. Vector search functions work
5. RLS policies enforce access control

---

## Next Steps

After deployment:

1. ✅ Deploy COMPLETE_MIGRATION.sql
2. ✅ Run test-database-schema.js (verify 100%)
3. ✅ Update application code to use new tables
4. ✅ Implement activity logging in API routes
5. ✅ Add dashboard using dashboard_stats view
6. ✅ Set up cost monitoring alerts
7. ✅ Configure budget_config table

---

**Ready to deploy?** 🚀

Run `COMPLETE_MIGRATION.sql` in Supabase SQL Editor!

---

**Documentation created by:** Database Schema & Migration Specialist
**Date:** 2025-10-01
**Version:** 1.0
