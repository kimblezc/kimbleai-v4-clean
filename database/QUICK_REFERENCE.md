# Database Quick Reference

**Quick access to common database operations for kimbleai.com**

---

## Common Queries

### Get User Dashboard Stats

```sql
SELECT * FROM dashboard_stats WHERE user_id = 'zach-admin-001';
```

Returns: projects, conversations, files, transcriptions, knowledge items, total storage, last activity

### Get Recent Activity (Last 20)

```sql
SELECT
  user_name,
  action_type,
  resource_type,
  resource_name,
  created_at
FROM recent_activity
LIMIT 20;
```

### Check Monthly API Costs

```sql
SELECT
  month,
  total_cost_usd,
  total_api_calls,
  avg_cost_per_call
FROM monthly_cost_summary
WHERE user_id = 'zach-admin-001'
ORDER BY month DESC
LIMIT 6;
```

### Search Knowledge Base (Vector Search)

```sql
SELECT * FROM search_knowledge_base(
  '[0.1, 0.2, ...]'::vector(1536),  -- Your query embedding
  'zach-admin-001',                   -- User ID
  10,                                 -- Number of results
  0.5                                 -- Similarity threshold (0.0-1.0)
);
```

### Search Files (Semantic Search)

```sql
SELECT * FROM search_files(
  '[0.1, 0.2, ...]'::vector(1536),  -- Your query embedding
  'zach-admin-001',                   -- User ID
  10,                                 -- Number of results
  0.3                                 -- Similarity threshold
);
```

### Log User Activity

```sql
SELECT log_activity(
  'zach-admin-001',                   -- User ID
  'created',                          -- Action type
  'project',                          -- Resource type
  'proj_123',                         -- Resource ID
  'New AI Project',                   -- Resource name
  '{"priority": "high"}'::jsonb       -- Metadata
);
```

### Get User's Recent Activity

```sql
SELECT * FROM get_user_recent_activity('zach-admin-001', 50);
```

### Check Current Month Spending

```sql
SELECT get_monthly_spending('zach-admin-001');
```

### Check Today's Spending

```sql
SELECT get_daily_spending('zach-admin-001');
```

### Get Top 10 Most Expensive API Calls (Last 7 Days)

```sql
SELECT * FROM get_top_expensive_calls(10, 7);
```

### Find All D&D Content

```sql
SELECT * FROM get_category_content(
  'category-dnd',      -- Category ID
  'zach-admin-001',    -- User ID
  'all',               -- Content type: 'all', 'audio', 'projects', 'conversations', 'knowledge'
  50,                  -- Limit
  0                    -- Offset
);
```

### Auto-Categorize Text

```sql
SELECT * FROM auto_categorize_content(
  'We had an amazing D&D session last night with epic combat!',
  'zach-admin-001'
);
```

Returns: Suggested categories with confidence scores

### Get File Statistics

```sql
SELECT
  file_type,
  file_count,
  total_size_bytes,
  avg_size_bytes,
  latest_upload
FROM file_stats
WHERE user_id = 'zach-admin-001';
```

### Get Category Statistics

```sql
SELECT
  category_name,
  transcription_count,
  project_count,
  conversation_count,
  knowledge_count,
  last_activity
FROM category_stats
ORDER BY last_activity DESC;
```

---

## Maintenance Operations

### Run Database Cleanup (Monthly)

```sql
-- Delete old activity logs (> 90 days)
SELECT cleanup_old_activity_logs();  -- Returns deleted count

-- Delete old auth logs (> 90 days)
SELECT cleanup_old_auth_logs();      -- Returns deleted count

-- Delete old cost tracking data (> 90 days)
SELECT cleanup_old_cost_data();
```

### Optimize Database Performance (Weekly)

```sql
-- Update query planner statistics
VACUUM ANALYZE;

-- For specific high-traffic tables
VACUUM ANALYZE messages;
VACUUM ANALYZE activity_logs;
VACUUM ANALYZE api_cost_tracking;
VACUUM ANALYZE knowledge_base;
```

### Check Table Sizes

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Rebuild Vector Indexes (If Needed)

```sql
-- Drop and recreate vector indexes
DROP INDEX IF EXISTS idx_knowledge_base_embedding;
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

DROP INDEX IF EXISTS idx_messages_embedding;
CREATE INDEX idx_messages_embedding ON messages
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

DROP INDEX IF EXISTS idx_files_embedding;
CREATE INDEX idx_files_embedding ON files
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Useful Administrative Queries

### List All Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### List All Views

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

### List All Functions

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### Check Extensions

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('vector', 'pg_trgm', 'uuid-ossp');
```

### Count Rows in All Tables

```sql
SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Check RLS Policies

```sql
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Data Validation Queries

### Check for Orphaned Records

```sql
-- Messages without conversations
SELECT COUNT(*)
FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c WHERE c.id = m.conversation_id
);

-- Projects without owners
SELECT COUNT(*)
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = p.owner_id
);

-- Knowledge base without users
SELECT COUNT(*)
FROM knowledge_base kb
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = kb.user_id
);
```

### Check for Missing Embeddings

