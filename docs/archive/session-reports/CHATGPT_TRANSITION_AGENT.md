# ChatGPT Transition Agent - Complete Documentation

**Version:** 1.0.0
**Created:** 2025-10-26
**Role:** Expert Data Transition & Import Specialist

---

## Executive Summary

The ChatGPT Transition Agent is a comprehensive, intelligent system for migrating ChatGPT conversation history into KimbleAI with automatic project matching, semantic analysis, and intelligent organization.

### Key Features

- **Intelligent Project Matching** using multi-factor scoring:
  - Title similarity (30% weight)
  - Keyword overlap (25% weight)
  - Semantic similarity via embeddings (25% weight)
  - Tag matching (20% weight)

- **Automatic Project Creation** for unmatched conversations
- **Topic-based Grouping** using GPT-4 for semantic clustering
- **Full Migration** to main conversation system with project linking
- **Duplicate Detection** to prevent redundant imports
- **Comprehensive Reporting** with detailed analytics
- **Dry Run Mode** for safe testing before actual migration

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ChatGPT Transition Workflow                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Fetch ChatGPT Conversations                             │
│  ────────────────────────────────────                            │
│  • Query chatgpt_conversations table                             │
│  • Load all conversations for user                               │
│  • Extract metadata (titles, timestamps, message counts)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Fetch Existing Projects                                │
│  ──────────────────────────────                                 │
│  • Query projects table                                          │
│  • Load active projects (exclude archived)                       │
│  • Extract project metadata (names, descriptions, tags)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Intelligent Project Matching                           │
│  ───────────────────────────────────                            │
│  For each conversation:                                          │
│    1. Extract keywords using frequency analysis                  │
│    2. Calculate match score for each project:                    │
│       ├─ Title similarity (Levenshtein distance)                 │
│       ├─ Keyword overlap analysis                                │
│       ├─ Semantic similarity (cosine similarity of embeddings)   │
│       └─ Tag matching                                            │
│    3. Select best match if confidence > threshold (default 70%)  │
│    4. Mark as unmatched if below threshold                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Auto-Create Projects (Optional)                        │
│  ──────────────────────────────────────────                     │
│  For unmatched conversations:                                    │
│    1. Group by topic using GPT-4 semantic clustering             │
│    2. Generate project name from topic/conversation titles       │
│    3. Generate descriptive project description                   │
│    4. Extract keywords for tags                                  │
│    5. Create project with metadata tracking import source        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Migrate to Main System (Optional)                      │
│  ────────────────────────────────────────────                   │
│  For each matched conversation:                                  │
│    1. Check for duplicates (title + project_id)                  │
│    2. Create conversation in main conversations table            │
│    3. Link to matched/created project via project_id            │
│    4. Fetch and migrate individual messages                      │
│    5. Preserve original ChatGPT metadata                         │
│    6. Update project statistics                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Generate Report                                         │
│  ──────────────────────────                                     │
│  • Summary statistics                                            │
│  • Match details with confidence scores                          │
│  • List of created projects                                      │
│  • Error log                                                     │
│  • Processing time                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### POST /api/chatgpt/transition

Execute comprehensive ChatGPT to KimbleAI transition

**Authentication:** Requires valid NextAuth session

**Request Body:**
```typescript
{
  autoCreateProjects?: boolean;     // Default: true
  minMatchConfidence?: number;      // Default: 0.7 (0-1 range)
  migrateToMainSystem?: boolean;    // Default: true
  preserveChatGPTData?: boolean;    // Default: true
  generateEmbeddings?: boolean;     // Default: false
  analyzeSentiment?: boolean;       // Default: false
  extractKeywords?: boolean;        // Default: true
  groupByTopic?: boolean;           // Default: true
  dryRun?: boolean;                 // Default: false
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    transitionId: string;
    stats: {
      totalConversations: number;
      conversationsMatched: number;
      conversationsMigrated: number;
      projectsCreated: number;
      projectsUpdated: number;
      messagesProcessed: number;
      duplicatesSkipped: number;
      errors: number;
      processingTimeMs: number;
    };
    matches: Array<{
      projectId: string;
      projectName: string;
      confidence: number;
      matchReasons: string[];
      conversationId: string;
      conversationTitle: string;
    }>;
    newProjects: string[];  // Array of project IDs
    errors: Array<{
      conversationId: string;
      error: string;
    }>;
    report: string;  // Markdown formatted report
  }
}
```

### GET /api/chatgpt/transition

Get transition agent status and capabilities

**Response:**
```typescript
{
  success: boolean;
  message: string;
  capabilities: string[];
  options: {
    [key: string]: string;  // Description of each option
  }
}
```

