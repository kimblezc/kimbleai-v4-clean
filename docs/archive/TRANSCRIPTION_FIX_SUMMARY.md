# Transcription Fix Summary

## Problem
Transcription was freezing at 50% due to two issues:

1. **Wrong polling endpoint**: Frontend was calling `/api/transcribe/status` instead of `/api/transcribe/assemblyai`
2. **In-memory job storage**: Job status was stored in memory (Map), which doesn't work across serverless instances

## Solution Implemented

### 1. Frontend Fix (app/transcribe/page.tsx)
Changed the polling endpoint from `/api/transcribe/status` to `/api/transcribe/assemblyai`:

```typescript
// Before
const response = await fetch(`/api/transcribe/status?jobId=${jobId}`);

// After
const response = await fetch(`/api/transcribe/assemblyai?jobId=${jobId}`);
```

### 2. Backend Fix (app/api/transcribe/assemblyai/route.ts)

#### Added database-backed job tracking:
- Create job record in database immediately when job starts
- Store AssemblyAI transcript ID in database
- Update progress in database in real-time
- GET endpoint queries database first, then queries AssemblyAI directly for real-time status

#### Key changes:
1. **processAssemblyAIFromUrl()** - Creates DB record at start, updates with AssemblyAI ID
2. **updateJobStatus()** - Now updates both in-memory and database
3. **GET endpoint** - Queries database first, then AssemblyAI API for latest status
4. **Error handling** - Stores errors in database

### 3. Database Migration Required

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Add job tracking fields to audio_transcriptions table
ALTER TABLE audio_transcriptions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS job_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS assemblyai_id TEXT,
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS error TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_job_id ON audio_transcriptions(job_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_assemblyai_id ON audio_transcriptions(assemblyai_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_status ON audio_transcriptions(status);

-- Update existing records
UPDATE audio_transcriptions
SET status = 'completed', progress = 100
WHERE status IS NULL;

-- Add comments
COMMENT ON COLUMN audio_transcriptions.status IS 'Job status: queued, uploading, processing, analyzing, saving, completed, error';
COMMENT ON COLUMN audio_transcriptions.job_id IS 'Internal job ID for tracking (e.g., assemblyai_timestamp_random)';
COMMENT ON COLUMN audio_transcriptions.assemblyai_id IS 'AssemblyAI transcript ID for querying their API';
COMMENT ON COLUMN audio_transcriptions.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN audio_transcriptions.error IS 'Error message if status is error';
```

## How It Works Now

1. User clicks "Transcribe" button
2. POST to `/api/transcribe/drive-assemblyai` creates job with unique ID (e.g., `assemblyai_1234567890_abc123`)
3. **Job record created in database immediately** with status='starting', progress=30
4. Backend starts processing:
   - Calls AssemblyAI API to start transcription
   - **Stores AssemblyAI transcript ID in database**
   - Updates progress in database as it processes (35%, 40%, etc.)
5. Frontend polls `/api/transcribe/assemblyai?jobId=...` every 5 seconds
6. GET endpoint:
   - **Queries database for job record**
   - If found and in-progress, **queries AssemblyAI API directly for real-time status**
   - Returns current progress
7. When complete, database record updated with final text and metadata
8. Frontend shows 100% complete

## Benefits

- ✅ Works across serverless instances (Vercel, AWS Lambda, etc.)
- ✅ Real-time progress updates by querying AssemblyAI directly
- ✅ Persistent job state survives function cold starts
- ✅ Error states properly tracked and displayed
- ✅ No more "frozen at 50%" issue

## Testing

To test the fix:

1. Apply the database migration (SQL above)
2. Restart the dev server: `npm run dev`
3. Go to `/transcribe` page
4. Select an audio file and click "Transcribe"
5. Observe the progress bar moving smoothly from 0% to 100%
6. Check browser console and server logs for status updates

## Files Modified

- `app/transcribe/page.tsx` - Fixed polling endpoint
- `app/api/transcribe/assemblyai/route.ts` - Added database-backed job tracking
- `database/add-transcription-job-tracking.sql` - Migration for new columns
