# 🚀 KIMBLEAI v4 - Phase 1 Deployment Guide

**Date:** 2025-10-01
**Phase:** 1 - Database, Files, Search
**Status:** Ready for Deployment

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Environment Variables
Ensure these are set in `.env.local` and `.env.production`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# AssemblyAI (for audio transcription)
ASSEMBLYAI_API_KEY=your-assemblyai-key

# Google OAuth (for Drive/Gmail/Calendar)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=https://kimbleai.com
NEXTAUTH_SECRET=your-nextauth-secret
```

### 2. Verify Database Connection
Run the connection test:

```bash
npx tsx scripts/test-db-connection.ts
```

Expected output:
```
✅ Connected! Found 2 users
```

---

## 🗄️ STEP 1: DEPLOY DATABASE MIGRATIONS

### Option A: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project → SQL Editor
3. Run the migration file:

**File:** `database/add-embedding-columns.sql`

4. Click "RUN" and wait for completion
5. Expected output:
```
✅ EMBEDDING COLUMNS AND SEARCH FUNCTIONS CREATED SUCCESSFULLY!
```

### Option B: Verify Functions Manually

Run this query in SQL Editor:

```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'search_all_content',
    'match_messages',
    'match_files',
    'match_transcriptions',
    'get_search_stats'
  )
ORDER BY routine_name;
```

Should return 5 functions.

### Verification Script

After running migrations:

```bash
npx tsx scripts/verify-database.ts
```

---

## 📦 STEP 2: CONFIGURE SUPABASE STORAGE

### Create Storage Buckets

1. Go to Supabase Dashboard → Storage
2. Create these buckets:

| Bucket Name | Public | Description |
|-------------|--------|-------------|
| `files` | No (Private) | All uploaded files (audio, images, docs, etc.) |
| `thumbnails` | Yes (Public) | Generated thumbnails for images |

### Set Bucket Policies

For **files** bucket (Private):

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files' AND auth.uid() IS NOT NULL);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);
```

For **thumbnails** bucket (Public):

```sql
-- Allow public read access
CREATE POLICY "Public can read thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Allow authenticated users to upload
CREATE POLICY "Users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL);
```

---

## 🧪 STEP 3: TEST ALL SYSTEMS

### Test 1: Database Functions

```bash
# Run comprehensive database verification
npx tsx scripts/verify-database.ts
```

Expected output:
```
✅ search_all_content - Working!
✅ get_search_stats - Working!
✅ files bucket - Private
✅ thumbnails bucket - Public
```

### Test 2: File Upload

Create test file: `test-upload.http`

```http
### Upload a text file
POST http://localhost:3000/api/files/upload
Content-Type: multipart/form-data; boundary=boundary

--boundary
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

This is a test file for kimbleai.com
--boundary
Content-Disposition: form-data; name="userId"

zach
--boundary
Content-Disposition: form-data; name="projectId"

general
--boundary--
```

Or use curl:

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@test.txt" \
  -F "userId=zach" \
  -F "projectId=general"
```

Expected response:
```json
{
  "success": true,
  "fileId": "file_abc123...",
  "status": "processing",
  "message": "File uploaded and queued for processing"
}
```

### Test 3: Semantic Search

```http
### Search all content
GET http://localhost:3000/api/search/semantic?q=test&userId=zach&limit=10
```

Or:

```bash
curl "http://localhost:3000/api/search/semantic?q=test&userId=zach&limit=10"
```

Expected response:
```json
{
  "success": true,
  "query": "test",
  "results": [...],
  "count": 5,
  "performance": {
    "totalTime": 245,
    "embeddingTime": 120,
    "searchTime": 125
  }
}
```

### Test 4: RAG Search (Verify Still Works)

```http
### Knowledge base search
POST http://localhost:3000/api/knowledge/search
Content-Type: application/json

