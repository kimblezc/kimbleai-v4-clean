# Deploy Transcription Fix to Production

## ✅ Code Already Deployed
The code changes are already live on kimbleai.com (commit ae6971d is on master).

## ⚠️ Required: Run Database Migration

**You must run this SQL on your PRODUCTION Supabase database:**

### Step 1: Open Production SQL Editor
Go to: https://gbmefnaqsxtoseufjixp.supabase.co/project/_/sql

### Step 2: Run This SQL
```sql
-- Transcription Job Tracking Migration
ALTER TABLE audio_transcriptions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS job_id TEXT,
  ADD COLUMN IF NOT EXISTS assemblyai_id TEXT,
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS error TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id
  ON audio_transcriptions(job_id);

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_assemblyai_id
  ON audio_transcriptions(assemblyai_id);

CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_status
  ON audio_transcriptions(status);

-- Add unique constraint to job_id (but allow NULL for old records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id_unique
  ON audio_transcriptions(job_id)
  WHERE job_id IS NOT NULL;

-- Update existing records to have completed status
UPDATE audio_transcriptions
  SET status = 'completed',
      progress = 100
  WHERE status IS NULL;
```

### Step 3: Verify Migration
After running, you should see output like:
- `ALTER TABLE`
- `CREATE INDEX` (multiple times)
- `UPDATE X` (where X is the number of existing transcription records)

### Step 4: Test on Production
1. Go to https://kimbleai.com/transcribe
2. Select an audio file
3. Click "Transcribe"
4. Verify the progress bar moves smoothly from 0% to 100%
5. Verify it doesn't freeze at 50%

## What This Fixes

- ✅ Transcription progress tracking works across serverless instances
- ✅ No more "frozen at 50%" issue
- ✅ Real-time progress updates by querying AssemblyAI directly
- ✅ Persistent job state survives function restarts
- ✅ Proper error handling and display

## Files Changed (already deployed)
- `app/transcribe/page.tsx` - Fixed polling endpoint
- `app/api/transcribe/assemblyai/route.ts` - Added database-backed job tracking

## Status
- ✅ Code deployed to production
- ⚠️ Database migration needs to be run (see above)
- 🎯 Ready to test after migration
