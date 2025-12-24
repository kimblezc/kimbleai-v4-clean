# File Upload Fix Test Protocol v10.7.1

**Version**: v10.7.1
**Commit**: 75ea23b
**Date**: 2025-12-24
**Purpose**: Verify database category column error is fixed

## Issue Fixed
```
Error: Could not find the 'category' column of 'uploaded_files' in the schema cache
```

**Root Cause**: Code attempted to insert `category` as a direct column, but table only has `metadata` JSONB field.
**Solution**: Store category inside metadata JSONB object.

---

## Test Protocol 1: Manual Browser Testing

### Prerequisites
- Access to https://www.kimbleai.com
- Logged in as authenticated user (zach.kimble@gmail.com)
- Test files ready in various formats

### Test 1.1: Single PDF Upload
1. Navigate to https://www.kimbleai.com/files/upload
2. Click "Choose File" or drag/drop a PDF file
3. Upload a PDF file (any size < 100MB)
4. **Expected Results**:
   - ✅ Upload initiates without error
   - ✅ Progress indicator shows
   - ✅ Success message displays
   - ✅ File appears in files list
   - ✅ NO database error in logs
   - ✅ NO "Failed to create file record" error

### Test 1.2: Multiple File Upload
1. Navigate to https://www.kimbleai.com/files/upload
2. Select multiple files at once (3-5 files)
3. Upload all files simultaneously
4. **Expected Results**:
   - ✅ All files upload without errors
   - ✅ Each file shows individual progress
   - ✅ All files complete successfully
   - ✅ NO database errors in Railway logs

### Test 1.3: Different File Types
Upload one file of each type:
- PDF: `test.pdf`
- Image: `test.jpg`
- Audio: `test.mp3`
- Document: `test.docx`
- Spreadsheet: `test.xlsx`
- Email: `test.eml`

**Expected Results**:
- ✅ All file types upload successfully
- ✅ Category detected correctly for each type
- ✅ Processing completes for all types
- ✅ NO database column errors

---

## Test Protocol 2: Database Verification

### Test 2.1: Check Database Records
```sql
-- Connect to Supabase and run:
SELECT
  id,
  filename,
  status,
  metadata->>'category' as category,
  metadata->>'originalName' as original_name,
  created_at
FROM uploaded_files
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results**:
- ✅ Records exist for uploaded files
- ✅ `status` is 'processing' or 'completed'
- ✅ `metadata->>'category'` contains correct category (pdf, image, audio, etc.)
- ✅ `metadata->>'originalName'` matches uploaded filename
- ✅ NO null or missing category values

### Test 2.2: Verify Metadata Structure
```sql
SELECT
  filename,
  metadata
FROM uploaded_files
WHERE created_at > NOW() - INTERVAL '10 minutes'
LIMIT 5;
```

**Expected Results**:
```json
{
  "originalName": "test.pdf",
  "uploadedAt": "2025-12-24T09:27:19.000Z",
  "category": "pdf"
}
```

---

## Test Protocol 3: Railway Logs Analysis

### Test 3.1: Check for Database Errors
```bash
# Run from local machine
railway logs --tail 100 | grep -i "database error"
```

**Expected Results**:
- ✅ NO "Could not find the 'category' column" errors
- ✅ NO PGRST204 errors
- ✅ NO schema cache errors

### Test 3.2: Check Upload Success Messages
```bash
railway logs --tail 100 | grep "\[UPLOAD\]"
```

**Expected Results**:
```
[UPLOAD] Received test.pdf (10267 bytes) from user zach
[UPLOAD] Successfully processed test.pdf (file_abc123...)
```

**NO Expected**:
```
[UPLOAD] Database error: { code: 'PGRST204', ... }
```

---

## Test Protocol 4: API Testing

### Test 4.1: Direct API Upload Test
```bash
# Test single file upload
curl -X POST https://www.kimbleai.com/api/files/upload \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@./test.pdf" \
  -F "userId=zach" \
  -F "projectId=general"
