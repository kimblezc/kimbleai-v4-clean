# ChatGPT Import & RAG Search System

## Overview

This system allows you to import your entire ChatGPT conversation history into kimbleai.com, store it on Google Drive, and enable full RAG (Retrieval Augmented Generation) semantic search across all your ChatGPT conversations.

## Features

✅ **Full ChatGPT Export Import** - Import conversations.json from ChatGPT
✅ **Google Drive Backup** - Automatically backup exports to Google Drive
✅ **Vector Embeddings** - Generate OpenAI embeddings for semantic search
✅ **Semantic Search** - Find conversations by meaning, not just keywords
✅ **RAG Integration** - ChatGPT history automatically included in chat context
✅ **Granular Search** - Search full conversations or specific chunks
✅ **Statistics Dashboard** - Track import status and coverage

---

## Quick Start

### Step 1: Export Your ChatGPT Data

1. Go to [ChatGPT Settings → Data Controls](https://chat.openai.com/settings/data-controls)
2. Click **"Export data"**
3. Wait for the email from OpenAI (can take a few minutes to an hour)
4. Download the ZIP file from the email
5. Extract the ZIP file to find `conversations.json`

### Step 2: Import into KimbleAI

1. Go to https://www.kimbleai.com/chatgpt-import
2. Click the **"Upload Export"** tab
3. Select your `conversations.json` file
4. Choose options:
   - ✅ **Upload to Google Drive** - Recommended for backup
   - ✅ **Generate embeddings** - Required for semantic search
5. Click **"Import ChatGPT Export"**
6. Wait for the import to complete (shows progress)

### Step 3: Search Your ChatGPT History

1. Go to the **"Search History"** tab
2. Enter a query like:
   - "What did I discuss about D&D?"
   - "Conversations about Python programming"
   - "Travel plans to Japan"
3. Choose search type:
   - **Conversations** - Search full conversations (faster, broader)
   - **Chunks** - Search specific parts (slower, more precise)
4. View results with relevance scores

---

## How It Works

### Architecture

```
conversations.json
    ↓
1. Parse ChatGPT export format
    ↓
2. Upload to Google Drive (optional)
    ↓
3. Store in Supabase database
    ↓
4. Generate embeddings with OpenAI
    ↓
5. Enable semantic vector search
    ↓
6. Integrate into main chat RAG system
```

### Database Schema

The system creates 4 tables:

1. **chatgpt_conversations** - Full conversations with embeddings
2. **chatgpt_messages** - Individual messages with embeddings
3. **chatgpt_chunks** - Chunked conversations for granular search
4. **chatgpt_import_logs** - Import history and status

### Embedding Strategy

- **Full conversations**: One embedding per conversation (fast broad search)
- **Chunks**: Multiple embeddings per conversation (precise search)
- **Messages**: Individual message embeddings for very granular search
- **Model**: OpenAI `text-embedding-3-small` (1536 dimensions)

---

## API Endpoints

### Import ChatGPT Export

```bash
POST /api/chatgpt/import
Content-Type: multipart/form-data

{
  "file": <conversations.json>,
  "uploadToDrive": true,
  "generateEmbeddings": true
}
```

**Response:**
```json
{
  "success": true,
  "importId": "uuid",
  "driveFileId": "google-drive-id",
  "stats": {
    "totalConversations": 150,
    "totalMessages": 2500,
    "dateRange": {
      "earliest": "2023-01-01",
      "latest": "2025-10-20"
    }
  }
}
```

### Search ChatGPT Conversations

```bash
POST /api/chatgpt/search
Content-Type: application/json

{
  "query": "What did we discuss about AI agents?",
  "searchType": "conversations",
  "similarityThreshold": 0.7,
  "limit": 10
}
```

**Response:**
```json
{
  "query": "What did we discuss about AI agents?",
  "searchType": "conversations",
  "results": [
    {
      "id": "conv-123",
      "title": "Building Autonomous Agents",
      "full_text": "...",
      "createDate": "2025-09-15",
      "similarity": 0.89,
      "message_count": 45
    }
  ],
  "totalResults": 5
}
```

### Get Import Statistics

```bash
GET /api/chatgpt/stats
```

**Response:**
```json
{
  "stats": {
    "total_conversations": 150,
    "total_messages": 2500,
    "total_chunks": 450,
    "embedded_conversations": 150,
    "embedding_coverage_percent": 100,
    "date_range_formatted": {
      "earliest": "2023-01-01",
      "latest": "2025-10-20"
    }
  }
}
```

---

## RAG Integration

### Automatic Context Inclusion

When you chat with kimbleai.com, your ChatGPT history is **automatically searched** and relevant conversations are included in the context.

Example workflow:

1. You ask: *"What were my D&D character ideas?"*
2. KimbleAI searches your ChatGPT history for D&D conversations
3. Top 5 relevant chunks are included in the prompt context
4. AI responds with full knowledge of your ChatGPT discussions

### Manual Integration

You can also manually get ChatGPT context in your code:

```typescript
import { getChatGPTContext } from '@/lib/chatgpt-rag-integration';

const context = await getChatGPTContext(
  "What did I discuss about AI?",
  "user-id",
  {
    similarityThreshold: 0.75,
    maxResults: 5
  }
);

console.log(context.summary); // Formatted context for AI
```

### Enhanced RAG Context

Combine ChatGPT context with existing RAG sources:

```typescript
import { getEnhancedRAGContext } from '@/lib/chatgpt-rag-integration';

const enhanced = await getEnhancedRAGContext(
  query,
  userId,
  existingContext,
  {
    includeChatGPT: true,
    chatGPTThreshold: 0.75,
    chatGPTMaxResults: 5
  }
);

// Use enhanced.combinedContextString in your prompt
```

---

## Cost Estimation

### Embedding Costs (OpenAI text-embedding-3-small)

- **Price**: $0.02 per 1M tokens
- **Estimate**: ~500 tokens per conversation on average

**Example:**
- 150 conversations × 500 tokens = 75,000 tokens
- 75,000 tokens / 1,000,000 × $0.02 = **$0.0015**

**Result**: Embedding 150 conversations costs less than 1 cent.

### Storage Costs

- **Supabase**: Free tier supports millions of rows
- **Google Drive**: Unlimited storage with Workspace

**Total estimated cost**: < $1 per year for most users

---

## Troubleshooting

### Import Fails

**Problem**: Import returns error
**Solution**:
1. Verify file is valid `conversations.json` from ChatGPT
2. Check file is not corrupted (should be valid JSON)
3. Try importing without "Upload to Google Drive" if Drive auth fails
4. Check browser console for detailed error messages

### Search Returns No Results

**Problem**: Search doesn't find conversations
**Solution**:
1. Verify embeddings were generated (check Statistics tab)
2. Lower similarity threshold (try 0.6 instead of 0.7)
3. Try broader search terms
4. Use "chunks" search type for more granular results

### Embedding Coverage < 100%

**Problem**: Not all conversations have embeddings
**Solution**:
1. Some conversations may have failed during embedding
2. Re-run import with "Generate embeddings" enabled
3. Check import logs for specific error messages
4. Very long conversations may timeout - try chunked import

---

## File Structure

### Created Files

```
lib/
  ├── chatgpt-export-parser.ts       # Parses conversations.json
  ├── chatgpt-import-system.ts       # Import & embedding pipeline
  └── chatgpt-rag-integration.ts     # RAG system integration

app/api/chatgpt/
  ├── import/route.ts                # Import API endpoint
  ├── search/route.ts                # Search API endpoint
  └── stats/route.ts                 # Statistics API endpoint

app/chatgpt-import/
  └── page.tsx                       # UI for import & search

database/
  └── chatgpt-import-schema.sql      # Database schema
```

---

## Database Schema Details

### chatgpt_conversations

```sql
CREATE TABLE chatgpt_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    create_time BIGINT NOT NULL,
    update_time BIGINT NOT NULL,
    message_count INTEGER NOT NULL,
    full_text TEXT NOT NULL,
    embedding vector(1536),
    drive_file_id TEXT,
    import_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);
```

### chatgpt_messages

```sql
CREATE TABLE chatgpt_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES chatgpt_conversations(id),
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    create_time BIGINT NOT NULL,
    parent_id TEXT,
    position INTEGER NOT NULL,
    embedding vector(1536),
    metadata JSONB
);
```

### chatgpt_chunks

```sql
CREATE TABLE chatgpt_chunks (
    id UUID PRIMARY KEY,
    conversation_id TEXT REFERENCES chatgpt_conversations(id),
    user_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_ids TEXT[],
    embedding vector(1536),
    metadata JSONB
);
```

---

## Advanced Usage

### Custom Chunking Strategy

Modify `chunkConversation()` in `chatgpt-export-parser.ts`:

```typescript
export function chunkConversation(
  conversation: ChatGPTParsedConversation,
  maxChunkSize: number = 2000  // Adjust chunk size
): Array<{ text: string; messageIds: string[] }> {
  // Custom chunking logic here
}
```

### Filter by Date Range

Search only conversations from a specific time period:

```typescript
const results = await searchChatGPTConversations(query, userId, {
  startDate: 1640995200,  // Unix timestamp
  endDate: 1672531200
});
```

### Integration with Main Chat

The chat system automatically includes ChatGPT context when:
1. User has imported ChatGPT conversations
2. Query has relevance to ChatGPT history (similarity > 0.75)
3. AutoReferenceButler determines additional context is needed

---

## Security & Privacy

- ✅ **Row Level Security** - Users can only access their own data
- ✅ **Encrypted Storage** - All data encrypted at rest in Supabase
- ✅ **Google Drive Backup** - Optional, uses your own Drive account
- ✅ **No Data Sharing** - Your ChatGPT history stays private
- ✅ **Audit Logs** - All imports tracked in `chatgpt_import_logs`

---

## Future Enhancements

### Planned Features

- [ ] Incremental updates (import only new conversations)
- [ ] Conversation tagging and categorization
- [ ] Export back to ChatGPT format
- [ ] Conversation merging across accounts
- [ ] Advanced filters (by topic, date, participants)
- [ ] Conversation visualization and analytics
- [ ] Integration with other chat platforms (Discord, Slack, etc.)

---

## Support

For issues or questions:

1. Check the Statistics tab for import status
2. Review browser console for detailed errors
3. Check Supabase logs for database errors
4. Review `chatgpt_import_logs` table for import history

---

## License

Part of kimbleai-v4 project.
