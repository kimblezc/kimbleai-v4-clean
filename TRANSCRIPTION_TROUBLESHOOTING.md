# Audio Transcription Troubleshooting Guide

## 🚨 Quick Diagnosis

If transcription fails, check these in order:

### 1. Check AssemblyAI API Key (Most Common)
```bash
# In Vercel Dashboard or .env.local
echo $ASSEMBLYAI_API_KEY

# Should output: (your API key starting with...)
# If empty or undefined, transcription will fail
```

**Fix:**
```bash
# Add to .env.local (development)
ASSEMBLYAI_API_KEY=9e34453814d74ca98efbbb14c69baa8d

# Add to Vercel (production)
vercel env add ASSEMBLYAI_API_KEY
# Paste: 9e34453814d74ca98efbbb14c69baa8d
```

---

### 2. File Size Check

**Your system supports:**
- ✅ Browser upload → AssemblyAI: **Up to 2GB** (no limit)
- ❌ Direct server upload: **50MB max** (Vercel limit)

**Error: "Failed to fetch"**
**Cause:** Trying to upload >50MB through server

**Fix:** Use the hourglass button (direct browser upload)

---

### 3. Check Progress Status

```bash
# Get job status
curl https://kimbleai.com/api/transcribe/status?jobId=YOUR_JOB_ID

# Response should show:
{
  "jobId": "...",
  "progress": 45,
  "eta": 120,
  "status": "transcribing",  # or "queued", "processing", "completed", "failed"
  "error": null
}
```

---

### 4. Check Vercel Logs

```bash
# View real-time logs
vercel logs kimbleai --follow

# Look for:
[ASSEMBLYAI] Job xxx started
[ASSEMBLYAI] Upload complete
[ASSEMBLYAI] Transcription started: transcript_id
[ASSEMBLYAI] Progress: 45%
[ASSEMBLYAI] Completed successfully
```

**Common error messages:**
```
[ASSEMBLYAI] API key not configured
→ Fix: Add ASSEMBLYAI_API_KEY to Vercel

[ASSEMBLYAI] Failed to parse formData
→ Fix: Use direct browser upload for large files

[ASSEMBLYAI] Transcription timed out
→ Fix: Increase maxDuration in vercel.json
```

---

## 🔧 Fixes by Error Message

### Error: "AssemblyAI API key not configured"

**Cause:** Missing environment variable

**Fix:**
```bash
# Vercel Dashboard → Settings → Environment Variables
# Add: ASSEMBLYAI_API_KEY = 9e34453814d74ca98efbbb14c69baa8d

# Then redeploy
vercel --prod
```

---

### Error: "Failed to fetch"

**Cause 1:** File > 50MB uploaded via server
**Fix:** Use hourglass button (direct upload)

**Cause 2:** Network timeout (long file)
**Fix:** Already configured - wait for completion (can close page)

**Cause 3:** Browser blocking API call
**Fix:** Check browser console for CORS errors

---

### Error: "Failed to parse audio file"

**Cause:** File corrupted or unsupported format

**Supported formats:**
- ✅ MP3, WAV, M4A, FLAC, OGG
- ✅ MP4, MOV (audio track extracted)
- ❌ Unsupported: WMA, AAC (raw)

**Fix:**
```bash
# Convert to MP3 (using ffmpeg)
ffmpeg -i input.wma output.mp3
```

---

### Error: "Daily usage limit exceeded"

**Cause:** Built-in cost protection (10 hours/day default)

**Current limit:** 10 hours of audio per day

**Fix:**
```bash
# Increase limit in .env.local or Vercel
MAX_DAILY_TRANSCRIPTION_HOURS=20
```

**Cost reference:**
- 10 hours/day = $4.10/day = $123/month
- 20 hours/day = $8.20/day = $246/month

---

### Error: "Transcription timed out"

**Cause:** Very long audio file (2-3+ hours)

**Current timeout:** 300 seconds (5 minutes) for processing

