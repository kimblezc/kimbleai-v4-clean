# Export Logs Table Setup

## Status: ⚠️ **Manual Setup Required**

The `export_logs` table needs to be created in your Supabase database to enable export history logging.

## Current Behavior

- ✅ **Batch export works perfectly** without the table
- ✅ **Single export works perfectly** without the table
- ⚠️ Export logging will fail silently (doesn't affect functionality)
- ⚠️ Export history API will return empty array until table is created

## How to Create the Table

### Option 1: Supabase SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Create a new query
5. Paste the following SQL:

```sql
-- Create export_logs table for tracking export history
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  transcription_count INTEGER NOT NULL DEFAULT 1,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  transcription_ids TEXT[],
  results JSONB,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_created_at ON export_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_type ON export_logs(export_type);
```

6. Click **Run** to execute

### Option 2: Enable RLS (Row Level Security)

After creating the table, optionally add RLS policies:

```sql
-- Enable RLS
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own export logs
CREATE POLICY "Users can view own export logs"
  ON export_logs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Allow service role to insert logs
CREATE POLICY "Service role can insert logs"
  ON export_logs
  FOR INSERT
  WITH CHECK (true);
```

## Verification

After creating the table, verify it works by:

1. Running a test export:
   ```bash
   npx tsx scripts/test-batch-export.ts
   ```

2. Check the export logs API:
   ```bash
   curl "https://www.kimbleai.com/api/export-logs?userId=zach"
   ```

3. You should see export history with timestamps, success counts, etc.

## Benefits Once Enabled

- 📊 **Track all exports** - See when transcriptions were exported
- 📈 **Success/failure metrics** - Monitor export reliability
- 🔍 **Audit trail** - Know what was exported, when, and where
- 📁 **Project organization** - See which projects have most exports
- 🔄 **Batch vs Single** - Distinguish between batch and single exports

## API Endpoints

### Get Export Logs
```
GET /api/export-logs?userId=zach&limit=50
```

### Setup Check
```
POST /api/setup-export-logs
```

Returns whether the table exists and provides SQL if needed.
