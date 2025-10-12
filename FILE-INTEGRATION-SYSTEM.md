# KimbleAI v4 - File Integration System

## Overview

A comprehensive, production-ready file integration system that provides seamless handling of ALL file types and sources in KimbleAI v4. This system enables viewing, processing, indexing, and semantic search across files from uploads, Google Drive, Gmail attachments, and more.

## Key Features

### 1. Universal File Support
- **Office Documents**: PDF, DOCX, XLSX, PPTX
- **Open Documents**: ODT, ODP, ODS
- **Images**: JPG, PNG, GIF, WEBP, HEIC
- **Media**: Audio (MP3, M4A, WAV), Video (MP4, MOV)
- **Text**: TXT, MD, CSV, JSON
- **Google Workspace**: Docs, Sheets, Slides (with live preview)
- **Email**: EML, MSG files

### 2. Content Extraction
- Uses `officeparser` for Office documents
- PDF parsing with `pdf-parse`
- DOCX with `mammoth` and `officeparser`
- XLSX with `xlsx` library
- Image analysis with OpenAI Vision
- Audio transcription (AssemblyAI + Whisper fallback)
- Google Docs export to Office formats

### 3. RAG Semantic Search
- OpenAI text-embedding-3-small (1536 dimensions)
- Hybrid search (vector + keyword matching)
- Project-scoped and global search
- Automatic content chunking for large files
- Related file discovery via semantic similarity

### 4. Multi-Source Integration
- **Uploads**: Direct file uploads
- **Google Drive**: File registration, preview URLs, metadata
- **Gmail**: Attachment extraction and indexing
- **Calendar**: Event attachments
- **Links**: External file URLs

### 5. Advanced Viewer Component
- React PDF viewer with zoom and navigation
- Google Docs/Sheets/Slides embedding
- Image, video, audio players
- Extracted text display for documents
- Spreadsheet preview
- Mobile-responsive design

