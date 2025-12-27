# KimbleAI Database Schema Documentation

**Last Updated**: 2025-12-26
**Purpose**: Definitive source of truth for all database table schemas
**Status**: 🔴 CRITICAL - Multiple schema mismatches found in codebase

---

## ⚠️ SCHEMA MISMATCH ALERT

The comprehensive codebase audit revealed **critical schema mismatches** across 280+ database operations.

**Primary Issues**:
1. `user_id` used as both UUID and string ("zach"/"rebecca")
2. Many columns referenced in code don't exist in database
3. Metadata JSONB structure inconsistent
4. Missing tables referenced in code

---

## Table: `uploaded_files`

**Actual Schema** (verified from working operations):

```sql
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY,                    -- UUID v4 format ONLY
  user_id UUID NOT NULL REFERENCES users(id),  -- MUST be UUID, not string
  filename TEXT NOT NULL,
  file_type TEXT,                         -- MIME type
  file_size BIGINT,                       -- bytes
  metadata JSONB,                         -- ALL extra data goes here
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Metadata JSONB Structure**:
```json
{
  "originalName": "test.pdf",
  "uploadedAt": "2025-12-26T07:00:00.000Z",
  "category": "pdf",
  "projectId": "general",
  "status": "processing",
  "processingResult": { ... },
  "processedAt": "2025-12-26T07:05:00.000Z",
  "errorMessage": "...",
  "batchUpload": true
}
```

**Columns that DO NOT exist** (common mistakes in code):
- ❌ `project_id` (use `metadata->>'projectId'` instead)
- ❌ `status` (use `metadata->>'status'` instead)
- ❌ `category` (use `metadata->>'category'` instead)
- ❌ `processing_result` (use `metadata->'processingResult'` instead)
- ❌ `processed_at` (use `metadata->>'processedAt'` instead)
- ❌ `error_message` (use `metadata->>'errorMessage'` instead)

**Correct INSERT**:
```typescript
await supabase.from('uploaded_files').insert({
  id: crypto.randomUUID(),              // ✅ UUID v4
  user_id: userData.id,                 // ✅ UUID from users table
  filename: file.name,                  // ✅ Exists
  file_type: file.type,                 // ✅ Exists
  file_size: file.size,                 // ✅ Exists
  metadata: {                           // ✅ JSONB field
    category: 'pdf',
    status: 'processing',
    projectId: 'general'
  }
});
```

**Incorrect INSERT** (causes errors):
```typescript
await supabase.from('uploaded_files').insert({
  id: `file_${randomHex}`,     // ❌ Not valid UUID
  user_id: 'zach',             // ❌ Not UUID
  category: 'pdf',             // ❌ Column doesn't exist
  status: 'processing',        // ❌ Column doesn't exist
  project_id: 'general'        // ❌ Column doesn't exist
});
```

---

## Table: `users`

**Actual Schema** (inferred from usage):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,              -- "Zach" or "Rebecca"
  email TEXT UNIQUE NOT NULL,
  usage_stats JSONB,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**User Lookup Pattern**:
```typescript
// ✅ CORRECT: Lookup by name to get UUID
const { data: userData } = await supabase
  .from('users')
  .select('id')
  .eq('name', userId === 'rebecca' ? 'Rebecca' : 'Zach')
  .single();

// Then use userData.id (UUID) for foreign keys
```

**Common Mistake**:
```typescript
// ❌ WRONG: Using string name directly
.insert({ user_id: 'zach' })  // Should be userData.id
```

---

## Table: `conversations`

**Actual Schema**:

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),  -- UUID, not string
  title TEXT,
  project_id UUID REFERENCES projects(id),     -- MAY NOT EXIST in all schemas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT FALSE
);
```

**Schema Migration Issue**:
- `project_id` column may not exist in older deployments
- Code has fallback logic in `conversations/[id]/route.ts` lines 36-73

---

## Table: `messages`

**Actual Schema**:

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,              -- 'user' or 'assistant'
  content TEXT NOT NULL,
  embedding VECTOR(1536),          -- MAY NOT EXIST in all schemas
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ            -- MAY NOT EXIST
);
```

**Optional Columns**:
- `embedding` - pgvector extension required
- `edited_at` - added later, may not exist
- `metadata` - structure varies

---

## Table: `projects`

**Actual Schema**:

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  owner_id UUID REFERENCES users(id),          -- May be same as user_id
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',                -- 'active', 'archived', etc.
  priority TEXT DEFAULT 'medium',              -- 'low', 'medium', 'high', 'critical'
  deadline TIMESTAMPTZ,
  tags TEXT[],                                 -- Postgres array
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table: `knowledge_base`

**Actual Schema**:

```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  source_type TEXT NOT NULL,       -- 'conversation', 'email', 'drive', 'audio_transcript', 'api'
  source_id TEXT NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  content TEXT,                    -- Often truncated to 2000 chars
  embedding VECTOR(1536),          -- MAY NOT EXIST
  importance DECIMAL(3, 2),        -- 0.00 to 1.00
  tags TEXT[],                     -- Postgres array
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);  -- If pgvector enabled
```

---

## Table: `audio_transcriptions`

**Actual Schema**:

```sql
CREATE TABLE audio_transcriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  project_id TEXT,                 -- Note: TEXT not UUID
  file_id TEXT,
  filename TEXT NOT NULL,
  file_size BIGINT,
  storage_url TEXT,
  duration INTEGER,                -- seconds
  status TEXT DEFAULT 'processing',
  text TEXT,                       -- full transcript
  words JSONB,                     -- word-level timing
  utterances JSONB,                -- speaker diarization
  chapters JSONB,                  -- auto-chapters
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Optional Columns** (may not exist):
- `progress` INTEGER
- `language` TEXT
- `confidence_score` DECIMAL

