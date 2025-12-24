# Manual Test Protocol for File Upload Fix v10.7.1

## Quick Test - 2 Minutes

### Step 1: Verify Deployment
Visit https://www.kimbleai.com and check the footer/version display shows:
- **Version: v10.7.1** ✅
- **Commit: 75ea23b** ✅

### Step 2: Upload a Test File
1. Go to https://www.kimbleai.com/files/upload
2. Upload any PDF file (the ones you tried earlier that failed)
3. Watch for the result

**EXPECTED RESULT**:
```
✅ Upload successful
✅ File processing started
✅ NO "Failed to create file record" error
✅ NO database column errors
```

**IF YOU SEE THIS ERROR, THE FIX DIDN'T WORK**:
```
❌ Error: Failed to create file record
❌ Error: Could not find the 'category' column
```

### Step 3: Check Railway Logs (Live Verification)
```bash
railway logs --tail 30 | grep "\[UPLOAD\]"
```

**EXPECTED**:
```
[UPLOAD] Received filename.pdf (12345 bytes) from user zach
[UPLOAD] Successfully processed filename.pdf (file_abc123...)
```

**NOT EXPECTED**:
```
[UPLOAD] Database error: { code: 'PGRST204', message: "Could not find the 'category' column" }
```

---

## Detailed Test Protocol - 10 Minutes

### Test 1: Single File Upload

**Files to test:**
- PDF: `raw.pdf` (the one you uploaded earlier that failed)
- PDF: `pmp.pdf` (the one you uploaded earlier that failed)
- PDF: `Kimble_Case_Literal_Translation_Sample.pdf`
- PDF: `Kimble Thrift Savings.pdf`

**For each file:**
1. Go to https://www.kimbleai.com/files/upload
2. Upload the file
3. Wait for completion message
4. Record result: ✅ Success or ❌ Failed

**Expected Results:**
- All 4 files upload successfully
- No database errors
- Files appear in files list

### Test 2: Check Database Directly

**Option A: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Open your kimbleai project
3. Go to Table Editor → `uploaded_files`
4. Check the most recent records
5. Click on a record and verify:
   - `metadata` field contains `{"category": "pdf", "originalName": "test.pdf", ...}`
   - NO separate `category` column exists
   - `status` field shows proper value

**Option B: Via SQL**
Run this query in Supabase SQL Editor:
```sql
SELECT
  filename,
  metadata,
  metadata->>'category' as extracted_category,
  created_at
FROM uploaded_files
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- `metadata` column shows JSON with category inside
- `extracted_category` shows the correct file type (pdf, image, etc.)
- NO errors about missing columns

### Test 3: Batch Upload

1. Select 3-5 PDF files at once
2. Upload them all together
3. Watch the progress

**Expected:**
- All files upload without errors
- Each shows individual progress
- All complete successfully

### Test 4: Railway Logs Verification

```bash
# Check for any database errors since deployment
railway logs --tail 500 | grep -i "database error"

# Check all upload messages
railway logs --tail 500 | grep "\[UPLOAD\]"

# Check for the specific error we fixed
railway logs --tail 500 | grep "category.*column"
```

**Expected:**
- NO "Could not find the 'category' column" errors
- Successful upload messages for all files
- NO PGRST204 error codes

---

## Success Criteria Checklist

Mark each as you verify:

- [ ] Version shows v10.7.1 on kimbleai.com
- [ ] Commit shows 75ea23b on kimbleai.com
- [ ] Can upload single PDF file without errors
- [ ] Can upload multiple PDF files without errors
- [ ] Can upload different file types (image, audio, doc) without errors
- [ ] Database records created successfully
- [ ] Category stored in `metadata->>'category'`
- [ ] NO "category column" errors in Railway logs
- [ ] NO PGRST204 errors in Railway logs
- [ ] Files appear in /files list after upload

---

## If Tests Fail

### Check 1: Is the right version deployed?
```bash
curl -s https://www.kimbleai.com/api/version | grep version
# Should show: "version":"10.7.1"
```

### Check 2: Is Railway actually running the new code?
```bash
railway status
railway logs --tail 20
```

### Check 3: Hard refresh browser
- Windows: Ctrl + Shift + R
- Mac: Cmd + Shift + R

### Check 4: Try uploading from incognito/private window
This eliminates cached JavaScript

### Check 5: Look at actual error
```bash
railway logs --tail 100 | grep -A 10 "\[UPLOAD\]"
```

---

## Quick Reference

**Live URL**: https://www.kimbleai.com
**Upload Page**: https://www.kimbleai.com/files/upload
**Files List**: https://www.kimbleai.com/files
**Version Endpoint**: https://www.kimbleai.com/api/version

**Fixed in this version:**
- Database column error when uploading files
- Category now stored in metadata JSONB field
- No more "Could not find the 'category' column" errors

**Test files that previously failed:**
- raw.pdf
- pmp.pdf
- Kimble_Case_Literal_Translation_Sample.pdf
- Kimble Thrift Savings.pdf

Try uploading these same files again - they should work now!
