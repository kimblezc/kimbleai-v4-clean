# KimbleAI Database Schema Documentation

**Version:** 4.0
**Database:** Supabase PostgreSQL with pgvector
**Last Updated:** 2025-10-01
**Target Users:** Zach (zach.kimble@gmail.com) and Rebecca (becky.aza.kimble@gmail.com)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Feature Tables](#feature-tables)
4. [Support Tables](#support-tables)
5. [Views](#views)
6. [Functions](#functions)
7. [Indexes](#indexes)
8. [Row Level Security (RLS)](#row-level-security-rls)
9. [Migration History](#migration-history)
10. [Performance Optimization](#performance-optimization)

---

## Overview

The KimbleAI database is optimized for **2 users** (Zach and Rebecca) and designed for:
- AI-powered conversations with long-term memory
- Project and task management
- Audio transcription with semantic search
- File management and processing
- Cost tracking and budget monitoring
- Activity logging and analytics
- Content categorization and organization

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- Trigram search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
```

---

## Core Tables

### 1. `users`

**Purpose:** User accounts with role-based permissions and preferences

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique user identifier |
| `name` | TEXT | User's display name |
| `email` | TEXT (UNIQUE) | Email address |
| `role` | TEXT | Role: 'admin', 'user', 'viewer' |
| `avatar_url` | TEXT | Profile picture URL |
| `preferences` | JSONB | User preferences (theme, notifications, AI settings) |
| `permissions` | JSONB | Permission flags and limits |
| `metadata` | JSONB | Additional user metadata |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_users_email` (email)
- `idx_users_role` (role)
- `idx_users_preferences_gin` (GIN on preferences)
- `idx_users_metadata_gin` (GIN on metadata)

**Default Users:**
- Zach (admin): `zach-admin-001` / `zach@kimbleai.com`
- Rebecca (user): `rebecca-user-001` / `rebecca@kimbleai.com`

---

### 2. `user_tokens`

**Purpose:** OAuth tokens for Google integration (Drive, Calendar, Gmail)

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT (PK, FK → users) | User ID |
| `email` | TEXT | User email |
| `access_token` | TEXT | OAuth access token |
| `refresh_token` | TEXT | OAuth refresh token |
| `token_type` | TEXT | Token type (Bearer) |
| `expires_at` | TIMESTAMPTZ | Token expiration |
| `scope` | TEXT | OAuth scopes granted |
| `updated_at` | TIMESTAMPTZ | Last token refresh |

**Indexes:**
- `idx_user_tokens_user_id` (user_id)

---

### 3. `projects`

**Purpose:** Project organization with hierarchical structure and collaboration

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique project identifier |
| `name` | TEXT | Project name |
| `description` | TEXT | Project description |
| `status` | TEXT | Status: 'active', 'completed', 'paused', 'archived' |
| `priority` | TEXT | Priority: 'low', 'medium', 'high', 'critical' |
| `owner_id` | TEXT (FK → users) | Project owner |
| `collaborators` | TEXT[] | Array of collaborator user IDs |
| `parent_project_id` | TEXT (FK → projects) | Parent project for hierarchies |
| `category_id` | TEXT (FK → content_categories) | Content category |
| `tags` | TEXT[] | Array of tags |
| `metadata` | JSONB | Deadlines, budget, tech stack, URLs |
| `stats` | JSONB | Activity statistics |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_projects_owner_id` (owner_id)
- `idx_projects_status` (status)
- `idx_projects_priority` (priority)
- `idx_projects_category` (category_id)
- `idx_projects_updated_at` (updated_at DESC)
- `idx_projects_owner_status` (owner_id, status)
- `idx_projects_metadata_gin` (GIN on metadata)
- `idx_projects_stats_gin` (GIN on stats)
- `idx_projects_name_fts` (Full-text search on name + description)

---

### 4. `conversations`

**Purpose:** AI conversation threads with context and categorization

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique conversation identifier |
| `user_id` | TEXT (FK → users) | Conversation owner |
| `project_id` | TEXT (FK → projects) | Associated project |
| `category_id` | TEXT (FK → content_categories) | Content category |
| `title` | TEXT | Conversation title |
| `summary` | TEXT | AI-generated summary |
| `status` | TEXT | Status: 'active', 'archived', etc. |
| `tags` | TEXT[] | Array of tags |
| `participant_count` | INTEGER | Number of participants |
| `message_count` | INTEGER | Number of messages |
| `last_message_at` | TIMESTAMPTZ | Last message timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_conversations_user_id` (user_id)
- `idx_conversations_project_id` (project_id)
- `idx_conversations_category` (category_id)
- `idx_conversations_updated_at` (updated_at DESC)
- `idx_conversations_user_created` (user_id, created_at DESC)

**Triggers:**
- Auto-updates `message_count` and `last_message_at` on message insert/delete

---

### 5. `messages`

**Purpose:** Individual messages in conversations with embeddings for semantic search

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique message identifier |
| `conversation_id` | TEXT (FK → conversations) | Parent conversation |
| `user_id` | TEXT (FK → users) | Message author |
| `role` | TEXT | Role: 'user', 'assistant', 'system' |
| `content` | TEXT | Message content |
| `embedding` | vector(1536) | OpenAI embedding for semantic search |
| `metadata` | JSONB | Additional metadata |
| `tokens_used` | INTEGER | Token count for cost tracking |
| `processing_time_ms` | INTEGER | Processing time in milliseconds |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `idx_messages_conversation_id` (conversation_id)
- `idx_messages_user_id` (user_id)
- `idx_messages_created_at` (created_at DESC)
- `idx_messages_user_conversation` (user_id, conversation_id)
- `idx_messages_conv_created` (conversation_id, created_at DESC)
- `idx_messages_embedding` (IVFFlat vector index for similarity search)
- `idx_messages_content_fts` (Full-text search on content)

---

### 6. `knowledge_base`

**Purpose:** Long-term memory and knowledge extracted from various sources

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique knowledge item identifier |
| `user_id` | TEXT (FK → users) | Knowledge owner |
| `source_type` | TEXT | Source: 'conversation', 'drive', 'email', 'upload', 'manual' |
| `source_id` | TEXT | Source item ID |
| `category` | TEXT | Knowledge category |
| `category_id` | TEXT (FK → content_categories) | Content category |
| `title` | TEXT | Knowledge item title |
| `content` | TEXT | Knowledge content |
| `embedding` | vector(1536) | OpenAI embedding for semantic search |
| `importance` | FLOAT | Importance score (0-1) |
| `confidence` | FLOAT | Confidence score (0-1) |
| `tags` | TEXT[] | Array of tags |
| `metadata` | JSONB | Additional metadata |
| `access_count` | INTEGER | Number of times accessed |
| `last_accessed` | TIMESTAMPTZ | Last access timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_knowledge_base_user_id` (user_id)
- `idx_knowledge_base_source_type` (source_type)
- `idx_knowledge_base_category` (category)
- `idx_knowledge_base_category_id` (category_id)
- `idx_knowledge_base_importance` (importance DESC)
- `idx_knowledge_base_created_at` (created_at DESC)
- `idx_knowledge_base_user_created` (user_id, created_at DESC)
- `idx_knowledge_base_user_source` (user_id, source_type)
- `idx_knowledge_base_embedding` (IVFFlat vector index)
- `idx_knowledge_base_content_fts` (Full-text search on content)
- `idx_knowledge_base_metadata_gin` (GIN on metadata)

---

## Feature Tables

### 7. `audio_transcriptions`

**Purpose:** Audio file transcriptions with Whisper API

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique transcription identifier |
| `user_id` | TEXT | Transcription owner |
| `project_id` | TEXT (FK → projects) | Associated project |
| `category_id` | TEXT (FK → content_categories) | Content category |
| `filename` | TEXT | Original filename |
| `file_size` | BIGINT | File size in bytes |
| `duration` | FLOAT | Audio duration in seconds |
| `text` | TEXT | Transcribed text |
| `segments` | JSONB | Word-level timestamps from Whisper |
| `language` | TEXT | Detected language |
| `auto_categorized` | BOOLEAN | Whether auto-categorized |
| `category_confidence` | FLOAT | Category confidence score |
| `metadata` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_audio_transcriptions_user_id` (user_id)
- `idx_audio_transcriptions_project_id` (project_id)
- `idx_audio_transcriptions_category` (category_id)
- `idx_audio_transcriptions_created_at` (created_at DESC)
- `idx_transcriptions_project` (project_id)
- `idx_transcriptions_user_project` (user_id, project_id)

---

### 8. `files`

**Purpose:** Uploaded files with semantic search capabilities

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique file identifier (file_*) |
| `user_id` | TEXT (FK → users) | File owner |
| `project_id` | TEXT (FK → projects) | Associated project |
| `filename` | TEXT | Display filename |
| `original_filename` | TEXT | Original upload filename |
| `file_type` | TEXT | Type: 'audio', 'image', 'pdf', 'document', etc. |
| `mime_type` | TEXT | MIME type |
| `size_bytes` | BIGINT | File size in bytes |
| `storage_path` | TEXT | Supabase Storage path |
| `status` | TEXT | Status: 'processing', 'completed', 'error' |
| `metadata` | JSONB | Duration, dimensions, page count, etc. |
| `processed_content` | TEXT | Extracted text content |
| `embedding` | vector(1536) | OpenAI embedding for semantic search |
| `tags` | TEXT[] | Array of tags |
| `created_at` | TIMESTAMPTZ | Upload timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_files_user` (user_id)
- `idx_files_project` (project_id)
- `idx_files_type` (file_type)
- `idx_files_status` (status)
- `idx_files_created` (created_at DESC)
- `idx_files_embedding` (IVFFlat vector index)

**Trigger:**
- `update_files_updated_at` (auto-update updated_at)

---

### 9. `content_categories`

**Purpose:** Hierarchical content categorization (D&D, Military, Business, etc.)

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique category identifier |
| `name` | TEXT (UNIQUE) | Category name |
| `description` | TEXT | Category description |
| `icon` | TEXT | Emoji or icon name |
| `color` | TEXT | Hex color code |
| `parent_category_id` | TEXT (FK → content_categories) | Parent category |
| `keywords` | TEXT[] | Keywords for auto-detection |
| `metadata` | JSONB | Additional metadata |
| `created_by` | TEXT (FK → users) | Creator user ID |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_content_categories_name` (name)
- `idx_content_categories_parent` (parent_category_id)
- `idx_content_categories_created_by` (created_by)

**Default Categories:**
- D&D (🎲) - D&D campaigns and sessions
- Military Transition (🎖️) - Military career transition
- Development (💻) - Software development
- Business (💼) - Business meetings and strategy
- Personal (🏠) - Personal notes and life management
- General (📁) - Uncategorized content

---

## Support Tables

### 10. `activity_logs`

**Purpose:** User activity tracking for audit trail and analytics

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL (PK) | Unique log entry identifier |
| `user_id` | TEXT (FK → users) | User who performed action |
| `action_type` | TEXT | Action: 'created', 'updated', 'deleted', 'uploaded', etc. |
| `resource_type` | TEXT | Resource: 'project', 'file', 'conversation', etc. |
| `resource_id` | TEXT | Resource identifier |
| `resource_name` | TEXT | Human-readable resource name |
| `metadata` | JSONB | Additional metadata |
| `ip_address` | TEXT | Client IP address |
| `user_agent` | TEXT | Client user agent |
| `created_at` | TIMESTAMPTZ | Action timestamp |

**Indexes:**
- `idx_activity_user` (user_id)
- `idx_activity_type` (action_type)
- `idx_activity_resource_type` (resource_type)
- `idx_activity_resource_id` (resource_id)
- `idx_activity_created` (created_at DESC)
- `idx_activity_user_created` (user_id, created_at DESC)

**Cleanup:**
- `cleanup_old_activity_logs()` deletes logs older than 90 days

---

### 11. `auth_logs`

**Purpose:** Authentication event logging for security monitoring

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL (PK) | Unique log entry identifier |
| `email` | TEXT | User email |
| `event_type` | TEXT | Event: 'signin_success', 'signin_blocked', etc. |
| `ip_address` | TEXT | Client IP address |
| `user_agent` | TEXT | Client user agent |
| `success` | BOOLEAN | Whether auth attempt succeeded |
| `metadata` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Event timestamp |

**Indexes:**
- `idx_auth_logs_email` (email)
- `idx_auth_logs_event_type` (event_type)
- `idx_auth_logs_created` (created_at DESC)
- `idx_auth_logs_email_created` (email, created_at DESC)

**Cleanup:**
- `cleanup_old_auth_logs()` deletes logs older than 90 days

---

### 12. `api_cost_tracking`

**Purpose:** Track every API call with token usage and cost for budget monitoring

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique tracking entry identifier |
| `user_id` | TEXT (FK → users) | User who triggered API call |
| `model` | TEXT | AI model used (e.g., gpt-4, gpt-3.5-turbo) |
| `endpoint` | TEXT | API endpoint called |
| `input_tokens` | INTEGER | Input token count |
| `output_tokens` | INTEGER | Output token count |
| `cost_usd` | DECIMAL(10, 6) | Cost in USD |
| `cached` | BOOLEAN | Whether response was cached |
| `timestamp` | TIMESTAMPTZ | API call timestamp |
| `metadata` | JSONB | Additional metadata |

**Indexes:**
- `idx_api_cost_tracking_user_id` (user_id)
- `idx_api_cost_tracking_timestamp` (timestamp DESC)
- `idx_api_cost_tracking_model` (model)
- `idx_api_cost_tracking_endpoint` (endpoint)
- `idx_api_cost_tracking_cost` (cost_usd DESC)
- `idx_api_cost_tracking_user_time` (user_id, timestamp DESC)

**Helper Functions:**
- `get_spending_since(since_timestamp, filter_user_id)` - Get spending for a time period
- `get_monthly_spending(filter_user_id)` - Get current month spending
- `get_daily_spending(filter_user_id)` - Get today's spending
- `get_hourly_spending(filter_user_id)` - Get current hour spending
- `get_top_expensive_calls(limit_count, since_days)` - Get most expensive API calls

---

### 13. `budget_alerts`

**Purpose:** Store budget alert history for monitoring and review

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique alert identifier |
| `severity` | TEXT | Severity: 'warning', 'critical', 'emergency' |
| `percent_used` | DECIMAL(5, 2) | Budget percentage used |
| `message` | TEXT | Alert message |
| `user_id` | TEXT (FK → users) | Associated user |
| `status` | JSONB | Budget status snapshot |
| `timestamp` | TIMESTAMPTZ | Alert timestamp |
| `acknowledged` | BOOLEAN | Whether alert was acknowledged |
| `acknowledged_at` | TIMESTAMPTZ | Acknowledgment timestamp |
| `acknowledged_by` | TEXT | Who acknowledged the alert |

**Indexes:**
- `idx_budget_alerts_severity` (severity)
- `idx_budget_alerts_timestamp` (timestamp DESC)
- `idx_budget_alerts_user_id` (user_id)
- `idx_budget_alerts_acknowledged` (acknowledged WHERE NOT acknowledged)

---

### 14. `budget_config`

**Purpose:** Per-user budget configuration and alert settings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique config identifier |
| `user_id` | TEXT (UNIQUE, FK → users) | User ID |
| `monthly_limit` | DECIMAL(10, 2) | Monthly spending limit in USD |
| `daily_limit` | DECIMAL(10, 2) | Daily spending limit in USD |
| `hourly_limit` | DECIMAL(10, 2) | Hourly spending limit in USD |
| `hard_stop_enabled` | BOOLEAN | Whether to hard-stop at budget limit |
| `alert_at_50` | BOOLEAN | Send alert at 50% budget |
| `alert_at_75` | BOOLEAN | Send alert at 75% budget |
| `alert_at_90` | BOOLEAN | Send alert at 90% budget |
| `alert_email` | TEXT | Email for budget alerts |
| `alert_webhook` | TEXT | Webhook URL for budget alerts |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_budget_config_user_id` (user_id)

---

### 15. `zapier_webhook_logs`

**Purpose:** Track Zapier webhook calls for monitoring and debugging

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique log entry identifier |
| `event_type` | TEXT | Event: 'conversation_saved', 'transcription_complete', etc. |
| `user_id` | TEXT | User who triggered webhook |
| `priority` | TEXT | Priority: 'low', 'medium', 'high', 'urgent' |
| `success` | BOOLEAN | Whether webhook call succeeded |
| `webhook_called` | BOOLEAN | Whether webhook was attempted |
| `webhook_id` | TEXT | Unique webhook call identifier |
| `error` | TEXT | Error message if failed |
| `payload_preview` | TEXT | Preview of webhook payload (first 500 chars) |
| `timestamp` | TIMESTAMPTZ | Webhook call timestamp |
| `created_at` | TIMESTAMPTZ | Log entry creation timestamp |

**Indexes:**
- `idx_zapier_logs_event_type` (event_type)
- `idx_zapier_logs_user_id` (user_id)
- `idx_zapier_logs_timestamp` (timestamp DESC)
- `idx_zapier_logs_success` (success)
- `idx_zapier_logs_user_event` (user_id, event_type, timestamp DESC)

---

## Views

### `dashboard_stats`

**Purpose:** Aggregated statistics per user for dashboard display

**Columns:**
- `user_id`, `user_name`, `user_email`
- `project_count`, `conversation_count`, `file_count`
- `transcription_count`, `knowledge_count`, `activity_count`
- `last_activity`, `total_storage_bytes`, `total_audio_duration_seconds`

**Example Query:**
```sql
SELECT * FROM dashboard_stats WHERE user_id = 'zach-admin-001';
```

---

### `recent_activity`

**Purpose:** Recent activity across all users (last 100 items)

**Columns:**
- `id`, `user_id`, `user_name`
- `action_type`, `resource_type`, `resource_id`, `resource_name`
- `metadata`, `created_at`

**Example Query:**
```sql
SELECT * FROM recent_activity LIMIT 20;
```

---

### `user_activity_summary`

**Purpose:** Daily activity summary per user (last 30 days)

**Columns:**
- `user_id`, `user_name`, `activity_date`
- `total_actions`, `resource_types_touched`
- `action_types`, `resource_types`

**Example Query:**
```sql
SELECT * FROM user_activity_summary WHERE user_id = 'zach-admin-001';
```

---

### `monthly_cost_summary`

**Purpose:** Monthly API cost breakdown per user

**Columns:**
- `month`, `user_id`
- `total_api_calls`, `total_input_tokens`, `total_output_tokens`
- `total_cost_usd`, `avg_cost_per_call`, `max_cost_per_call`, `cached_calls`

**Example Query:**
```sql
SELECT * FROM monthly_cost_summary ORDER BY month DESC LIMIT 6;
```

---

### `file_stats`

**Purpose:** File upload statistics grouped by user and file type

**Columns:**
- `user_id`, `file_type`
- `file_count`, `total_size_bytes`, `avg_size_bytes`, `latest_upload`

**Example Query:**
```sql
SELECT * FROM file_stats WHERE user_id = 'zach-admin-001';
```

---

### `category_stats`

**Purpose:** Aggregated statistics for each content category

**Columns:**
- `category_id`, `category_name`, `icon`, `color`
- `transcription_count`, `project_count`, `conversation_count`, `knowledge_count`
- `total_audio_size`, `total_audio_duration`, `last_activity`

**Example Query:**
```sql
SELECT * FROM category_stats ORDER BY last_activity DESC;
```

---

## Functions

### Vector Search Functions

#### `search_knowledge_base(query_embedding, user_id, match_count, similarity_threshold)`

Search knowledge base using vector similarity.

**Parameters:**
- `query_embedding` (vector(1536)) - OpenAI embedding
- `user_id` (TEXT) - User ID to filter by
- `match_count` (INT) - Number of results (default: 10)
- `similarity_threshold` (FLOAT) - Minimum similarity (default: 0.3)

**Returns:** Knowledge items with similarity scores

**Example:**
```sql
SELECT * FROM search_knowledge_base(
  '[0.1, 0.2, ...]'::vector(1536),
  'zach-admin-001',
  5,
  0.5
);
```

---

#### `search_memory_chunks(query_embedding, user_id, match_count, similarity_threshold)`

Search memory chunks using vector similarity.

**Returns:** Memory chunks with similarity scores

---

#### `search_files(query_embedding, user_id, match_count, similarity_threshold)`

Search uploaded files using vector similarity.

**Returns:** Files with processed content and similarity scores

---

### Utility Functions

#### `log_activity(user_id, action_type, resource_type, resource_id, resource_name, metadata)`

Log user activity.

**Example:**
```sql
SELECT log_activity(
  'zach-admin-001',
  'created',
  'project',
  'proj_123',
  'New AI Project',
  '{"priority": "high"}'::jsonb
);
```

---

#### `get_user_recent_activity(user_id, limit)`

Get recent activity for a specific user.

**Example:**
```sql
SELECT * FROM get_user_recent_activity('zach-admin-001', 50);
```

---

### Cleanup Functions

#### `cleanup_old_activity_logs()`

Delete activity logs older than 90 days. Returns count of deleted rows.

#### `cleanup_old_auth_logs()`

Delete auth logs older than 90 days. Returns count of deleted rows.

#### `cleanup_old_cost_data()`

Delete cost tracking data older than 90 days.

---

## Indexes

### Performance Indexes

| Table | Index Name | Columns | Type | Purpose |
|-------|------------|---------|------|---------|
| users | idx_users_email | email | B-tree | Fast user lookup |
| projects | idx_projects_owner_status | owner_id, status | B-tree | Filter projects by owner and status |
| conversations | idx_conversations_user_created | user_id, created_at DESC | B-tree | Recent conversations |
| messages | idx_messages_conv_created | conversation_id, created_at DESC | B-tree | Messages in conversation |
| knowledge_base | idx_knowledge_base_user_created | user_id, created_at DESC | B-tree | Recent knowledge items |
| files | idx_files_user | user_id | B-tree | User's files |
| activity_logs | idx_activity_user_created | user_id, created_at DESC | B-tree | Recent user activity |

### Vector Indexes

All vector indexes use **IVFFlat** algorithm with 100 lists for fast similarity search:

- `idx_knowledge_base_embedding` (knowledge_base.embedding)
- `idx_memory_chunks_embedding` (memory_chunks.embedding)
- `idx_messages_embedding` (messages.embedding)
- `idx_files_embedding` (files.embedding)

### Full-Text Search Indexes

GIN indexes for fast text search:

- `idx_knowledge_base_content_fts` (knowledge_base.content)
- `idx_messages_content_fts` (messages.content)
- `idx_projects_name_fts` (projects.name + description)

---

## Row Level Security (RLS)

### Security Model

KimbleAI uses **email-based RLS** for the two authorized users:
- zach.kimble@gmail.com (admin)
- becky.aza.kimble@gmail.com (user)

### RLS Policies

#### Users Table

- Users can access their own data
- Admins can access all data

#### Projects Table

- Owners and collaborators can access
- Admins can access all

#### Conversations & Messages

- Users can access their own conversations and messages
- Admins can access all

#### Knowledge Base & Memory Chunks

- Users can access their own knowledge and memory
- No cross-user access

#### Files Table

```sql
-- Users can view own files
CREATE POLICY "Users can view own files" ON files
  FOR SELECT USING (user_id IN (
    SELECT id FROM users
    WHERE email IN ('zach.kimble@gmail.com', 'becky.aza.kimble@gmail.com')
  ));

-- Similar policies for INSERT, UPDATE, DELETE
```

#### Activity Logs & Auth Logs

- Users can view their own logs
- System can insert logs (backend service)

#### Budget Tables

- Users can access their own budget data
- Service role can manage all budget data

---

## Migration History

### Applied Migrations

1. **complete_system_schema.sql** - Core tables (users, projects, conversations, messages, knowledge_base)
2. **api-cost-tracking.sql** - Cost monitoring tables (api_cost_tracking, budget_alerts, budget_config)
3. **content-organization-system.sql** - Content categories and organization
4. **add-project-to-transcriptions.sql** - Project support for audio transcriptions
5. **zapier-webhook-logs.sql** - Zapier integration logging
6. **COMPLETE_MIGRATION.sql** - Files, activity logs, auth logs, views, and functions

### Pending Actions

- [ ] Enable pgvector extension (if not already enabled)
- [ ] Run COMPLETE_MIGRATION.sql in Supabase SQL Editor
- [ ] Verify all tables and indexes exist
- [ ] Test RLS policies
- [ ] Set up automated cleanup jobs (cron)

---

## Performance Optimization

### Query Performance Tips

1. **Use Indexes:**
   - Filter by indexed columns (user_id, project_id, created_at)
   - Use composite indexes for common query patterns

2. **Vector Search:**
   - Set appropriate `similarity_threshold` (0.3-0.7)
   - Limit results with `match_count`
   - IVFFlat indexes provide ~10x speedup on large datasets

3. **Pagination:**
   - Always use LIMIT and OFFSET for large result sets
   - Use `created_at DESC` with indexes for chronological pagination

4. **JSONB Queries:**
   - Use GIN indexes for JSONB columns
   - Use `@>` operator for containment checks
   - Use `->` and `->>` for efficient JSONB access

### Database Maintenance

#### Vacuum and Analyze

```sql
-- Run weekly
VACUUM ANALYZE;

-- For specific high-traffic tables
VACUUM ANALYZE messages;
VACUUM ANALYZE activity_logs;
```

#### Cleanup Old Data

```sql
-- Run monthly
SELECT cleanup_old_activity_logs();  -- Returns deleted count
SELECT cleanup_old_auth_logs();
SELECT cleanup_old_cost_data();
```

### Connection Pooling

**Recommended Settings (for 2 users):**
- Min pool size: 2
- Max pool size: 10
- Connection timeout: 30s
- Idle timeout: 600s (10 minutes)

---

## Example Queries

### Get User Dashboard Data

```sql
SELECT * FROM dashboard_stats WHERE user_id = 'zach-admin-001';
```

### Search Knowledge Base

```sql
SELECT * FROM search_knowledge_base(
  (SELECT embedding FROM messages WHERE id = 'msg_123'),
  'zach-admin-001',
  10,
  0.5
);
```

### Get Recent User Activity

```sql
SELECT * FROM get_user_recent_activity('zach-admin-001', 20);
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

### Find All D&D Content

```sql
SELECT
  content_type,
  title,
  created_at
FROM get_category_content('category-dnd', 'zach-admin-001', 'all', 50, 0);
```

---

## Support and Maintenance

### Regular Tasks

**Daily:**
- Monitor dashboard_stats for anomalies
- Check recent_activity for unusual patterns

**Weekly:**
- Review monthly_cost_summary
- Run VACUUM ANALYZE on high-traffic tables

**Monthly:**
- Run cleanup functions
- Review and archive old conversations
- Analyze storage usage in file_stats

### Troubleshooting

**Slow queries?**
- Check if indexes are being used: `EXPLAIN ANALYZE <query>`
- Run ANALYZE on affected tables

**High storage usage?**
- Run cleanup functions
- Check file_stats for large files
- Consider archiving old data

**Vector search not working?**
- Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector'`
- Rebuild vector indexes if needed

---

## Contact

For database issues or questions:
- **Owner:** Zach Kimble (zach.kimble@gmail.com)
- **Database:** Supabase PostgreSQL
- **URL:** https://gbmefnaqsxtoseufjixp.supabase.co

---

**End of Documentation**