```

**Expected Response**:
```json
{
  "success": true,
  "fileId": "file_abc123...",
  "status": "processing",
  "message": "File uploaded and queued for processing",
  "filename": "test.pdf",
  "size": 10267,
  "category": "pdf"
}
```

**NOT Expected**:
```json
{
  "error": "Failed to create file record",
  "details": "Could not find the 'category' column..."
}
```

### Test 4.2: Batch Upload Test
```bash
# Test batch upload (PUT endpoint)
curl -X PUT https://www.kimbleai.com/api/files/upload \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file1=@./test1.pdf" \
  -F "file2=@./test2.pdf" \
  -F "file3=@./test3.pdf" \
  -F "userId=zach" \
  -F "projectId=general"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "3 files uploaded and queued for processing",
  "fileIds": ["file_abc...", "file_def...", "file_ghi..."],
  "files": [
    {
      "fileId": "file_abc...",
      "filename": "test1.pdf",
      "size": 10267,
      "status": "processing"
    },
    ...
  ]
}
```

### Test 4.3: Progress Check
```bash
# Check file processing progress
curl -X GET "https://www.kimbleai.com/api/files/upload?fileId=file_abc123..." \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response**:
```json
{
  "status": "completed",
  "progress": 100,
  "message": "Processing completed",
  "data": {
    "pageCount": 5,
    "wordCount": 1234,
    "contentPreview": "..."
  }
}
```

---

## Test Protocol 5: Automated Test Script

### Test 5.1: Run Comprehensive Test Suite
```bash
# From project root
npx tsx tests/file-upload-comprehensive.ts
```

This will test:
- ✅ Single file upload (POST)
- ✅ Batch file upload (PUT)
- ✅ Multiple file types
- ✅ Database record creation
- ✅ Metadata structure
- ✅ Progress tracking
- ✅ Error handling

---

## Test Protocol 6: Regression Testing

### Test 6.1: Verify Old Uploads Still Work
```sql
-- Check pre-fix uploads (before v10.7.1)
SELECT
  filename,
  status,
  metadata,
  created_at
FROM uploaded_files
WHERE created_at < '2025-12-24 09:00:00'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results**:
- ✅ Old records still accessible
- ✅ Old metadata structure intact
- ✅ No migration issues

### Test 6.2: Mixed Upload Test
Upload files using both old sessions (if any cached) and new sessions.

**Expected Results**:
- ✅ Both work without errors
- ✅ Consistent behavior

---

## Success Criteria

### All Tests Must Pass:
- [ ] Manual browser uploads work (all file types)
- [ ] Database records created correctly
- [ ] Category stored in metadata->>'category'
- [ ] NO database column errors in logs
- [ ] API endpoints return success responses
- [ ] Progress tracking works
- [ ] Batch uploads work
- [ ] Old data still accessible

### Deployment Verification:
- [ ] Version shows v10.7.1 on main page
- [ ] Commit shows 75ea23b on main page
- [ ] Railway logs show no PGRST204 errors
- [ ] File upload UI shows no errors

---

## Quick Verification Commands

```bash
# 1. Check deployed version
curl -s https://www.kimbleai.com/api/version | grep version

# 2. Check Railway logs for errors
railway logs --tail 50 | grep -i "error"

# 3. Check database for recent uploads
# (Run in Supabase SQL Editor)
SELECT COUNT(*) FROM uploaded_files WHERE created_at > NOW() - INTERVAL '1 hour';

# 4. Test health endpoint
curl -s https://www.kimbleai.com/api/health
```

---

## Rollback Plan (If Tests Fail)

If any critical test fails:

```bash
# Revert to previous version
git revert 75ea23b
git push origin master
railway up --detach

# Or rollback to last known good commit
git reset --hard b314b37
git push -f origin master
railway up --detach
```

Then investigate why the fix didn't work and create a new approach.

---

## Notes
- Test with real files, not mock data
- Check both Railway production logs and Supabase database
- Verify category is in metadata, not as separate column
- Ensure backward compatibility with old uploads