**Fix (already implemented):**
```json
// vercel.json
{
  "functions": {
    "app/api/transcribe/assemblyai/route.ts": {
      "maxDuration": 300,  // 5 minutes max
      "memory": 3008       // 3GB RAM
    }
  }
}
```

**Note:** AssemblyAI processes in background, so page can be closed

---

## 🧪 Test Transcription

### Test with small file (30 seconds)

1. Record short voice memo
2. Upload via hourglass button
3. Should complete in ~30 seconds

**Expected flow:**
```
⬆️ Uploading (10 seconds)
→ 🚀 Starting transcription (5 seconds)
→ 🎯 Transcribing (15 seconds)
→ 💾 Saving (5 seconds)
→ ✅ Complete
```

---

### Test with large file (2GB)

1. Upload via hourglass button (REQUIRED)
2. Progress will show:
   - 5-10%: Uploading to AssemblyAI
   - 20%: Upload complete
   - 25-90%: Transcribing
   - 95-100%: Saving
3. Can close page - continues in background
4. Check back later via status endpoint

**Expected time:**
- 1 hour audio = 5-10 minutes transcription
- 2 hour audio = 10-15 minutes transcription

---

## 🔍 Debug Mode

### Enable verbose logging

Add to `app/api/transcribe/assemblyai/route.ts`:

```typescript
// At top of file
const DEBUG_MODE = true;

// In upload function
if (DEBUG_MODE) {
  console.log('[DEBUG] Upload started:', {
    filename: audioFile.name,
    size: audioFile.size,
    type: audioFile.type
  });
}
```

### Check AssemblyAI directly

```bash
# Test API key
curl https://api.assemblyai.com/v2/transcript \
  -H "Authorization: Bearer 9e34453814d74ca98efbbb14c69baa8d" \
  -H "Content-Type: application/json" \
  -d '{"audio_url":"https://assembly.ai/wildfires.mp3"}' \
  -v

# Should return:
# HTTP/1.1 200 OK
# {"id":"transcript_xxx",...}

# If 401 Unauthorized:
# → API key is invalid or expired
```

---

## 📊 Monitor Transcription Usage

### Check current usage
```bash
curl https://kimbleai.com/api/costs?action=analytics&days=30 | jq '.breakdowns.byModel."assemblyai-transcription"'

# Response:
{
  "totalCost": 12.30,       # $12.30 spent
  "totalCalls": 30,         # 30 transcriptions
  "avgCostPerCall": 0.41    # $0.41 average
}
```

### Calculate hours transcribed
```sql
SELECT
  COUNT(*) as total_transcriptions,
  SUM(duration) / 3600 as total_hours,
  (SUM(duration) / 3600) * 0.41 as estimated_cost
FROM audio_transcriptions
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

## 🚀 Performance Optimization

### Current Configuration (Optimal)

```typescript
// Cost-optimized settings (line 53-66 in route.ts)
const transcriptRequest = {
  audio_url: audioUrl,
  speaker_labels: true,    // ✅ ENABLED: Speaker diarization ($0.04/hr)
  // ALL other features DISABLED for 37% cost savings
  // Base: $0.37/hr + Speaker: $0.04/hr = $0.41/hr total
};
```

**Disabled features (saved $0.24/hr):**
- auto_chapters: $0.03/hr
- sentiment_analysis: $0.02/hr
- entity_detection: $0.08/hr
- iab_categories: $0.15/hr
- content_safety: $0.02/hr
- auto_highlights: $0.03/hr
- summarization: $0.03/hr

**Why disabled:**
- Your auto-tagging system (Agent B) provides these features
- Free (no API cost)
- More customizable
- Works offline

---

## 🐛 Common Issues

### Issue: Transcription stuck at "Starting transcription"

**Cause:** AssemblyAI queue backlog

**Fix:** Wait 1-2 minutes. AssemblyAI processes requests in queue order.

**Check status:**
```bash
# Poll status every 5 seconds
watch -n 5 'curl -s "https://kimbleai.com/api/transcribe/status?jobId=YOUR_JOB_ID" | jq'
```

---

### Issue: "You can close this page" but never completes

**Cause:** Background process crashed

**Debug:**
```bash
# Check Vercel logs
vercel logs --follow

