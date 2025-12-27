# Comprehensive File Upload Testing Suite v10.7.4

**Version**: v10.7.4 (schema validation system)
**Date**: 2025-12-26
**Status**: Ready for testing

---

## 🎯 Testing Parameters

### What Was Fixed

1. **Schema Validation System** - Prevents all database column errors
2. **UUID Format** - Uses proper UUID v4 instead of custom prefixes
3. **User ID Lookup** - Properly converts username to UUID
4. **Metadata Storage** - All extra fields in metadata JSONB
5. **Type Safety** - Validates data before database operations

### Critical Changes

| Component | Before | After |
|-----------|--------|-------|
| File ID | `file_abc123...` ❌ | `crypto.randomUUID()` ✅ |
| User ID | `'zach'` ❌ | `getUserId('zach')` → UUID ✅ |
| Status | Direct column ❌ | `metadata.status` ✅ |
| Category | Direct column ❌ | `metadata.category` ✅ |
| Project ID | Direct column ❌ | `metadata.projectId` ✅ |

---

## 🧪 Test Suite

### Test 1: Single File Upload (Basic)

**Purpose**: Verify basic file upload works without errors

**Steps**:
1. Go to https://www.kimbleai.com/files/upload
2. Click "Choose File"
3. Select `raw.pdf` (or any PDF < 100MB)
4. Click "Upload"

**Expected Results**:
- ✅ Upload starts immediately
- ✅ Progress bar shows (0% → 100%)
- ✅ Success message appears
- ✅ File appears in files list
- ✅ NO console errors
- ✅ NO "Failed to create file record" error
- ✅ NO database column errors

**Verification**:
```bash
railway logs --tail 50 | grep "\[UPLOAD\]"
```
Should show:
```
[UPLOAD] Received raw.pdf (10267 bytes) from user zach
[UPLOAD] Successfully processed raw.pdf (file_uuid...)
```

---

### Test 2: Multiple Files Upload (Batch)

**Purpose**: Verify batch upload handles multiple files

**Steps**:
1. Go to https://www.kimbleai.com/files/upload
2. Select all 4 PDFs:
   - `raw.pdf`
   - `pmp.pdf`
   - `Kimble_Case_Literal_Translation_Sample.pdf`
   - `Kimble Thrift Savings.pdf`
3. Upload all at once

**Expected Results**:
- ✅ All 4 files upload simultaneously
- ✅ Each file shows individual progress
- ✅ All complete successfully
- ✅ Success count: "4 files uploaded"
- ✅ NO errors for any file

**Verification**:
```bash
# Check all 4 files processed
railway logs --tail 100 | grep "Successfully processed" | wc -l
# Should output: 4
```

---

### Test 3: Different File Types

**Purpose**: Verify all supported file types work

**Test Files**:
- PDF: `test.pdf`
- Image: `test.jpg` or `test.png`
- Audio: `test.mp3` (if available)
- Document: `test.docx` or `test.txt`
- Spreadsheet: `test.xlsx` or `test.csv`

**Steps**:
1. Upload each file type separately
2. Verify processing completes

**Expected Results**:
- ✅ All file types accept and upload
- ✅ Category detected correctly:
  - PDF → `metadata.category = "pdf"`
  - Image → `metadata.category = "image"`
  - Audio → `metadata.category = "audio"`
  - etc.
- ✅ Processing completes for each type

---

### Test 4: Large File Upload

**Purpose**: Verify large files don't timeout or fail

**Steps**:
1. Upload largest available PDF (up to 100MB limit)
2. Monitor upload progress

**Expected Results**:
- ✅ Upload progresses smoothly
- ✅ No timeout errors
- ✅ Processing completes (may take longer)
- ✅ File appears in list with correct size

---

### Test 5: Error Handling

**Purpose**: Verify proper error messages for invalid uploads

**Test Cases**:

**5.1: File Too Large**
- Upload file > 100MB
- Expected: Clear error message about size limit

**5.2: Invalid File Type**
- Upload `.exe` or `.zip` file
- Expected: "Unsupported file type" error