```sql
-- Knowledge base items without embeddings
SELECT COUNT(*)
FROM knowledge_base
WHERE embedding IS NULL;

-- Messages without embeddings
SELECT COUNT(*)
FROM messages
WHERE embedding IS NULL;

-- Files without embeddings
SELECT COUNT(*)
FROM files
WHERE embedding IS NULL AND status = 'completed';
```

### Validate Budget Configuration

```sql
SELECT
  u.name,
  u.email,
  bc.monthly_limit,
  bc.daily_limit,
  bc.hard_stop_enabled,
  get_monthly_spending(u.id) as current_month_spending,
  (get_monthly_spending(u.id) / bc.monthly_limit * 100)::numeric(5,2) as percent_used
FROM users u
LEFT JOIN budget_config bc ON bc.user_id = u.id;
```

---

## Performance Monitoring

### Slow Query Analysis

```sql
-- View currently running queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

### Most Used Tables

```sql
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC
LIMIT 10;
```

### Cache Hit Ratio

```sql
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;
```

**Good:** > 95% cache hit ratio
**Bad:** < 90% cache hit ratio

---

## Backup & Recovery

### Create Manual Backup (via Supabase Dashboard)

1. Go to Database → Backups
2. Click "Create Backup"
3. Wait for completion

### Restore from Backup

1. Go to Database → Backups
2. Select backup
3. Click "Restore"
4. Confirm

### Export Table to CSV (via psql or Supabase Studio)

```sql
COPY (
  SELECT * FROM activity_logs WHERE created_at >= NOW() - INTERVAL '30 days'
) TO '/tmp/activity_logs_export.csv' CSV HEADER;
```

---

## TypeScript Code Examples

### Query Dashboard Stats

```typescript
const { data: stats } = await supabase
  .from('dashboard_stats')
  .select('*')
  .eq('user_id', userId)
  .single();

console.log(`Projects: ${stats.project_count}`);
console.log(`Conversations: ${stats.conversation_count}`);
console.log(`Files: ${stats.file_count}`);
```

### Log Activity

```typescript
await supabase.rpc('log_activity', {
  p_user_id: userId,
  p_action_type: 'created',
  p_resource_type: 'project',
  p_resource_id: projectId,
  p_resource_name: projectName,
  p_metadata: { priority: 'high' }
});
```

### Vector Search Knowledge Base

```typescript
// Get embedding first
const embedding = await getEmbedding(query);

// Search knowledge base
const { data: results } = await supabase.rpc('search_knowledge_base', {
  query_embedding: embedding,
  p_user_id: userId,
  match_count: 10,
  similarity_threshold: 0.5
});
```

### Check Monthly Spending

```typescript
const { data: spending } = await supabase.rpc('get_monthly_spending', {
  filter_user_id: userId
});

const { data: config } = await supabase
  .from('budget_config')
  .select('monthly_limit')
  .eq('user_id', userId)
  .single();

const percentUsed = (spending / config.monthly_limit) * 100;
console.log(`Budget used: ${percentUsed.toFixed(1)}%`);
```

### Get Recent Activity

```typescript
const { data: activities } = await supabase
  .from('recent_activity')
  .select('*')
  .limit(20);

activities.forEach(activity => {
  console.log(`${activity.user_name} ${activity.action_type} ${activity.resource_type}: ${activity.resource_name}`);
});
```

---

## Emergency Procedures

### Database is Slow

1. Check currently running queries:
   ```sql
   SELECT * FROM pg_stat_activity WHERE state != 'idle';
   ```

2. Kill long-running query (if needed):
   ```sql
   SELECT pg_terminate_backend(pid);
   ```

3. Run VACUUM ANALYZE:
   ```sql
   VACUUM ANALYZE;
   ```

### Running Out of Storage

1. Check table sizes:
   ```sql
   SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

2. Run cleanup functions:
   ```sql
   SELECT cleanup_old_activity_logs();
   SELECT cleanup_old_auth_logs();
   SELECT cleanup_old_cost_data();
   ```

3. Archive old conversations/projects manually

### Budget Exceeded

1. Check current spending:
   ```sql
   SELECT user_id, get_monthly_spending(user_id) FROM users;
   ```

2. Check top expensive calls:
   ```sql
   SELECT * FROM get_top_expensive_calls(20, 7);
   ```

3. Adjust budget limits:
   ```sql
   UPDATE budget_config
   SET monthly_limit = 1000.00
   WHERE user_id = 'zach-admin-001';
   ```

### RLS Not Working

1. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

2. Check policies:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

3. Test with specific user context:
   ```sql
   SET app.current_user_id = 'zach-admin-001';
   SELECT * FROM projects;  -- Should only see user's projects
   ```

---

## Contact & Support

**Database Issues:** Check Supabase Dashboard → Logs
**Performance Issues:** Run VACUUM ANALYZE
**Migration Issues:** See DEPLOYMENT_GUIDE.md
**Schema Reference:** See SCHEMA.md

**Owner:** Zach Kimble (zach.kimble@gmail.com)
**Database:** https://gbmefnaqsxtoseufjixp.supabase.co

---

**Keep this file handy for quick database operations!**