### 6. Auto-Indexing Pipeline
- Background processing of unindexed files
- Automatic content extraction
- Embedding generation
- Knowledge base population
- Queue management and statistics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     File Integration System                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Unified File Registry                      │
│  Single source of truth for all files regardless of source  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│   Content    │    │  RAG Search  │      │   Viewer     │
│  Extractor   │───▶│    System    │◀────▶│  Component   │
└──────────────┘    └──────────────┘      └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│ officeparser │    │   OpenAI     │      │  react-pdf   │
│   mammoth    │    │  Embeddings  │      │ Google Embed │
│     xlsx     │    │   Supabase   │      │   HTML5      │
│   pdf-parse  │    │   pgvector   │      │   Players    │
└──────────────┘    └──────────────┘      └──────────────┘
```

## Database Schema

### file_registry Table
```sql
CREATE TABLE file_registry (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_source TEXT NOT NULL, -- 'upload' | 'drive' | 'email_attachment' | 'calendar_attachment' | 'link'
  source_id TEXT NOT NULL,
  source_metadata JSONB DEFAULT '{}',
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  preview_url TEXT,
  thumbnail_url TEXT,
  processed BOOLEAN DEFAULT false,
  processing_result JSONB,
  knowledge_base_ids TEXT[],
  tags TEXT[],
  projects TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  indexed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### knowledge_base Table
```sql
ALTER TABLE knowledge_base
  ADD COLUMN file_id TEXT REFERENCES file_registry(id),
  ADD COLUMN embedding vector(1536);

CREATE INDEX knowledge_base_embedding_hnsw_idx
ON knowledge_base USING hnsw (embedding vector_cosine_ops);
```

## API Endpoints

### File Operations

#### Register File
```typescript
POST /api/files
Body: {
  userId: string;
  source: 'upload' | 'drive' | 'email_attachment' | ...;
  sourceId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  tags?: string[];
  projects?: string[];
}
Response: { success: boolean; file: FileRegistryEntry }
```

#### Get File
```typescript
GET /api/files/[fileId]
Response: { success: boolean; file: FileWithContent }
```

#### Search Files
```typescript
GET /api/files/search?query=test&projectId=xxx
Response: { success: boolean; files: FileRegistryEntry[] }
```

#### Get Related Files
```typescript
GET /api/files/[fileId]/related
Response: { success: boolean; files: FileRegistryEntry[] }
```

### Indexing

#### Index Files
```typescript
POST /api/files/index
Body: {
  userId: string;
  fileId?: string;  // Single file
  processAll?: boolean;  // All unprocessed
  reindex?: boolean;  // Re-index existing
  projectId?: string;
}
Response: { success: boolean; stats: ProcessingStats }
```

#### Get Index Status
```typescript
GET /api/files/index?userId=xxx
Response: {
  success: boolean;
  queue: { unprocessedCount, processedCount, bySource };
  index: { totalEntries, totalFiles, entriesByCategory };
}
```

### Semantic Search

#### Search Content
```typescript
POST /api/search/semantic
Body: {
  userId: string;
  query: string;
  projectId?: string;
  category?: string;
  fileSource?: string;
  similarityThreshold?: number;  // 0-1, default 0.7
  limit?: number;  // default 20
  hybridSearch?: boolean;  // default true
  searchFiles?: boolean;  // Search files vs entries
}
Response: { success: boolean; results: SearchResult[] }
```

### Gmail Attachments

#### Get Attachments
```typescript
GET /api/google/gmail/attachments?messageId=xxx&accessToken=xxx&userId=xxx
Response: {
  success: boolean;
  attachments: Array<{filename, mimeType, size, attachmentId}>
}
```

#### Download and Index Attachment
```typescript
POST /api/google/gmail/attachments
Body: {
  messageId: string;
  accessToken: string;
  userId: string;
  attachmentId: string;
  attachmentFilename: string;
  attachmentMimeType: string;
  autoIndex?: boolean;  // default true
  projectId?: string;
}
Response: { success: boolean; file: FileRegistryEntry; indexed: boolean }
```

#### Bulk Process All Attachments
```typescript
PUT /api/google/gmail/attachments
Body: {
  messageId: string;
  accessToken: string;
  userId: string;
  projectId?: string;
  autoIndex?: boolean;
}
Response: {
  success: boolean;
  totalAttachments: number;
  successCount: number;
  results: Array<{filename, success, fileId?, error?}>
}
```

## Usage Examples

### 1. Register and Index a File

```typescript
import { UnifiedFileSystem } from '@/lib/unified-file-system';
import { RAGSearchSystem } from '@/lib/rag-search';

// Register file
const file = await UnifiedFileSystem.registerFile(
  userId,
  'upload',
  'unique-source-id',
  {
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    fileSize: 102400,
    storagePath: 'uploads/user123/document.pdf',
    tags: ['important', 'contracts'],
    projects: ['project-123'],
  }
);

// Index file for search
const result = await RAGSearchSystem.indexFile(
  file.id,
  userId,
  'project-123'
);

console.log(`Indexed with ${result.entriesCreated} knowledge entries`);
```

### 2. Search Files Semantically

```typescript
import { RAGSearchSystem } from '@/lib/rag-search';

// Search for files
const files = await RAGSearchSystem.searchFiles(
  userId,
  'contract terms and conditions',
  {
    projectId: 'project-123',
    similarityThreshold: 0.75,
    limit: 10,
  }
);

files.forEach(file => {
  console.log(`${file.filename}: ${file.similarity * 100}% match`);
  console.log(`Matched content: ${file.matchedContent}`);
});
```

### 3. Get Related Files

```typescript
import { RAGSearchSystem } from '@/lib/rag-search';

const relatedFiles = await RAGSearchSystem.getRelatedFiles(
  fileId,
  userId,
  { limit: 5 }
);

console.log(`Found ${relatedFiles.length} related files`);
```

### 4. Extract Content from Any File

```typescript
import { extractFileContent } from '@/lib/file-content-extractor';
import { UnifiedFileSystem } from '@/lib/unified-file-system';

const file = await UnifiedFileSystem.getFile(fileId);
const content = await extractFileContent(file);

console.log(`Extracted ${content.text.length} characters`);
console.log(`Metadata:`, content.metadata);
if (content.tables) {
  console.log(`Found ${content.tables.length} tables`);
}
```

### 5. Use Advanced File Viewer

```typescript
import { AdvancedFileViewer } from '@/components/AdvancedFileViewer';

function MyComponent() {
  return (
    <AdvancedFileViewer
      fileId="file-123"
      showMetadata={true}
      showRelated={true}
      showSearch={true}
      onClose={() => console.log('Viewer closed')}
    />
  );
}
```

### 6. Auto-Index All Unprocessed Files

```typescript
import { FileAutoIndexPipeline } from '@/lib/file-auto-index';

// Process all unindexed files
const stats = await FileAutoIndexPipeline.processUnindexedFiles(userId, {
  limit: 100,
  projectId: 'project-123',
});

console.log(`Processed: ${stats.processedFiles}`);
console.log(`Failed: ${stats.failedFiles}`);
console.log(`Entries created: ${stats.totalEntriesCreated}`);
console.log(`Time: ${stats.processingTime}ms`);
```

### 7. Register Google Drive File

```typescript
import { GoogleDriveIntegration } from '@/lib/google-drive-integration';

const fileId = await GoogleDriveIntegration.registerDriveFile(
  userId,
  'google-drive-file-id',
  accessToken,
  'project-123'
);

// Get preview URL for embedding
const previewUrl = GoogleDriveIntegration.generatePreviewUrl(
  'google-drive-file-id',
  'application/vnd.google-apps.document'
);

// Embed in iframe
<iframe src={previewUrl} width="100%" height="800px" />
```

### 8. Process Gmail Attachment

```typescript
// Via API
const response = await fetch('/api/google/gmail/attachments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messageId: 'msg-123',
    accessToken: userToken,
    userId: userId,
    attachmentId: 'att-456',
    attachmentFilename: 'contract.pdf',
    attachmentMimeType: 'application/pdf',
    autoIndex: true,
    projectId: 'project-123',
  }),
});

const result = await response.json();
console.log(`File indexed: ${result.file.id}`);
console.log(`Entries created: ${result.indexingResult.entriesCreated}`);
```

## Running Tests

```bash
# Run comprehensive integration tests
npx ts-node scripts/test-file-integration.ts

# Expected output:
# ✅ PASS: File Registration
# ✅ PASS: File Retrieval
# ✅ PASS: Text Content Extraction
# ✅ PASS: Embedding Generation
# ✅ PASS: File Indexing
# ✅ PASS: Semantic Search
# ... etc
```

## Database Migration

Run the migration to enable vector search and file linking:

```bash
# Connect to your Supabase database
psql $DATABASE_URL

# Run migration
\i database/file-integration-enhancement.sql
```

## Environment Variables

Ensure these are set in `.env.local`:

```bash
# OpenAI (for embeddings and vision)
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google OAuth (for Drive/Gmail)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

## Performance Characteristics

- **File Registration**: < 50ms
- **Content Extraction**:
  - Text: < 100ms
  - PDF: < 2s
  - DOCX: < 1s
  - Images (with Vision): < 5s
- **Embedding Generation**: < 500ms per chunk
- **Semantic Search**: < 300ms (with HNSW index)
- **File Indexing**: ~2-5s per file (depends on size)

## File Size Limits

- Audio: 2GB
- Images: 50MB
- PDF: 100MB
- Documents: 50MB
- Spreadsheets: 50MB
- Email: 50MB

## Supported MIME Types

### Documents
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
- `application/vnd.oasis.opendocument.text` (ODT)
- `application/vnd.oasis.opendocument.spreadsheet` (ODS)
- `application/vnd.oasis.opendocument.presentation` (ODP)

### Images
- `image/jpeg`, `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/heic`

### Media
- `audio/mpeg`, `audio/mp3`
- `audio/m4a`
- `audio/wav`
- `video/mp4`
- `video/quicktime`

### Text
- `text/plain`
- `text/csv`
- `text/markdown`
- `application/json`

### Google Workspace
- `application/vnd.google-apps.document`
- `application/vnd.google-apps.spreadsheet`
- `application/vnd.google-apps.presentation`

## Known Limitations

1. **Google Docs Export**: Requires valid OAuth token and proper permissions
2. **Large Files**: Files > 100MB may take longer to process
3. **OCR**: Not implemented for scanned PDFs (text must be selectable)
4. **Languages**: Optimized for English; other languages supported but may have lower accuracy
5. **Concurrent Processing**: Currently sequential; consider queue system for high volume

## Future Improvements

1. **Parallel Processing**: Multi-threaded indexing for faster bulk operations
2. **OCR Support**: Add Tesseract for scanned documents
3. **Video Transcription**: Automatic video-to-text using Whisper
4. **Advanced Chunking**: Semantic chunking based on document structure
5. **Caching**: Cache embeddings to reduce API calls
6. **Streaming**: Stream large file content for better memory management
7. **Webhooks**: Real-time notifications for indexing completion

## Troubleshooting

### Files Not Indexing

1. Check if file is registered: `GET /api/files/[fileId]`
2. Check queue status: `GET /api/files/index?userId=xxx`
3. Manually trigger indexing: `POST /api/files/index` with `fileId`
4. Check logs for extraction errors

### Search Not Finding Files

1. Verify files are indexed: Check `processed` and `indexed_at` fields
2. Lower similarity threshold: Try 0.5 instead of 0.7
3. Enable hybrid search: Set `hybridSearch: true`
4. Check embeddings: Verify `knowledge_base` entries exist

### Gmail Attachments Failing

1. Verify access token is valid and not expired
2. Check Gmail API permissions (must include attachments scope)
3. Ensure attachment IDs are correct
4. Check Supabase storage bucket exists: `gmail-attachments`

### Google Drive Preview Not Working

1. Verify file sharing settings in Drive
2. Check if user has access to the file
3. Use preview URL instead of view URL
4. For Google Docs, ensure MIME type is correct

## Support

For issues or questions:
1. Check logs in browser console and server console
2. Run integration tests: `npx ts-node scripts/test-file-integration.ts`
3. Review database migrations: `database/file-integration-enhancement.sql`
4. Check API endpoint responses for detailed error messages

---

**Built with**: Next.js 15, Supabase, OpenAI, officeparser, react-pdf, googleapis
**Last Updated**: 2025-01-13