---

## Matching Algorithm Details

### Multi-Factor Scoring System

The agent uses a weighted scoring system to determine project matches:

#### 1. Title Similarity (30% weight)

Uses **Levenshtein distance** algorithm to calculate string similarity:

```typescript
similarity = (longerLength - editDistance) / longerLength
```

- Compares conversation title with project name
- Accounts for character insertions, deletions, and substitutions
- Score range: 0.0 (completely different) to 1.0 (identical)

#### 2. Keyword Overlap (25% weight)

Extracts and compares keywords:

```typescript
// Conversation keyword extraction
1. Tokenize title and content
2. Remove stop words (the, a, and, etc.)
3. Count word frequency
4. Return top 15 most frequent words

// Project keyword sources
- Project tags
- Description words
- Metadata fields

// Overlap calculation
overlap = keywords_in_common / total_conversation_keywords
```

#### 3. Semantic Similarity (25% weight)

Uses OpenAI embeddings for deep semantic understanding:

```typescript
// Generate embeddings
embedding1 = openai.embeddings('text-embedding-3-small', conversation_text)
embedding2 = openai.embeddings('text-embedding-3-small', project_description)

// Calculate cosine similarity
similarity = dot_product(embedding1, embedding2) /
             (norm(embedding1) * norm(embedding2))
```

- Uses `text-embedding-3-small` model (1536 dimensions)
- Captures semantic meaning beyond literal word matching
- Score range: -1.0 to 1.0 (typically 0.6+ indicates good match)

#### 4. Tag Matching (20% weight)

Direct tag comparison:

```typescript
tag_matches = project.tags.filter(tag =>
  conversation.title.includes(tag) ||
  conversation.content.includes(tag)
).length

score = min(tag_matches / project.tags.length, 1.0)
```

### Final Confidence Calculation

```typescript
confidence = (
  title_similarity * 0.30 +
  keyword_overlap * 0.25 +
  semantic_similarity * 0.25 +
  tag_matching * 0.20
)

// Auto-match if confidence >= minMatchConfidence (default 0.70)
```

---

## Topic-Based Grouping

When `groupByTopic: true`, the agent uses GPT-4 to intelligently group conversations:

### Grouping Process

```typescript
1. Extract conversation summaries (title + preview)
2. Send to GPT-4-turbo-preview with system prompt:
   "You are an expert at analyzing conversation topics
    and grouping them intelligently."
3. Request JSON response with format:
   {
     groups: [
       {
         topic: "Topic Name",
         conversationIds: ["id1", "id2", ...]
       }
     ]
   }
4. Create one project per group (if autoCreateProjects enabled)
```

### Fallback Behavior

If GPT-4 grouping fails:
- Each conversation becomes its own group
- Project created per conversation (if enabled)
- No semantic grouping applied

---

## Project Creation Strategy

### Auto-Generated Project Names

**Single Conversation:**
```
ChatGPT: [Conversation Title]
```

**Multiple Conversations (grouped):**
```
ChatGPT: [Topic Name]
```

Examples:
- `ChatGPT: Python Web Scraping Tutorial`
- `ChatGPT: Machine Learning Projects`
- `ChatGPT: Database Design Discussions`

### Auto-Generated Descriptions

```markdown
Project created from ChatGPT import containing N conversation(s):

- [Conversation Title 1]
- [Conversation Title 2]
- [Conversation Title 3]

Imported: MM/DD/YYYY
```

### Project Metadata

```typescript
{
  created_from: 'chatgpt_import',
  import_session: 'transition_[timestamp]',
  conversation_count: number,
  created_at: ISO_timestamp
}
```

---

## Migration Process

### Conversation Migration

For each matched conversation:

1. **Duplicate Check**
   ```sql
   SELECT id FROM conversations
   WHERE user_id = ?
     AND title = ?
     AND project_id = ?
   ```
   - Skip if duplicate found
   - Increment `duplicatesSkipped` counter

2. **Create Conversation**
   ```sql
   INSERT INTO conversations (
     user_id, project_id, title, message_count, metadata
   ) VALUES (?, ?, ?, ?, ?::jsonb)
   ```

3. **Fetch Messages**
   ```sql
   SELECT * FROM chatgpt_messages
   WHERE conversation_id = ?
   ORDER BY position ASC
   ```

4. **Migrate Messages**
   ```sql
   INSERT INTO messages (
     conversation_id, role, content, timestamp, metadata
   ) VALUES ...
   ```
   - Batch insert for performance
   - Preserve original ChatGPT message IDs in metadata
   - Track parent-child relationships

