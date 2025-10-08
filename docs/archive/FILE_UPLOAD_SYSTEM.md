# Complete File Upload and Processing System

This document describes the comprehensive file upload and processing system for kimbleai.com.

## Overview

The system supports uploading and processing ALL major file types:
- Audio files (m4a, mp3, wav, flac, ogg, aac)
- Images (jpg, png, heic, webp, gif, bmp)
- PDFs
- Documents (docx, txt, md, rtf)
- Spreadsheets (csv, xlsx, xls)
- Emails (eml, msg)

## Architecture

### Components

1. **File Processors** (`lib/file-processors.ts`)
   - Audio: AssemblyAI + OpenAI Whisper fallback
   - Images: OpenAI Vision + Sharp for thumbnails
   - PDFs: pdf-parse + pdf-lib
   - Documents: mammoth (docx) + native text parsing
   - Spreadsheets: xlsx library
   - Emails: Custom email parser

2. **Upload API** (`app/api/files/upload/route.ts`)
   - Multi-file support
   - Progress tracking
   - Async processing
   - Validation

3. **File Management API** (`app/api/files/`)
   - GET: List files with filters
   - GET [id]: Get single file
   - DELETE [id]: Delete file
   - PATCH [id]: Update metadata
   - GET [id]/download: Download file
   - GET [id]/status: Check processing status

4. **UI Component** (`components/FileUploader.tsx`)
   - Drag and drop
   - Multi-file upload
   - Progress tracking
   - Real-time status updates

5. **Storage** (Supabase)
   - Buckets: audio-files, images, documents, processed
   - Row-level security enabled
   - Public read, authenticated write

6. **Queue System** (`lib/file-queue.ts`)
   - In-memory queue (sufficient for 2 users)
   - 3 concurrent processors
   - Automatic retries (2 attempts)
   - Priority-based processing

## Installation

1. **Install Dependencies**
```bash
npm install sharp pdf-lib xlsx mammoth file-type mime-types assemblyai
```

2. **Set Up Supabase Storage**
Run the SQL script in Supabase dashboard:
```bash
# Copy contents of scripts/setup-supabase-storage.sql
# Paste into Supabase SQL Editor
# Execute
```

3. **Configure Environment Variables**
Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
ASSEMBLYAI_API_KEY=your_assemblyai_key (optional)
```

## Usage

### Upload Files

```typescript
import FileUploader from '@/components/FileUploader';

<FileUploader
  userId="zach"
  projectId="my-project"
  maxFiles={10}
  onUploadComplete={(fileIds) => {
    console.log('Uploaded:', fileIds);
  }}
/>
```

### API Endpoints

#### Upload Single File
```bash
POST /api/files/upload
Content-Type: multipart/form-data

file: <file>
userId: "zach"
projectId: "general"
```

#### Upload Multiple Files
```bash
PUT /api/files/upload
Content-Type: multipart/form-data

