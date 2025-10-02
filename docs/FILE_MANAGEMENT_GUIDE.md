# KimbleAI File Management Guide

## Overview

KimbleAI provides comprehensive file upload, processing, and AI-powered search capabilities. Upload any supported file type, and it will be automatically processed, indexed, and made searchable through natural language queries in the AI chat interface.

## Supported File Types

### Audio Files (.m4a, .mp3, .wav, .flac, .ogg, .aac)
- **Max Size:** 2GB
- **Processing:**
  - Automatic transcription using AssemblyAI or OpenAI Whisper
  - Speaker diarization (identifies different speakers)
  - Chapter detection
  - Sentiment analysis
  - Timestamps for easy navigation
- **Use Cases:**
  - Meeting recordings
  - Podcast episodes
  - Interviews
  - Voice memos
  - D&D session recordings

### Images (.jpg, .png, .heic, .webp, .gif, .bmp)
- **Max Size:** 50MB
- **Processing:**
  - OpenAI Vision analysis
  - OCR (Optical Character Recognition) for text extraction
  - Thumbnail generation
  - Object and scene detection
  - Searchable descriptions
- **Use Cases:**
  - Screenshots
  - Diagrams
  - Photos with text
  - Charts and graphs
  - Error messages
  - Product images

### PDF Files (.pdf)
- **Max Size:** 100MB
- **Processing:**
  - Full text extraction
  - Page-by-page indexing
  - Metadata extraction (title, author, subject)
  - Searchable content
  - Word count and page count
- **Use Cases:**
  - Contracts
  - Reports
  - Manuals
  - Research papers
  - Forms
  - Invoices

### Documents (.docx, .txt, .md, .rtf)
- **Max Size:** 50MB
- **Processing:**
  - Full text extraction
  - Preserves formatting where possible
  - Word count, line count, character count
  - Searchable content
- **Use Cases:**
  - Project documentation
  - Notes
  - Articles
  - Essays
  - Technical documentation

### Spreadsheets (.csv, .xlsx, .xls)
- **Max Size:** 50MB
- **Processing:**
  - Data extraction from all sheets
  - Column and row structure preserved
  - First 100 rows stored for preview
  - Searchable cell content
- **Use Cases:**
  - Financial data
  - Contact lists
  - Inventory tracking
  - Project timelines
  - Data analysis

### Email Files (.eml, .msg)
- **Max Size:** 50MB
- **Processing:**
  - Header extraction (from, to, subject, date)
  - Body content (plain text and HTML)
  - Attachment list
  - Searchable by sender, subject, or content
- **Use Cases:**
  - Email archives
  - Important correspondence
  - Project communications
  - Support tickets

## How to Upload Files

### Method 1: Upload Page
1. Navigate to `/files/upload` or click "Upload File" from the Files page
2. Drag and drop files or click "Select Files"
3. Select up to 10 files at once
4. Files will automatically upload and begin processing
5. Watch real-time progress with status updates

### Method 2: Files Page
1. Go to `/files`
2. Click "Upload File" button in top right
3. Follow the same upload process

### Method 3: Through Chat (Coming Soon)
- Ask the AI: "Can you help me upload a file?"
- The AI will guide you through the upload process

## AI-Powered File Search

Once uploaded, all files are automatically indexed and searchable through the AI chat interface. The AI can search across:
- File names
- File content (transcriptions, extracted text, analysis)
- Metadata (dates, sizes, projects)
- Related knowledge base entries

### Example Queries

**Finding Files:**
- "Show me my recently uploaded files"
- "Find all PDFs about contracts"
- "What audio files do I have?"
- "List my files from the military transition project"

**Searching Content:**
- "Search my PDFs for payment terms"
- "What was discussed in yesterday's meeting recording?"
- "Find screenshots with error messages"
- "Show me emails from John about the project"

**Organizing Files:**
- "Organize my uploaded files by project"
- "Move these PDFs to the work project"
- "Tag my audio files as 'meetings'"

**Getting Details:**
- "What does my contract PDF say about termination?"
- "Summarize the last meeting recording"
- "What's in the screenshot I uploaded today?"
- "Read the email from sarah@example.com"

## AI Chat Function Calling

The AI automatically uses these functions when you ask about files:

### `search_files`
Searches all uploaded files by content or name
- **Parameters:** query, file_type, project_id, max_results
- **Returns:** Matching files with previews

### `get_uploaded_files`
Lists recently uploaded files with filters
- **Parameters:** category, project_id, limit
- **Returns:** List of files with metadata

