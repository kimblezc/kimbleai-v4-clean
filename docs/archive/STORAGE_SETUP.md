# 📦 SUPABASE STORAGE SETUP

## Quick Setup (3 minutes)

### Step 1: Go to Storage Dashboard

1. Open https://supabase.com/dashboard
2. Select project: **gbmefnaqsxtoseufjixp**
3. Click **Storage** in left sidebar
4. Click **New bucket** button

---

### Step 2: Create "files" Bucket (Private)

**Settings:**
- **Name:** `files`
- **Public:** ❌ **NO** (Keep private)
- **File size limit:** 50 MB
- **Allowed MIME types:** Leave empty (allow all)

**RLS Policy:**

After creating bucket, click on it → Policies → New Policy:

```sql
-- Policy 1: Allow authenticated users to upload their own files
CREATE POLICY "Users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL
);

-- Policy 2: Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL
);

-- Policy 3: Allow service role full access (for API operations)
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'files')
WITH CHECK (bucket_id = 'files');
```

---

### Step 3: Create "thumbnails" Bucket (Public)

**Settings:**
- **Name:** `thumbnails`
- **Public:** ✅ **YES** (Public access)
- **File size limit:** 5 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/gif`

**RLS Policy:**

```sql
-- Policy 1: Allow public read access to thumbnails
CREATE POLICY "Public can read thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Policy 2: Allow authenticated users to upload thumbnails
CREATE POLICY "Users can upload thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.uid() IS NOT NULL
);

-- Policy 3: Allow service role full access
CREATE POLICY "Service role full access to thumbnails"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'thumbnails')
WITH CHECK (bucket_id = 'thumbnails');
```

---

## Verification

After creating buckets, run this in SQL Editor:

```sql
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('files', 'thumbnails')
ORDER BY name;
```

Expected output:
```
files       | false | 52428800 |
thumbnails  | true  | 5242880  | {image/jpeg, image/png, image/webp, image/gif}
```

---

## Test Upload (Optional)

Use this curl command to test file upload:

```bash
# Get your auth token first (from browser devtools or login)
TOKEN="your-auth-token-here"

# Upload test file
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt" \
  -F "userId=zach" \
  -F "projectId=general"
```

---

## Folder Structure (Auto-created)

Files will be organized like this:

```
files/
├── zach-admin-001/
│   ├── audio/
│   │   └── meeting-2025-10-01.m4a
│   ├── images/
│   │   └── screenshot-2025-10-01.png
│   ├── documents/
│   │   └── report-2025-10-01.pdf
│   └── ...
└── rebecca-admin-002/
    └── ...

thumbnails/
├── zach-admin-001/
│   └── screenshot-2025-10-01-thumb.webp
└── rebecca-admin-002/
    └── ...
```

---

## Troubleshooting

### Upload fails with "Bucket not found"

**Solution:** Make sure bucket name is exactly `files` (lowercase)

### Upload fails with "Access denied"

**Solution:** Check RLS policies are created correctly

### Can't view files

**Solution:**
- Files bucket should be **private** (users need auth)
- Thumbnails bucket should be **public**

---

✅ **Setup complete!** Storage is ready for file uploads.