5. **Update Project Stats**
   ```sql
   SELECT * FROM get_project_stats(project_id)
   UPDATE projects SET stats = ? WHERE id = ?
   ```

### Data Preservation

Original ChatGPT data remains in `chatgpt_*` tables:
- `chatgpt_conversations`
- `chatgpt_messages`
- `chatgpt_chunks`
- `chatgpt_import_logs`

**Metadata tracking:**
```typescript
conversation.metadata = {
  imported_from: 'chatgpt',
  original_id: chatgpt_conversation_id,
  import_session: transition_session_id,
  match_confidence: 0.85,
  match_reasons: ['Title similarity: 92%', 'Keyword matches: 5'],
  chatgpt_create_time: unix_timestamp,
  chatgpt_update_time: unix_timestamp
}
```

---

## Error Handling

### Graceful Degradation

The agent continues processing even if individual operations fail:

```typescript
try {
  // Process conversation
} catch (error) {
  errors.push({
    conversationId: conv.id,
    error: error.message
  });
  // Continue to next conversation
}
```

### Error Categories

1. **Fetch Errors** - Database query failures
2. **Matching Errors** - Semantic analysis failures
3. **Creation Errors** - Project creation failures
4. **Migration Errors** - Conversation/message migration failures

All errors are:
- Logged to database (`agent_logs` table)
- Included in transition report
- Counted in final statistics
- Non-blocking (processing continues)

---

## Performance Optimization

### Batch Operations

- **Message Migration:** Batch inserts (all messages at once)
- **Project Stats:** Updated once per project (not per conversation)
- **Duplicate Checks:** Single query per conversation

### Parallel Processing

```typescript
// Calculate match scores in parallel
const projectScores = await Promise.all(
  projects.map(async (project) => {
    const score = await calculateMatchScore(conv, project, keywords);
    return { project, score };
  })
);
```

### Caching

- Singleton pattern for agent instance
- Reuses database connection
- Reuses OpenAI client

### Cost Estimation

**Embedding Generation:**
- Model: `text-embedding-3-small`
- Cost: $0.02 per 1M tokens
- ~1 token per 4 characters
- Example: 100 conversations × 1000 chars avg = 25k tokens = $0.0005

**GPT-4 Topic Grouping:**
- Model: `gpt-4-turbo-preview`
- Cost: $0.01 per 1k input tokens
- Example: 100 conversation summaries × 200 chars = 5k tokens = $0.05

**Total estimated cost for 100 conversations:** ~$0.05

---

## Usage Examples

### Basic Transition (Recommended)

```typescript
// POST to /api/chatgpt/transition
const response = await fetch('/api/chatgpt/transition', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    autoCreateProjects: true,
    minMatchConfidence: 0.7,
    migrateToMainSystem: true,
    groupByTopic: true,
  })
});

const result = await response.json();
console.log('Transition completed:', result.data.stats);
```

### Dry Run (Test Mode)

```typescript
const response = await fetch('/api/chatgpt/transition', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dryRun: true,  // No actual changes
    autoCreateProjects: true,
    groupByTopic: true,
  })
});

const result = await response.json();
console.log('Would create:', result.data.newProjects.length, 'projects');
console.log('Would match:', result.data.matches.length, 'conversations');
```

### Conservative Mode (Manual Review)

```typescript
const response = await fetch('/api/chatgpt/transition', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    autoCreateProjects: false,  // Don't auto-create
    minMatchConfidence: 0.85,    // Higher threshold
    migrateToMainSystem: false,  // Don't migrate yet
  })
});

// Review matches, then run again with migration enabled
```

### Aggressive Mode (Auto-Everything)

```typescript
const response = await fetch('/api/chatgpt/transition', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    autoCreateProjects: true,
    minMatchConfidence: 0.6,      // Lower threshold
    migrateToMainSystem: true,
    groupByTopic: true,
    generateEmbeddings: true,     // Generate for search
  })
});
```

---

## Transition Report Format

### Example Report

```markdown
# ChatGPT Transition Report
Generated: 2025-10-26T08:15:30.000Z
Session ID: transition_1730102130000

## Summary Statistics
- Total Conversations: 150
- Conversations Matched: 120
- Conversations Migrated: 118
- Projects Created: 8
- Projects Updated: 15
- Messages Processed: 3,450
- Duplicates Skipped: 2
- Errors: 0
- Processing Time: 45.23s

## Match Details

### Building a Web Scraper with Python
- Project: Python Development
- Confidence: 92.5%
- Reasons: Title similarity: 88%, Keyword matches: 12, Semantic similarity: 95%

### Machine Learning Model Training
- Project: AI/ML Projects
- Confidence: 87.3%
- Reasons: Title similarity: 75%, Keyword matches: 8, Tag matches: 3

[... more matches ...]

## New Projects Created
1. Project ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
2. Project ID: b2c3d4e5-f6a7-8901-bcde-f12345678901
[... more projects ...]

---
Transition Agent v1.0.0
```

