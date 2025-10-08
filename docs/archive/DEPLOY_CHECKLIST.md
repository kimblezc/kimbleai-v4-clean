# ✅ DEPLOYMENT CHECKLIST

**Total Time:** ~20 minutes
**Status:** Ready to deploy

---

## 🎯 STEP-BY-STEP DEPLOYMENT

### ☐ Step 1: Deploy Database (5 minutes)

1. Go to: https://supabase.com/dashboard
2. Select project: `gbmefnaqsxtoseufjixp`
3. Click: **SQL Editor** (left sidebar)
4. Open file: `DEPLOY_NOW.sql`
5. Copy entire contents
6. Paste into SQL Editor
7. Click: **RUN**
8. Wait for: `✅ PHASE 1 DATABASE DEPLOYMENT COMPLETE!`

**Verify:**
```sql
SELECT * FROM get_search_stats('zach-admin-001');
```
Should return 4 rows (messages, files, transcripts, knowledge_base)

---

### ☐ Step 2: Create Storage Buckets (3 minutes)

1. Still in Supabase Dashboard
2. Click: **Storage** (left sidebar)
3. Click: **New bucket**

**Bucket 1: files**
- Name: `files`
- Public: ❌ **NO**
- Click: Create

**Bucket 2: thumbnails**
- Name: `thumbnails`
- Public: ✅ **YES**
- Click: Create

**Set RLS Policies:**
- See `STORAGE_SETUP.md` for policy SQL (optional - can do later)

**Verify:**
```sql
SELECT name, public FROM storage.buckets
WHERE name IN ('files', 'thumbnails');
```

---

### ☐ Step 3: Test Locally (5 minutes)

Server should already be running from previous step. If not:

```bash
npm run dev
```

Wait for: `✓ Ready in ...s`

**Test APIs:**

1. **File Listing** (should require auth):
   ```bash
   curl "http://localhost:3000/api/files?userId=zach&limit=5"
   ```

2. **Semantic Search** (should require auth or return results):
   ```bash
   curl "http://localhost:3000/api/search/semantic?q=test&userId=zach-admin-001"
   ```

3. **RAG Search** (POST request):
   ```bash
   curl -X POST http://localhost:3000/api/knowledge/search \
     -H "Content-Type: application/json" \
     -d '{"query":"test","userId":"zach-admin-001","searchType":"hybrid","limit":5}'
   ```

---

### ☐ Step 4: Deploy to Production (5 minutes)

```bash
# Build project
npm run build
```

Wait for build to complete (may take 2-3 minutes)

```bash
# Deploy to Vercel
vercel --prod
```

Or push to GitHub (auto-deploys):
```bash
git add .
git commit -m "Phase 1 complete: Database, Files, Search"
git push origin main
```

**Wait for deployment:** Check Vercel dashboard

---

### ☐ Step 5: Verify Production (2 minutes)

1. Visit: https://www.kimbleai.com
2. Test semantic search:
   ```
   https://www.kimbleai.com/api/search/semantic?q=test&userId=zach-admin-001
   ```
3. Check Vercel logs for errors
4. Check Supabase dashboard → Database → Logs

---

## 🧪 POST-DEPLOYMENT TASKS

### ☐ Backfill Embeddings (Optional, 10-30 minutes)

Generate embeddings for existing content:

```bash
npx tsx scripts/backfill-embeddings.ts
```

This will:
- Generate embeddings for messages without them
- Generate embeddings for files without them
- Generate embeddings for transcripts without them
- Store in database for semantic search

**Cost:** ~$0.10 - $0.50 depending on content volume

---

### ☐ User Testing (30 minutes)

Have Zach and Rebecca test:

1. **File Upload:**
   - Upload .m4a audio file
   - Upload .png image
   - Upload .pdf document
   - Verify processing completes

2. **Search:**
   - Search for content
   - Check results are relevant
   - Check response time (< 1 second)

3. **Google Integrations:**
   - Connect Google account
   - Search Drive files
   - Search Gmail
   - View Calendar events

---

### ☐ Monitor for 24 Hours

Watch these metrics:

1. **Vercel Dashboard:**
   - Response times (should be < 1s)
   - Error rate (should be < 1%)
   - Bandwidth usage

2. **Supabase Dashboard:**
   - Database size
   - Storage usage
   - API requests

3. **Cost Tracking:**
   - OpenAI API usage
   - AssemblyAI usage
   - Supabase usage (should be free tier)

---

## 📊 SUCCESS CRITERIA

After deployment, you should have:

- ✅ Database migrations deployed
- ✅ Storage buckets created
- ✅ Semantic search working
- ✅ File upload working
- ✅ RAG search still working
- ✅ Google integrations working
- ✅ Production site deployed
- ✅ < 1s response times
- ✅ No critical errors in logs

---

## 🐛 TROUBLESHOOTING

### "Function search_all_content does not exist"

**Fix:** Re-run `DEPLOY_NOW.sql` in Supabase SQL Editor

### "Storage bucket 'files' not found"

**Fix:** Create buckets in Supabase Storage (Step 2)

### "Build failed" or "Build timeout"

**Fix:** Check for syntax errors. Build may take 3-5 minutes.

### "Semantic search returns empty results"

**Causes:**
1. No embeddings exist → Run backfill script
2. Database function not deployed → Run Step 1
3. Threshold too high → Lower in API call

### APIs return "Unauthorized"

**Expected:** Security middleware is working. Need to authenticate or bypass for testing.

---

## 📞 QUICK REFERENCE

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard |
| Supabase Project | https://gbmefnaqsxtoseufjixp.supabase.co |
| Production Site | https://www.kimbleai.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| SQL Deployment | `DEPLOY_NOW.sql` |
| Storage Setup | `STORAGE_SETUP.md` |
| Full Guide | `DEPLOYMENT_GUIDE.md` |
| Test Collection | `test-api.http` |

---

## ✅ FINAL CHECKLIST

Before marking deployment complete:

- [ ] Database migrations deployed ← **DO THIS FIRST**
- [ ] Storage buckets created ← **DO THIS SECOND**
- [ ] Local testing passed
- [ ] Production deployed
- [ ] Production verified working
- [ ] Backfill embeddings (optional)
- [ ] User testing completed
- [ ] No critical errors in logs

---

**You are here:** Ready to deploy Step 1 (Database)

**Next:** Open `DEPLOY_NOW.sql` and follow Step 1

**Questions?** See `DEPLOYMENT_GUIDE.md` for detailed explanations

---

**Last Updated:** 2025-10-01
**Phase:** 1 - Database, Files, Search
**Status:** ✅ Ready