### `organize_files`
Organizes files into projects or adds tags
- **Parameters:** file_ids, project_id, tags
- **Returns:** Success confirmation

### `get_file_details`
Gets detailed information about a specific file
- **Parameters:** file_id
- **Returns:** Full file details including content

## File Processing Pipeline

### Step 1: Upload
- File is uploaded to Supabase Storage
- File record created in database
- Progress tracking initialized

### Step 2: Processing
**Audio Files:**
1. Upload to storage
2. Send to AssemblyAI for transcription
3. Extract speakers, chapters, timestamps
4. Store transcription in database

**Images:**
1. Upload original to storage
2. Generate thumbnail (400x400)
3. Analyze with OpenAI Vision
4. Extract text with OCR
5. Store analysis in database

**PDFs:**
1. Upload to storage
2. Parse PDF structure
3. Extract text from all pages
4. Extract metadata
5. Store content in database

**Documents:**
1. Upload to storage
2. Extract text (docx via mammoth, txt directly)
3. Calculate statistics
4. Store content in database

**Spreadsheets:**
1. Upload to storage
2. Parse all sheets
3. Extract rows and columns
4. Store structure and data

**Emails:**
1. Upload to storage
2. Parse headers and body
3. Extract attachments list
4. Store parsed data

### Step 3: Indexing
- Generate embeddings for semantic search
- Store in knowledge_base table
- Link to original file
- Make searchable through AI

### Step 4: Ready
- File is now fully searchable
- Appears in file list
- Accessible through AI chat
- Can be organized and tagged

## API Endpoints

### Upload File
```
POST /api/files/upload
Body: FormData with 'file', 'userId', 'projectId'
Returns: { fileId, status, category }
```

### Search Files
```
GET /api/files/search?query=meeting&fileType=audio&userId=zach
Returns: { results: [...files], resultsCount }
```

### List Files
```
GET /api/files?userId=zach&category=pdf&limit=20
Returns: { files: [...], total, categories }
```

### Get File Details
```
GET /api/files/[id]?userId=zach
Returns: { file: {...full details} }
```

### Check Upload Progress
```
GET /api/files/upload?fileId=file_abc123
Returns: { status, progress, message }
```

## Best Practices

### For Audio Files
- Use clear audio with minimal background noise
- Keep individual files under 1GB for faster processing
- Name files descriptively (e.g., "team-meeting-2025-09-30.m4a")

### For PDFs
- Ensure PDFs are not password-protected
- Use searchable PDFs (not scanned images) for best results
- Split very large PDFs (>500 pages) into smaller chunks

### For Images
- Use high-quality images for better OCR results
- Ensure text is clearly visible
- Avoid overly compressed images

### For Organization
- Use consistent project names
- Tag files with relevant keywords
- Upload related files together

### For Search
- Use natural language queries
- Be specific about what you're looking for
- Include context (dates, projects, file types)

## Troubleshooting

### Upload Failed
- **Check file size** - Ensure file is under the limit for its type
- **Check file format** - Verify it's a supported format
- **Check internet connection** - Large files need stable connections
- **Try again** - Sometimes temporary issues resolve themselves

### Processing Failed
- **Check file integrity** - Ensure file isn't corrupted
- **For audio:** Try converting to a more common format (mp3, m4a)
- **For PDFs:** Try re-saving or using a different PDF tool
- **For images:** Try converting to jpg or png

### File Not Searchable
- **Wait for processing** - Check file status in the Files page
- **Verify content** - Empty or encrypted files can't be indexed
- **Try reprocessing** - Delete and re-upload the file

### AI Can't Find File
- **Use exact file name** - Or unique keywords from the content
- **Check project filter** - Make sure you're searching the right project
- **Verify upload completed** - Check Files page for status

## Privacy & Security

- **Storage:** All files stored securely in Supabase Storage
- **Access:** Files only accessible by the uploading user
- **Processing:** Files processed via secure APIs (OpenAI, AssemblyAI)
- **Encryption:** Data encrypted in transit and at rest
- **Deletion:** Files can be permanently deleted from the Files page

## Future Features

Coming soon:
- Drag and drop in chat interface
- Batch file operations
- File sharing between users
- Advanced filtering and sorting
- File version history
- Collaborative file annotations
- Custom processing pipelines
- Webhook notifications

## Support

For issues or questions:
- Email: support@kimbleai.com
- In-app: Ask the AI "I need help with file uploads"
- Documentation: https://www.kimbleai.com/docs

---

Last Updated: October 1, 2025
Version: 1.0
