# KimbleAI v4 - Database Migration Order

**Last Updated:** October 27, 2025
**Database:** Supabase PostgreSQL with pgvector
**Total Migrations:** 35 production migrations

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Migration Execution Order](#migration-execution-order)
3. [Migration Details](#migration-details)
4. [Rollback Procedures](#rollback-procedures)
5. [Verification Queries](#verification-queries)

---

## Quick Start

### For New Database Setup

Run the master migration file:
```sql
-- In Supabase SQL Editor:
-- Execute: database/run-all-migrations.sql
```

This single file runs all migrations in the correct order with error handling.

### For Existing Database

Check which migrations have been applied:
```sql
SELECT * FROM migration_history ORDER BY applied_at DESC;
```

Then run only the missing migrations from the list below.

---

## Migration Execution Order

### Phase 1: Core Schema (Foundation)

#### 1. COMPLETE_MIGRATION.sql
**Purpose:** Complete base schema with all core tables
**Dependencies:** None (fresh database)
**Execution Order:** 1
**Status:** Required
**Rollback:** Drop all tables (see rollback section)

**What it creates:**
- Extensions: `vector`, `pg_trgm`, `uuid-ossp`
- Core tables: `users`, `projects`, `conversations`, `messages`
- Knowledge base: `knowledge_base` with vector embeddings
- Files: `files`, `audio_transcriptions`, `processed_images`, `processed_documents`
- Activity tracking: `activity_logs`, `auth_logs`
- Indexes: Performance indexes on all major tables
- RLS policies: Row-level security on all tables

**Verification:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

### Phase 2: Authentication & User Management

#### 2. create_user_tokens_table.sql
**Purpose:** OAuth token storage for Google integration
**Dependencies:** COMPLETE_MIGRATION.sql (users table)
**Execution Order:** 2
**Rollback:** `DROP TABLE IF EXISTS user_tokens CASCADE;`

**What it creates:**
- `user_tokens` table for OAuth refresh/access tokens
- Unique constraint on user_id
- RLS policies for token security

**Verification:**
```sql
SELECT * FROM user_tokens LIMIT 1;
```

#### 3. supabase-migration-user_tokens.sql
**Purpose:** Supabase-specific user_tokens migration (alternative to #2)
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 2 (alternative)
**Note:** Use either #2 OR #3, not both

---

### Phase 3: Content Organization & Categories

#### 4. content-organization-system.sql
**Purpose:** Category system for organizing conversations, projects, files
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 3
**Rollback:** `DROP TABLE IF EXISTS categories CASCADE;`

**What it creates:**
- `categories` table with hierarchical structure
- `parent_id` for category trees
- Category metadata and icons
- RLS policies

**Verification:**
```sql
SELECT * FROM categories ORDER BY created_at;
```

---

### Phase 4: Project Enhancements

#### 5. add-project-to-transcriptions.sql
**Purpose:** Link transcriptions to projects
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 4
**Rollback:** `ALTER TABLE audio_transcriptions DROP COLUMN IF EXISTS project_id;`

**What it adds:**
- `project_id` column to `audio_transcriptions`
- Foreign key to `projects` table
- Auto-categorization fields

#### 6. add-project-id-to-conversations.sql
**Purpose:** Link conversations to projects
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 5
**Rollback:** `ALTER TABLE conversations DROP COLUMN IF EXISTS project_id;`

#### 7. add-conversation-pinning.sql
**Purpose:** Allow users to pin important conversations
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 6
**Rollback:** See file for column drops

**What it adds:**
- `is_pinned` BOOLEAN column
- `pinned_at` TIMESTAMPTZ column
- `pinned_by` TEXT column

#### 8. FIX_PROJECT_ID_TYPE.sql
**Purpose:** Fix project_id type inconsistencies
**Dependencies:** All project-related migrations
**Execution Order:** 7
**Important:** Run AFTER all project columns added

**What it fixes:**
- Ensures all project_id columns are TEXT type
- Fixes foreign key constraints
- Updates indexes

#### 9. COMPREHENSIVE_TYPE_FIX.sql
**Purpose:** Comprehensive type fixes across all tables
**Dependencies:** FIX_PROJECT_ID_TYPE.sql
**Execution Order:** 8
**Status:** Critical fix for type safety

**Verification:**
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name = 'project_id'
ORDER BY table_name;
```

#### 10. optimize-projects-FINAL.sql
**Purpose:** Performance optimization for projects table
**Dependencies:** All project migrations
**Execution Order:** 9
**Status:** Performance enhancement

**What it does:**
- Adds indexes on frequently queried columns
- Optimizes join performance
- Adds partial indexes for active projects

---

### Phase 5: Semantic Search & Embeddings

#### 11. add-embedding-columns.sql
**Purpose:** Add vector embedding columns to multiple tables
**Dependencies:** COMPLETE_MIGRATION.sql (vector extension)
**Execution Order:** 10
**Rollback:** See file for column drops

**What it adds:**
- `embedding vector(1536)` to conversations, projects, files
- GIN indexes for vector similarity search

#### 12. supabase-semantic-search-schema.sql
**Purpose:** Enhanced semantic search with metadata
**Dependencies:** add-embedding-columns.sql
**Execution Order:** 11

**What it creates:**
- `semantic_search_metadata` table
- Search performance tracking
- Query optimization functions

#### 13. create-semantic-search-function.sql
**Purpose:** PostgreSQL function for semantic similarity search
**Dependencies:** supabase-semantic-search-schema.sql
**Execution Order:** 12

**What it creates:**
- `search_knowledge_base(query_embedding, match_threshold, match_count)` function
- Optimized cosine similarity search
- Returns ranked results with scores

**Verification:**
```sql
\df search_knowledge_base
```

#### 14. add-knowledge-base-source-id-constraint.sql
**Purpose:** Add constraints to knowledge_base table
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 13

---

### Phase 6: File Management & Registry

#### 15. file-registry-migration.sql
**Purpose:** Enhanced file registry with metadata
**Dependencies:** COMPLETE_MIGRATION.sql (files table)
**Execution Order:** 14

**What it adds:**
- Enhanced file metadata JSONB fields
- File versioning support
- Thumbnail paths
- Processing status tracking

#### 16. file-integration-enhancement.sql
**Purpose:** Integration between files and other systems
**Dependencies:** file-registry-migration.sql
**Execution Order:** 15

**What it adds:**
- Links between files and knowledge base
- File relationships (duplicates, versions)
- Source tracking (gmail, drive, upload)

---

### Phase 7: Notifications & Alerts

#### 17. notifications-table-migration.sql
**Purpose:** User notification system
**Dependencies:** COMPLETE_MIGRATION.sql (users table)
**Execution Order:** 16
**Rollback:** `DROP TABLE IF EXISTS notifications CASCADE;`

**What it creates:**
- `notifications` table
- Notification types, priorities, status
- Email notification tracking
- RLS policies

**Verification:**
```sql
SELECT * FROM notifications WHERE read = false ORDER BY created_at DESC;
```

---

### Phase 8: Backup System

#### 18. backups-table-migration.sql
**Purpose:** Automated backup tracking
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 17
**Rollback:** `DROP TABLE IF EXISTS backups CASCADE;`

**What it creates:**
- `backups` table
- Backup metadata (size, duration, file count)
- Google Drive backup tracking
- Restore point management

**Verification:**
```sql
SELECT * FROM backups ORDER BY created_at DESC LIMIT 10;
```

---

### Phase 9: Cost Tracking & Budget Management

#### 19. api-cost-tracking.sql
**Purpose:** Comprehensive API cost tracking system
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 18
**Rollback:** See file for all table drops

**What it creates:**
- `api_cost_tracking` - Per-request cost tracking
- `budget_config` - User budget limits
- `budget_alerts` - Alert history
- `cost_models` - AI model pricing
- Daily/monthly aggregation views
- Budget alert triggers

**Verification:**
```sql
SELECT * FROM api_cost_tracking ORDER BY timestamp DESC LIMIT 10;
SELECT * FROM budget_config;
```

#### 20. fix-cost-tracking-user-id-CORRECTED.sql
**Purpose:** Fix user_id type in cost tracking tables
**Dependencies:** api-cost-tracking.sql
**Execution Order:** 19
**Status:** Critical fix

**What it fixes:**
- Ensures user_id is TEXT, not UUID
- Matches user table schema
- Fixes foreign key constraints

#### 21. model-performance-tracking.sql
**Purpose:** Track AI model performance metrics
**Dependencies:** api-cost-tracking.sql
**Execution Order:** 20
**Status:** Phase 4 feature

**What it creates:**
- `model_performance_metrics` table
- Response time tracking
- Token usage statistics
- Error rate monitoring
- Quality ratings

**Verification:**
```sql
SELECT model_name, AVG(response_time_ms) as avg_response,
       AVG(total_tokens) as avg_tokens
FROM model_performance_metrics
GROUP BY model_name;
```

#### 22. model-cost-comparison-enhancement.sql
**Purpose:** Enhanced model cost comparison and analytics
**Dependencies:** model-performance-tracking.sql
**Execution Order:** 21
**Status:** Phase 4 feature

**What it adds:**
- Cost per task type
- Model recommendation engine
- Cost vs quality scoring
- Budget optimization suggestions

---

### Phase 10: Transcription System

#### 23. add-transcription-job-tracking.sql
**Purpose:** Track transcription job status
**Dependencies:** COMPLETE_MIGRATION.sql (audio_transcriptions table)
**Execution Order:** 22

**What it adds:**
- `job_id` column for AssemblyAI tracking
- `status` column for job state
- `error_message` column
- Job metadata

#### 24. MIGRATION_FIX_TRANSCRIPTION.sql
**Purpose:** Fix transcription table schema issues
**Dependencies:** add-transcription-job-tracking.sql
**Execution Order:** 23
**Status:** Critical fix

---

### Phase 11: Google Workspace Integration

#### 25. zapier-webhook-logs.sql
**Purpose:** Track Zapier webhook calls
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 24
**Rollback:** `DROP TABLE IF EXISTS zapier_webhook_logs CASCADE;`

**What it creates:**
- `zapier_webhook_logs` table
- Webhook request/response logging
- Error tracking
- Rate limiting data

#### 26. drive-edit-approval-schema.sql
**Purpose:** Drive file edit approval workflow
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 25
**Rollback:** `DROP TABLE IF EXISTS drive_edit_requests CASCADE;`

**What it creates:**
- `drive_edit_requests` table
- Approval workflow states
- Change tracking
- Audit trail

#### 27. indexing-state-schema.sql
**Purpose:** Track Gmail/Drive indexing state
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 26
**Rollback:** `DROP TABLE IF EXISTS indexing_state CASCADE;`

**What it creates:**
- `indexing_state` table
- Last sync timestamps
- Cursor/token storage
- Sync error tracking

**Verification:**
```sql
SELECT * FROM indexing_state ORDER BY last_indexed_at DESC;
```

---

### Phase 12: Device Sync & Continuity

#### 28. device-continuity.sql
**Purpose:** Cross-device context synchronization
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 27
**Rollback:** See file for table drops

**What it creates:**
- `devices` table - Device registry
- `device_sync_queue` - Pending sync items
- `device_context` - Active context per device
- Conflict resolution logic

**Verification:**
```sql
SELECT * FROM devices WHERE last_seen_at > NOW() - INTERVAL '1 hour';
```

---

### Phase 13: Autonomous Agents

#### 29. autonomous-agent-schema.sql
**Purpose:** Autonomous agent task queue and execution
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 28
**Rollback:** See file for table drops

**What it creates:**
- `agent_tasks` - Task queue
- `agent_findings` - Agent discoveries
- `agent_execution_log` - Execution history
- Task priority and scheduling

**Verification:**
```sql
SELECT status, COUNT(*) FROM agent_tasks GROUP BY status;
```

---

### Phase 14: Workflow Automation

#### 30. workflow_automation_schema.sql
**Purpose:** n8n-style workflow automation
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 29
**Rollback:** See file for table drops

**What it creates:**
- `workflows` table
- `workflow_executions` table
- `workflow_triggers` table
- `workflow_actions` table
- Trigger types: schedule, webhook, event
- Action types: email, API call, database update

**Verification:**
```sql
SELECT * FROM workflows WHERE active = true;
```

---

### Phase 15: ChatGPT Import

#### 31. chatgpt-import-schema.sql
**Purpose:** Import conversations from ChatGPT export
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 30
**Rollback:** See file for table drops

**What it creates:**
- `chatgpt_imports` table
- `chatgpt_conversations` table
- `chatgpt_messages` table
- Mapping to KimbleAI conversations

---

### Phase 16: API Logging & Monitoring

#### 32. api-logs-table.sql
**Purpose:** Basic API request logging
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 31
**Rollback:** `DROP TABLE IF EXISTS api_logs CASCADE;`

#### 33. api-logs-schema.sql
**Purpose:** Enhanced API logging with analytics
**Dependencies:** api-logs-table.sql
**Execution Order:** 32

**What it creates:**
- `api_logs` table with extended metadata
- Performance metrics
- Error categorization
- Rate limiting counters

---

### Phase 17: MCP (Model Context Protocol) Integration

#### 34. mcp-servers-schema.sql
**Purpose:** MCP server management and monitoring
**Dependencies:** COMPLETE_MIGRATION.sql
**Execution Order:** 33
**Status:** Phase 2 feature

**What it creates:**
- `mcp_servers` table - Server registry
- `mcp_tools` table - Available tools per server
- `mcp_prompts` table - Reusable prompts
- `mcp_resources` table - Shared resources
- `mcp_health_checks` table - Health monitoring
- Server status tracking

**Verification:**
```sql
SELECT name, status, last_health_check
FROM mcp_servers
WHERE active = true;
```

---

### Phase 18: Utility Migrations

#### 35. COMBINED-CRITICAL-MIGRATIONS.sql
**Purpose:** Combines several critical fixes
**Dependencies:** Multiple previous migrations
**Execution Order:** 34
**Status:** Legacy - components may be redundant

**Note:** Review this file - many fixes may already be applied by previous migrations.

---

## Rollback Procedures

### Full Database Reset (DANGER - Deletes ALL data)

```sql
-- DO NOT RUN IN PRODUCTION WITHOUT BACKUP!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Rollback Single Migration

Each migration file includes rollback instructions in comments. General pattern:

```sql
-- Rollback table creation
DROP TABLE IF EXISTS table_name CASCADE;

-- Rollback column addition
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;

-- Rollback function creation
DROP FUNCTION IF EXISTS function_name;
```

### Rollback by Phase

#### Rollback Phase 17 (MCP)
```sql
DROP TABLE IF EXISTS mcp_health_checks CASCADE;
DROP TABLE IF EXISTS mcp_resources CASCADE;
DROP TABLE IF EXISTS mcp_prompts CASCADE;
DROP TABLE IF EXISTS mcp_tools CASCADE;
DROP TABLE IF EXISTS mcp_servers CASCADE;
```

#### Rollback Phase 13 (Agents)
```sql
DROP TABLE IF EXISTS agent_execution_log CASCADE;
DROP TABLE IF EXISTS agent_findings CASCADE;
DROP TABLE IF EXISTS agent_tasks CASCADE;
```

#### Rollback Phase 9 (Cost Tracking)
```sql
DROP TABLE IF EXISTS model_performance_metrics CASCADE;
DROP TABLE IF EXISTS budget_alerts CASCADE;
DROP TABLE IF EXISTS budget_config CASCADE;
DROP TABLE IF EXISTS cost_models CASCADE;
DROP TABLE IF EXISTS api_cost_tracking CASCADE;
```

---

## Verification Queries

### Check All Tables Created
```sql
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY table_name;
```

### Check RLS Status
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check Extensions
```sql
SELECT * FROM pg_extension WHERE extname IN ('vector', 'pg_trgm', 'uuid-ossp');
```

### Check Indexes
```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Foreign Keys
```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### Check Migration Status (if migration_history table exists)
```sql
SELECT migration_name, applied_at, success
FROM migration_history
ORDER BY applied_at DESC;
```

---

## Migration Best Practices

### Before Running Migrations

1. **Backup database:**
   ```bash
   pg_dump -h your-db-host -U postgres -d postgres > backup.sql
   ```

2. **Test in development first:**
   - Run migrations on local Supabase instance
   - Verify all tables created
   - Test application functionality

3. **Check for conflicts:**
   ```sql
   -- Check if table already exists
   SELECT * FROM information_schema.tables WHERE table_name = 'your_table';
   ```

### During Migration

1. **Run in transaction (when possible):**
   ```sql
   BEGIN;
   -- Run migration
   -- Verify results
   COMMIT; -- or ROLLBACK if issues
   ```

2. **Check for errors:**
   - Review Supabase SQL Editor output
   - Check for constraint violations
   - Verify indexes created

3. **Document applied migrations:**
   ```sql
   INSERT INTO migration_history (migration_name, applied_at, success)
   VALUES ('migration-file-name.sql', NOW(), true);
   ```

### After Migration

1. **Verify data integrity:**
   ```sql
   SELECT COUNT(*) FROM your_new_table;
   ```

2. **Test application:**
   - Run full test suite
   - Test affected features manually
   - Check for console errors

3. **Monitor performance:**
   - Check query performance
   - Verify indexes are used
   - Monitor database load

---

## Common Issues & Solutions

### Issue: "relation already exists"
**Solution:** Migration already applied. Skip or use `IF NOT EXISTS`.

### Issue: "column does not exist"
**Solution:** Dependency migration not run. Check execution order.

### Issue: "foreign key constraint fails"
**Solution:** Referenced table doesn't exist. Check dependencies.

### Issue: "permission denied"
**Solution:** Use service_role key or run as postgres user.

### Issue: "vector extension not found"
**Solution:** Enable pgvector extension first:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Migration File Naming Convention

Pattern: `{description}-{date}.sql` or `{ORDER}_{DESCRIPTION}.sql`

Examples:
- `COMPLETE_MIGRATION.sql` - Base schema
- `add-project-id-to-conversations.sql` - Descriptive change
- `FIX_PROJECT_ID_TYPE.sql` - Fix migration
- `model-performance-tracking.sql` - Feature addition

---

## Support

For migration issues:
1. Check Supabase SQL Editor error messages
2. Verify dependencies are met
3. Review rollback procedures
4. Contact: zach.kimble@gmail.com

---

**End of Migration Order Documentation**