---

## Table: `tags`

**Actual Schema**:

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,              -- normalized lowercase
  display_name TEXT NOT NULL,      -- original case
  category TEXT,                   -- 'Personal', 'Work', 'Project', etc.
  color TEXT,                      -- hex color
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ON tags (user_id, name);
```

---

## Table: `sessions`

**Actual Schema**:

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,           -- Note: TEXT not UUID (legacy)
  session_id UUID,
  device_name TEXT,
  project_path TEXT,
  title TEXT,
  summary TEXT,
  files_modified INTEGER DEFAULT 0,
  git_commits INTEGER DEFAULT 0,
  todos JSONB,                     -- array of todo objects
  key_decisions JSONB,             -- array
  next_steps JSONB,                -- array
  git_branch TEXT,
  git_commit_hash TEXT,
  tags TEXT[],
  working_directory TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

---

## Table: `processed_images`

**Status**: ⚠️ MAY NOT EXIST

Referenced in `app/api/chat/route.ts` line 1943 but no CREATE TABLE found.

**Expected Schema** (if exists):
```sql
CREATE TABLE processed_images (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  source_type TEXT,
  file_path TEXT,
  mime_type TEXT,
  size BIGINT,
  width INTEGER,
  height INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Table: `processed_documents`

**Status**: ⚠️ MAY NOT EXIST

Similar to processed_images, referenced but schema unknown.

---

## Missing Tables Referenced in Code

These tables are used in code but may not exist:

1. **`file_registry`** - Used in backup-system.ts
2. **`user_tokens`** - Used in chat/route.ts
3. **`backups`** - Used in backup-system.ts
4. **`archie_runs`** - Archie agent logging
5. **`archie_issues`** - Archie issue tracking
6. **`archie_fix_attempts`** - Archie fix tracking
7. **`archie_learning`** - Archie learning data
8. **`archie_metrics`** - Archie performance metrics

---

## Common Schema Mistakes to Avoid

### 1. UUID vs String Confusion
```typescript
// ❌ WRONG
user_id: 'zach'

// ✅ CORRECT
const { data: userData } = await supabase
  .from('users')
  .select('id')
  .eq('name', 'Zach')
  .single();
user_id: userData.id  // This is a UUID
```

### 2. Column Existence Assumptions
```typescript
// ❌ WRONG - Assumes column exists
.insert({ project_id: projectId })

// ✅ CORRECT - Store in metadata
.insert({ metadata: { projectId } })
```

### 3. ID Generation
```typescript
// ❌ WRONG - Not valid UUID
id: `file_${crypto.randomBytes(16).toString('hex')}`

// ✅ CORRECT - Proper UUID v4
id: crypto.randomUUID()
```

### 4. Array Handling
```typescript
// ❌ WRONG - JSON array in TEXT column
tags: JSON.stringify(['tag1', 'tag2'])

// ✅ CORRECT - Postgres array
tags: ['tag1', 'tag2']
```

### 5. Metadata Merging
```typescript
// ❌ WRONG - Overwrites all metadata
.update({ metadata: { newField: value } })

// ✅ CORRECT - Merge with existing
const { data: current } = await supabase
  .from('table')
  .select('metadata')
  .eq('id', id)
  .single();

await supabase
  .from('table')
  .update({
    metadata: { ...current.metadata, newField: value }
  })
  .eq('id', id);
```

---

## Schema Validation Rules

All database operations MUST follow these rules:

1. **IDs must be UUID v4 format**
   - Use `crypto.randomUUID()`
   - Never use custom prefixes like `file_`, `user_`, etc.

2. **User IDs must be UUIDs**
   - Lookup user by name to get UUID
   - Never use string names directly in foreign keys

3. **Check column existence before use**
   - If column may not exist, use metadata JSONB
   - Query metadata with `metadata->>'field'`

4. **Arrays must use Postgres array type**
   - Not JSON strings
   - Use TEXT[] or UUID[] or INTEGER[]

5. **Timestamps should use database defaults**
   - Let `created_at` and `updated_at` auto-populate
   - Only set manually if specific timestamp needed

6. **Metadata should store optional/variable data**
   - Use JSONB for flexible schemas
   - Don't create columns for rarely-used fields

---

## Migration Checklist

Before deploying code that accesses database:

- [ ] Verified all columns exist in schema
- [ ] User ID lookup returns UUID (not using string)
- [ ] ID generation uses `crypto.randomUUID()`
- [ ] Optional fields stored in metadata JSONB
- [ ] Arrays use Postgres array type (TEXT[])
- [ ] No assumptions about column existence
- [ ] Tested with actual database schema

---

## References

- **Comprehensive Audit**: See task output from Explore agent (ID: a1e62cc)
- **Schema Mismatches Found**: 280+ SELECT, 150+ INSERT, 80+ UPDATE operations
- **Files Affected**: 277+ files with Supabase operations