{
  "query": "test query",
  "userId": "zach-admin-001",
  "searchType": "hybrid",
  "limit": 10
}
```

Expected: Returns results from knowledge base

### Test 5: Google Drive Integration

```http
### Search Google Drive
POST http://localhost:3000/api/google/drive
Content-Type: application/json

{
  "action": "search",
  "query": "test",
  "userId": "zach"
}
```

---

## 🏃 STEP 4: RUN AUTOMATED TESTS

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
# Test specific modules
npm run test tests/api/search-semantic.test.ts
npm run test tests/api/files-upload.test.ts
npm run test tests/lib/embeddings.test.ts
```

### Load Test (Optional)

```bash
npx tsx tests/load-test.ts
```

---

## 🚀 STEP 5: DEPLOY TO PRODUCTION

### Vercel Deployment

```bash
# Build and deploy
npm run build
vercel --prod

# Or use Vercel dashboard
# Push to main branch → Auto-deploy
```

### Environment Variables (Vercel)

Ensure all environment variables are set in Vercel Dashboard:
- Project Settings → Environment Variables
- Add all vars from `.env.production`

### Post-Deployment Verification

1. **Check deployed URL:** https://kimbleai.com
2. **Test health endpoint:** `GET /api/health`
3. **Test search:** `GET /api/search/semantic?q=test`
4. **Monitor logs:** Vercel Dashboard → Logs

---

## 📊 VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Database functions exist (`search_all_content`, etc.)
- [ ] Storage buckets created (`files`, `thumbnails`)
- [ ] File upload works (POST /api/files/upload)
- [ ] File processing works (check uploaded_files table)
- [ ] Semantic search works (GET /api/search/semantic)
- [ ] RAG search still works (POST /api/knowledge/search)
- [ ] Google Drive integration works
- [ ] Gmail integration works
- [ ] Calendar integration works

---

## 🐛 TROUBLESHOOTING

### Database Connection Issues

**Error:** `Failed to connect to Supabase`

**Solution:**
1. Check `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check `SUPABASE_SERVICE_ROLE_KEY` is the **service role** key (not anon key)
3. Verify project is not paused in Supabase dashboard

### Migration Fails

**Error:** `Function already exists`

**Solution:** Migrations are idempotent. Safe to re-run.

### File Upload Fails

**Error:** `Storage bucket not found`

**Solution:**
1. Create `files` bucket in Supabase Storage
2. Set bucket to Private
3. Add RLS policies (see Step 2)

### Semantic Search Returns No Results

**Error:** `No results found`

**Possible causes:**
1. Database function not deployed → Run migrations
2. No embeddings exist → Run backfill: `npx tsx scripts/backfill-embeddings.ts`
3. Threshold too high → Lower threshold in query

### Build Timeout

**Error:** `Build timed out after 60s`

**Solution:**
1. Check for circular dependencies
2. Review `next.config.js` (remove invalid `api` key)
3. Split large components

---

## 📈 MONITORING

### Key Metrics to Watch

1. **Search Performance:** Should be < 500ms
2. **File Processing:** Should complete within 30s
3. **Embedding Coverage:** Should be > 80% for all content types
4. **API Error Rate:** Should be < 1%

### Monitoring Tools

- **Vercel Analytics:** Response times, errors
- **Supabase Dashboard:** Database usage, storage
- **Custom endpoint:** `GET /api/performance` → Performance stats

---

## 🎯 NEXT STEPS

After Phase 1 deployment:

1. **Monitor for 24 hours** - Check logs, errors, performance
2. **Backfill embeddings** - Run `scripts/backfill-embeddings.ts` for existing data
3. **User testing** - Have Zach and Rebecca test all features
4. **Phase 2** - Performance optimization (if needed)

---

## 📞 SUPPORT

If issues persist:
1. Check Supabase Dashboard logs
2. Check Vercel deployment logs
3. Review error traces in `/api/performance`
4. Test locally first: `npm run dev`

---

**Generated:** 2025-10-01
**Phase 1 Status:** ✅ Ready for Deployment
**Estimated Deployment Time:** 15-20 minutes