file0: <file1>
file1: <file2>
userId: "zach"
projectId: "general"
```

#### List Files
```bash
GET /api/files?userId=zach&category=audio&limit=50
```

#### Get File
```bash
GET /api/files/[fileId]
```

#### Delete File
```bash
DELETE /api/files/[fileId]
```

#### Download File
```bash
GET /api/files/[fileId]/download
```

#### Check Status
```bash
GET /api/files/[fileId]/status
```

## File Size Limits

- Audio: 2GB
- Images: 50MB
- PDFs: 100MB
- Documents: 50MB
- Spreadsheets: 50MB
- Emails: 50MB

## Processing Details

### Audio Files
- Transcription with speaker diarization
- Chapter detection
- Sentiment analysis
- Entity detection
- Storage in knowledge base for RAG

### Images
- Vision analysis (description, text extraction, object detection)
- Thumbnail generation (400x400)
- Metadata extraction (dimensions, format, etc.)
- Storage in knowledge base

### PDFs
- Full text extraction
- Metadata extraction (author, title, pages)
- Content indexing
- Storage in knowledge base (chunked for large files)

### Documents
- Text extraction (preserves formatting)
- Word/line/character count
- Storage in knowledge base

### Spreadsheets
- Data parsing from all sheets
- Column header extraction
- Structured data storage
- First 100 rows cached

### Emails
- Header parsing (from, to, subject, date)
- Body extraction (plain text and HTML)
- Attachment detection
- Storage in knowledge base

## Database Schema

### uploaded_files
```sql
- id (TEXT, PK)
- user_id (TEXT)
- project_id (TEXT)
- filename (TEXT)
- file_type (TEXT)
- file_size (BIGINT)
- category (TEXT)
- status (TEXT) -- processing, completed, failed
- storage_url (TEXT)
- processing_result (JSONB)
- error_message (TEXT)
- metadata (JSONB)
- tags (TEXT[])
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- processed_at (TIMESTAMP)
```

### audio_transcriptions
```sql
- id (SERIAL, PK)
- user_id (TEXT)
- project_id (TEXT)
- file_id (TEXT, FK)
- filename (TEXT)
- duration (FLOAT)
- text (TEXT)
- words (JSONB)
- utterances (JSONB)
- chapters (JSONB)
- metadata (JSONB)
```

### processed_images
```sql
- id (SERIAL, PK)
- user_id (TEXT)
- project_id (TEXT)
- file_id (TEXT, FK)
- filename (TEXT)
- storage_url (TEXT)
- thumbnail_url (TEXT)
- width (INTEGER)
- height (INTEGER)
- format (TEXT)
- analysis (TEXT)
- metadata (JSONB)
```

### processed_documents
```sql
- id (SERIAL, PK)
- user_id (TEXT)
- project_id (TEXT)
- file_id (TEXT, FK)
- filename (TEXT)
- storage_url (TEXT)
- document_type (TEXT)
- content (TEXT)
- page_count (INTEGER)
- metadata (JSONB)
```

## Error Handling

All endpoints return consistent error responses:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

Common errors:
- 400: Invalid file type or size
- 404: File not found
- 500: Processing error

## Progress Tracking

Upload progress is tracked in real-time:

1. **Upload** (0-30%): File is being uploaded to server
2. **Processing** (30-90%): File is being processed
3. **Indexing** (90-100%): File is being indexed in knowledge base
4. **Completed** (100%): Processing finished

Poll `/api/files/[fileId]/status` to get current status.

## Performance

### Processing Times (approximate)
- Audio (10min): 30-60 seconds
- Images (5MB): 3-5 seconds
- PDF (100 pages): 10-20 seconds
- Documents: 2-5 seconds
- Spreadsheets: 3-10 seconds
- Emails: 1-3 seconds

### Optimization
- Files are processed asynchronously
- Queue system prevents server overload
- 3 concurrent processors (adjustable)
- Automatic retries on failure

## Testing

### Test Files Required
Create a `test-files/` directory with:
- `test-audio.m4a` (10MB audio file)
- `test-image.jpg` (5MB image)
- `test-document.pdf` (multi-page PDF)
- `test-doc.txt` (text file)
- `test-spreadsheet.csv` (CSV with data)
- `test-email.eml` (email file)

### Run Tests
```bash
# Test audio upload
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@test-files/test-audio.m4a" \
  -F "userId=zach"

# Test image upload
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@test-files/test-image.jpg" \
  -F "userId=zach"

# Test PDF upload
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@test-files/test-document.pdf" \
  -F "userId=zach"
```

## Monitoring

### Queue Status
```bash
GET /api/files/queue/status
```

Returns:
```json
{
  "queueLength": 5,
  "processing": 3,
  "pending": 2,
  "items": [...]
}
```

### Health Check
```bash
GET /api/files/queue/health
```

## Zapier Integration

All file events are logged to Zapier webhook:
- FILE_UPLOADED
- FILE_PROCESSED
- FILE_DELETED

## Security

- Row-level security on all tables
- Service role for server-side operations
- File validation (type and size)
- Storage policies (authenticated write, public read)
- CORS protection

## Troubleshooting

### Upload fails
- Check file size limits
- Verify file type is supported
- Check Supabase storage quotas

### Processing stuck
- Check queue status
- Verify API keys (OpenAI, AssemblyAI)
- Check server logs

### Download fails
- Verify file exists in storage
- Check storage policies
- Ensure service role key is correct

## Limitations

- Max 2GB per audio file
- Max 50MB for images/documents
- Max 100MB for PDFs
- Processing timeout: 10 minutes
- Queue capacity: 50 items

## Future Enhancements

- Video file support
- Real-time transcription streaming
- Batch processing API
- Advanced search and filtering
- Duplicate detection
- File versioning
- Collaborative annotations

## Support

For issues or questions:
1. Check server logs
2. Verify environment variables
3. Test with small files first
4. Check Supabase storage dashboard
5. Review queue status

## Deployment

When deploying to production:
1. Run Supabase setup script
2. Set environment variables
3. Test with small files
4. Monitor queue performance
5. Set up logging/alerting

## Success Criteria

- All file types upload successfully
- Processing completes within expected time
- Files are searchable in knowledge base
- Downloads work correctly
- Error handling is robust
- UI provides clear feedback
- System handles 2 concurrent users easily