**5.3: Network Interruption**
- Start upload, disconnect network mid-upload
- Expected: Error message, ability to retry

---

### Test 6: Database Verification

**Purpose**: Verify database records are correct

**Steps**:
1. Upload a test file
2. Check Supabase database

**SQL Query**:
```sql
SELECT
  id,
  user_id,
  filename,
  file_type,
  file_size,
  metadata,
  created_at
FROM uploaded_files
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Results**:
- ✅ `id` is valid UUID v4 format
- ✅ `user_id` is UUID (not string "zach")
- ✅ `filename` matches uploaded file
- ✅ `file_type` is correct MIME type
- ✅ `file_size` in bytes
- ✅ `metadata` is JSONB object with:
  ```json
  {
    "originalName": "test.pdf",
    "uploadedAt": "2025-12-26T...",
    "category": "pdf",
    "projectId": "general",
    "status": "processing" or "completed"
  }
  ```

**Verification**:
```sql
-- Verify UUID format
SELECT id, pg_typeof(id) as id_type
FROM uploaded_files
LIMIT 1;
-- Should show: id_type = uuid

-- Verify user_id is UUID, not string
SELECT user_id, pg_typeof(user_id) as user_type
FROM uploaded_files
LIMIT 1;
-- Should show: user_type = uuid

-- Verify metadata structure
SELECT
  filename,
  metadata->>'category' as category,
  metadata->>'status' as status,
  metadata->>'projectId' as project_id
FROM uploaded_files
WHERE created_at > NOW() - INTERVAL '10 minutes';
-- Should show proper values extracted from JSONB
```

---

### Test 7: Schema Validation

**Purpose**: Verify schema validation prevents errors

**Test**: Attempt to insert with invalid data (manual API test)

```bash
# This should FAIL with validation error
curl -X POST https://www.kimbleai.com/api/files/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.pdf" \
  -F "userId=invalid-not-uuid" \
  -F "projectId=test"
```

**Expected**:
- ✅ Validation catches the error
- ✅ Error message explains the problem
- ✅ NO database error (caught before database call)

---

### Test 8: Concurrent Uploads

**Purpose**: Verify multiple users can upload simultaneously

**Steps**:
1. Open two browser windows (or incognito)
2. Login as different users (zach/rebecca)
3. Upload files at the same time

**Expected Results**:
- ✅ Both uploads succeed
- ✅ No race conditions
- ✅ Files associated with correct users
- ✅ No UUID collisions

---

### Test 9: Progress Tracking

**Purpose**: Verify upload progress updates correctly

**Steps**:
1. Upload a large file (10MB+)
2. Monitor progress indicator

**Expected Results**:
- ✅ Progress starts at 0%
- ✅ Progresses smoothly (10% → 30% → 50% → 100%)
- ✅ Status messages update:
  - "Uploading file..."
  - "Processing file..."
  - "Analyzing file content..."
  - "Processing completed"
- ✅ Final status: "completed"

**API Check**:
```bash
# Get progress for file ID
curl "https://www.kimbleai.com/api/files/upload?fileId=<UUID>"
```

Expected response:
```json
{
  "status": "completed",
  "progress": 100,
  "message": "Processing completed",
  "data": { ... }
}
```

---

### Test 10: Metadata Persistence

**Purpose**: Verify metadata is preserved through updates

**Steps**:
1. Upload file (creates initial metadata)
2. Processing completes (updates metadata)
3. Check final metadata has all fields

**Expected Results**:
- ✅ Initial fields preserved:
  - `originalName`
  - `uploadedAt`
  - `category`
  - `projectId`
- ✅ Processing fields added:
  - `status` updated to "completed"
  - `processingResult` added
  - `processedAt` added
- ✅ NO fields lost during updates

---

## 🔍 Monitoring & Debugging

### Check Railway Logs

**General upload activity**:
```bash
railway logs --tail 100 | grep "\[UPLOAD\]"
```

**Database errors**:
```bash
railway logs --tail 100 | grep -i "database error"
```

**Schema validation**:
```bash
railway logs --tail 100 | grep "\[SCHEMA\]"
```

**Errors only**:
```bash
railway logs --tail 100 | grep -i "error"
```

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Upload file
4. Look for:
   - ✅ NO red errors
   - ✅ Network requests succeed (200 status)
   - ✅ Response shows success: true

### Check Database

**Recent uploads**:
```sql
SELECT
  filename,
  created_at,
  metadata->>'status' as status