---

## Database Schema Impact

### Tables Modified

**conversations** (main system)
- New rows created for migrated conversations
- `project_id` linked to matched/created projects
- `metadata` contains import tracking

**messages** (main system)
- New rows created for all migrated messages
- `metadata` contains original ChatGPT message IDs

**projects**
- New rows for auto-created projects
- `stats` updated for existing projects
- `metadata` tracks import source

**agent_logs**
- New rows for all transition events
- Filterable by `session_id`

### Tables Preserved

If `preserveChatGPTData: true` (default):
- `chatgpt_conversations` - **NOT MODIFIED**
- `chatgpt_messages` - **NOT MODIFIED**
- `chatgpt_chunks` - **NOT MODIFIED**
- `chatgpt_import_logs` - **NOT MODIFIED**

---

## Logging & Monitoring

All transition events are logged to `agent_logs` table:

```typescript
{
  user_id: string;
  agent_name: 'chatgpt-transition-agent';
  agent_version: '1.0.0';
  session_id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  metadata: {
    timestamp: ISO_string;
  }
}
```

### Query Transition Logs

```sql
SELECT * FROM agent_logs
WHERE agent_name = 'chatgpt-transition-agent'
  AND session_id = 'transition_1730102130000'
ORDER BY created_at DESC;
```

---

## Best Practices

### Recommended Workflow

1. **First Run: Dry Mode**
   ```typescript
   { dryRun: true, autoCreateProjects: true, groupByTopic: true }
   ```
   - Review what would be created
   - Check match confidence scores
   - Validate project groupings

2. **Second Run: Migration**
   ```typescript
   { dryRun: false, autoCreateProjects: true, migrateToMainSystem: true }
   ```
   - Execute actual migration
   - Monitor progress
   - Review transition report

3. **Third Run: Re-run for New Data**
   ```typescript
   { dryRun: false, autoCreateProjects: true }
   ```
   - Duplicate detection prevents re-imports
   - Only new conversations processed

### Configuration Tips

**High Precision (few false positives):**
```typescript
minMatchConfidence: 0.85
autoCreateProjects: false
```

**High Recall (catch all matches):**
```typescript
minMatchConfidence: 0.6
autoCreateProjects: true
```

**Balanced (recommended):**
```typescript
minMatchConfidence: 0.7
autoCreateProjects: true
groupByTopic: true
```

---

## Troubleshooting

### "No conversations found"
- Ensure ChatGPT export has been imported first
- Use `/api/chatgpt/import` to import `conversations.json`

### "Low match confidence scores"
- Reduce `minMatchConfidence` threshold
- Enable `autoCreateProjects` to create new projects

### "Many duplicates skipped"
- Normal if running transition multiple times
- Existing conversations detected and skipped

### "Embedding errors"
- Check OpenAI API key is valid
- Verify `OPENAI_API_KEY` environment variable
- Semantic similarity disabled if embeddings fail

### "Project stats not updating"
- Verify `get_project_stats()` database function exists
- Check database permissions

---

## Advanced Features

### Custom Keyword Extraction

The agent uses frequency analysis with stop-word filtering:

```typescript
// Customize by modifying stopWords set
const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'but',
  'in', 'on', 'at', 'to', 'for', 'of'
]);
```

### Custom Matching Logic

Override `calculateMatchScore` to implement custom logic:

```typescript
private async calculateMatchScore(
  conversation: ChatGPTConversation,
  project: Project,
  keywords: string[]
): Promise<{ confidence: number; reasons: string[] }> {
  // Custom implementation
}
```

---

## Roadmap

### Planned Enhancements

- **Sentiment Analysis** - Tag conversations with sentiment
- **Category Detection** - Auto-categorize by domain (tech, business, etc.)
- **Timeline Visualization** - Show migration flow
- **Batch Processing** - Process conversations in batches for large datasets
- **Rollback Support** - Undo migration if needed
- **Incremental Sync** - Automatic periodic imports
- **Custom Matching Rules** - User-defined matching criteria

---

## Support

For issues or questions:
1. Check `agent_logs` table for error details
2. Review transition report for statistics
3. Run in `dryRun` mode to test without changes
4. Check database connectivity and permissions

---

**End of Documentation**

*ChatGPT Transition Agent v1.0.0*
*Expert Data Transition & Import Specialist*
*Built with Claude Code*