# Look for:
[ASSEMBLYAI] Job xxx failed: ...
```

**Fix:** Usually auto-retries. If not, re-upload file.

---

### Issue: Transcription completes but no text shown

**Cause:** Database save failed

**Check:**
```sql
SELECT * FROM audio_transcriptions
WHERE id = 'YOUR_TRANSCRIPTION_ID';

# If empty:
# → Transcription completed but save failed
# → Check Supabase logs for errors
```

**Fix:**
```bash
# Check Supabase connection
curl https://kimbleai.com/api/health

# Should return:
{
  "status": "ok",
  "database": "connected"
}
```

---

### Issue: Auto-tags not generated

**Cause:** Auto-tagger failed (non-fatal)

**Check logs:**
```bash
vercel logs --follow | grep AutoTagging

# Look for:
[AutoTagging] Analysis failed: ...
```

**Fix:** Re-run auto-tagging manually:
```bash
# TODO: Create admin endpoint to re-run auto-tagging
curl -X POST https://kimbleai.com/api/admin/retag-transcription \
  -d '{"transcriptionId":"xxx"}'
```

---

## 📞 Emergency Troubleshooting

### Transcription completely broken

**Step 1: Check API key**
```bash
# Vercel Dashboard
vercel env ls | grep ASSEMBLYAI
```

**Step 2: Test AssemblyAI directly**
```bash
curl https://api.assemblyai.com/v2/upload \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@test.mp3"
```

**Step 3: Check recent deploys**
```bash
vercel ls kimbleai

# If recent deploy:
# → Rollback to previous version
vercel rollback
```

**Step 4: Check Supabase**
```sql
-- Verify table exists
SELECT COUNT(*) FROM audio_transcriptions;

-- Check recent transcriptions
SELECT * FROM audio_transcriptions
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Health Check Checklist

Before debugging, verify:

- [ ] AssemblyAI API key set in Vercel
- [ ] File size < 2GB (or < 50MB for server upload)
- [ ] Supported audio format (MP3, WAV, M4A, etc.)
- [ ] Internet connection stable
- [ ] kimbleai.com is accessible
- [ ] Supabase connection working
- [ ] Recent Vercel deploy successful
- [ ] No pending migrations

---

## 📈 Success Metrics

**Healthy transcription system:**
- ✅ Upload speed: 1-5 seconds per MB
- ✅ Transcription speed: 1 min audio = 10-15 sec processing
- ✅ Success rate: >95%
- ✅ Average cost: $0.41/hour
- ✅ Auto-tags generated: 8-15 per transcript

**Monitor these:**
```bash
# Success rate
SELECT
  COUNT(CASE WHEN text IS NOT NULL THEN 1 END)::float /
  COUNT(*)::float * 100 as success_rate_pct
FROM audio_transcriptions
WHERE created_at >= NOW() - INTERVAL '7 days';

# Average processing time
SELECT
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
FROM audio_transcriptions
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND text IS NOT NULL;
```

---

## 🔗 Related Files

- **Route:** `app/api/transcribe/assemblyai/route.ts`
- **Auto-tagger:** `lib/audio-auto-tagger.ts`
- **Frontend:** `app/page.tsx` (hourglass button, lines 538-630)
- **Config:** `vercel.json` (timeout settings)

---

**Still having issues? Check:**
1. Vercel logs: `vercel logs --follow`
2. Browser console: F12 → Console tab
3. Network tab: F12 → Network tab (look for failed requests)

**Most common fix:** Re-add ASSEMBLYAI_API_KEY to Vercel environment variables
