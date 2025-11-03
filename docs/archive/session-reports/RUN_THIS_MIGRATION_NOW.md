# 🚨 CRITICAL: Run This Database Migration NOW

**Status**: Code is deployed, but database migration is NOT run yet
**Impact**: Transcription exports may fail without this migration
**Time Required**: 2 minutes

---

## Step 1: Open Production SQL Editor

Go to: **https://gbmefnaqsxtoseufjixp.supabase.co/project/_/sql**

---

## Step 2: Copy and Run This SQL

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

---

## Step 3: Verify Success

You should see output like:
```
✅ ALTER TABLE
✅ CREATE INDEX
✅ CREATE INDEX
✅ CREATE INDEX
✅ CREATE INDEX
✅ UPDATE X rows (where X = number of existing transcription records)
```

---

## Step 4: Test Transcription Exports

1. Go to: **https://kimbleai.com/transcribe**
2. Select an audio file from Drive
3. Click "Transcribe"
4. Wait for transcription to complete
5. **Test all download formats**:
   - Click **TXT** button → File should download
   - Click **JSON** button → File should download
   - Click **SRT** button → File should download
   - Click **Export All to Drive** → Should upload 4 files to Drive

---

## Step 5: Report Results

After testing, let me know:
- ✅ Migration ran successfully (no errors)
- ✅ Transcription progress works (0% → 100%)
- ✅ Downloads work (TXT, JSON, SRT)
- ✅ Drive export works (uploads 4 files)

OR

- ❌ Any errors encountered

---

## What This Migration Does

- Adds `status`, `job_id`, `assemblyai_id`, `progress`, `error` columns to track transcription jobs
- Creates indexes for fast lookups
- Ensures unique job_ids
- Sets existing records to "completed" status

Without this, transcription progress may freeze at 50% and downloads may fail.

---

## After Migration Succeeds

Delete this file and continue with Phase 2 (Directory Cleanup).