FROM uploaded_files
ORDER BY created_at DESC
LIMIT 10;
```

**Failed uploads**:
```sql
SELECT
  filename,
  metadata->>'status' as status,
  metadata->>'errorMessage' as error
FROM uploaded_files
WHERE metadata->>'status' = 'failed'
LIMIT 10;
```

**Upload statistics**:
```sql
SELECT
  metadata->>'category' as category,
  metadata->>'status' as status,
  COUNT(*) as count
FROM uploaded_files
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY category, status;
```

---

## ✅ Success Criteria

All tests MUST pass:

- [ ] Single file upload works
- [ ] Batch upload (4 files) works
- [ ] All file types supported
- [ ] Large files upload successfully
- [ ] Error messages for invalid uploads
- [ ] Database records correct format
- [ ] user_id is UUID (not string)
- [ ] id is UUID v4 format
- [ ] metadata contains all required fields
- [ ] Schema validation prevents errors
- [ ] Concurrent uploads work
- [ ] Progress tracking updates
- [ ] Metadata persists correctly
- [ ] NO console errors
- [ ] NO database column errors
- [ ] NO PGRST204 errors in logs

---

## 🚨 Failure Scenarios

### If Upload Fails with 500 Error

1. Check Railway logs immediately:
   ```bash
   railway logs --tail 50
   ```

2. Look for:
   - Database errors (PGRST204, invalid UUID, column doesn't exist)
   - Schema validation errors
   - Processing errors

3. Check browser Network tab:
   - Request payload
   - Response details

### If Database Shows Wrong Format

1. Check `id` column type:
   ```sql
   SELECT pg_typeof(id) FROM uploaded_files LIMIT 1;
   ```
   Should be: `uuid`

2. Check `user_id` column type:
   ```sql
   SELECT pg_typeof(user_id) FROM uploaded_files LIMIT 1;
   ```
   Should be: `uuid`

3. If wrong, schema validation not working - check code deployment

---

## 📊 Expected Performance

| Operation | Expected Time |
|-----------|---------------|
| Small file upload (< 1MB) | < 2 seconds |
| Medium file (1-10MB) | 2-10 seconds |
| Large file (10-100MB) | 10-60 seconds |
| Processing (PDF) | 5-30 seconds |
| Processing (Image) | 2-10 seconds |
| Processing (Audio) | 30-120 seconds |
| Database insert | < 100ms |
| Metadata update | < 50ms |

---

## 🎯 Quick Smoke Test (2 minutes)

**Minimum viable test**:

1. ✅ Upload `raw.pdf` → Success
2. ✅ Check logs → No errors
3. ✅ Upload appears in /files list
4. ✅ Version shows v10.7.4

If all 4 pass → System is working ✅

---

## 📝 Test Report Template

```
## File Upload Test Report
**Date**: 2025-12-26
**Version**: v10.7.4
**Tester**: [Your Name]

### Tests Run
- [x] Single file upload
- [x] Batch upload
- [ ] Different file types
- [ ] Large files
- [ ] Error handling
- [x] Database verification
- [ ] Schema validation
- [ ] Concurrent uploads
- [ ] Progress tracking
- [ ] Metadata persistence

### Results
- **Passed**: 7/10
- **Failed**: 0/10
- **Skipped**: 3/10

### Issues Found
- None

### Logs
```
[paste relevant log excerpts]
```

### Database State
```
[paste SQL query results]
```

### Conclusion
✅ File upload system working correctly with schema validation
```

---

Ready to test! 🚀
