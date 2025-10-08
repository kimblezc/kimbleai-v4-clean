# Photo Analysis - Search Examples

## How Photos Are Now Searchable

With the new improvements, photos are stored in the `knowledge_base` table with vector embeddings, making them fully searchable alongside conversations, documents, and other content.

---

## Example 1: Semantic Search for Photos

### Scenario: "Find photos with error messages"

```typescript
// In chat system or API
const query = "error messages in code";
const embedding = await generateEmbedding(query);

// Search across ALL knowledge including photos
const results = await supabase.rpc('search_knowledge_base', {
  query_embedding: embedding,
  user_id_param: userUuid,
  limit_count: 10,
  category_filter: 'photo-analysis'  // Optional: photos only
});

// Results will include:
// - Technical screenshots with errors
// - Code photos with exceptions
// - Debug logs captured in images
```

---

## Example 2: Project-Based Photo Retrieval

### Scenario: "Show all D&D photos from my campaign"

```sql
SELECT
  id,
  title,
  content,
  tags,
  metadata->>'project_category' as project,
  metadata->>'analysis_type' as type,
  created_at
FROM knowledge_base
WHERE user_id = 'user-uuid'
  AND category = 'photo-analysis'
  AND metadata->>'project_category' = 'gaming'
ORDER BY created_at DESC;
```

**Results:**
- Character sheets
- Dice rolls
- Campaign maps
- Miniature photos
- Rule references

---

## Example 3: Tag-Based Discovery

### Scenario: "Find all receipts I've photographed"

```sql
SELECT
  id,
  title,
  content,
  tags,
  metadata->>'fileName' as filename,
  created_at
FROM knowledge_base
WHERE user_id = 'user-uuid'
  AND category = 'photo-analysis'
  AND 'receipt' = ANY(tags)
ORDER BY created_at DESC;
```

---

## Example 4: OCR Text Search

### Scenario: "Find photos containing the word 'deadline'"

```sql
SELECT
  id,
  title,
  content,
  tags,
  metadata
FROM knowledge_base
WHERE user_id = 'user-uuid'
  AND category = 'photo-analysis'
  AND content ILIKE '%deadline%'
ORDER BY created_at DESC;
```

**Use Cases:**
- Find specific invoice numbers
- Search for license plate numbers
- Locate character names in D&D sheets
- Find recipe ingredients

---

## Example 5: Cross-Modal Search (Chat + Photos)

### Scenario: User asks "What was that error I photographed last week?"

**Backend Flow:**
```typescript
// 1. Generate embedding from user question
const queryEmbedding = await generateEmbedding(
  "error message screenshot from last week"
);

// 2. Search knowledge base (includes photos!)
const results = await supabase.rpc('search_knowledge_base', {
  query_embedding: queryEmbedding,
  user_id_param: userUuid,
  limit_count: 5
});

// 3. Filter for recent photos with 'error' tag
const errorPhotos = results.filter(r =>
  r.source_type === 'file' &&
  r.tags.includes('error') &&
  new Date(r.created_at) > oneWeekAgo
);

// 4. Include in chat context
const context = errorPhotos.map(p =>
  `Photo: ${p.title}\nAnalysis: ${p.content}`
).join('\n\n');

// 5. AI responds with specific error details
```

---

## Example 6: Multi-Tag Query

### Scenario: "Show me handwritten recipe cards"

```sql
SELECT
  id,
  title,
  content,
  tags,
  metadata
FROM knowledge_base
WHERE user_id = 'user-uuid'
  AND category = 'photo-analysis'
  AND tags @> ARRAY['recipe', 'handwritten']
ORDER BY created_at DESC;
```

---

## Example 7: Importance-Based Retrieval

### Scenario: "Show me important automotive photos"

```sql
SELECT
  id,
  title,
  content,
  tags,
  importance,
  metadata->>'project_category' as project
FROM knowledge_base
WHERE user_id = 'user-uuid'
  AND category = 'photo-analysis'
  AND metadata->>'project_category' = 'automotive'
  AND tags && ARRAY['damage', 'urgent', 'important']
ORDER BY importance DESC, created_at DESC
LIMIT 10;
```

---

## Example 8: Time-Based Analysis

### Scenario: "What have I photographed this month?"

```sql
SELECT
  metadata->>'project_category' as category,
  COUNT(*) as photo_count,
  array_agg(DISTINCT unnest(tags)) as all_tags
FROM knowledge_base
WHERE user_id = 'user-uuid'
  AND category = 'photo-analysis'
  AND created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY metadata->>'project_category'
ORDER BY photo_count DESC;
```

---

## Example 9: Vector Similarity Search

### Scenario: "Find photos similar to this analysis"

```typescript
// User uploads a new D&D character sheet
const newAnalysis = "Character sheet for Thorin, Level 5 Dwarf Fighter...";
const newEmbedding = await generateEmbedding(newAnalysis);

// Find similar photos (other character sheets)
const similarPhotos = await supabase.rpc('search_knowledge_base', {
  query_embedding: newEmbedding,
  user_id_param: userUuid,
  limit_count: 5,
  category_filter: 'photo-analysis'
});

// Results: Other character sheets, campaign materials, etc.
```

---

## Example 10: Combined Filters

### Scenario: "Technical screenshots from last month with code"

```sql
SELECT
  id,
  title,
  content,
  tags,
  metadata->>'fileName' as filename,
  created_at
FROM knowledge_base
WHERE user_id = 'user-uuid'
  AND category = 'photo-analysis'
  AND metadata->>'analysis_type' = 'technical'
  AND tags @> ARRAY['code', 'screenshot']
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC;
```

---

## Integration with Chat System

Photos are now automatically available in conversation context:

```typescript
// When user asks a question, BackgroundIndexer retrieves relevant photos
const userQuestion = "How did I fix that React error?";

// System searches knowledge_base including photos
const relevantContext = await searchKnowledgeBase(userQuestion);

// Context might include:
// - Previous conversation about React errors
// - Photo of error message screenshot
// - Code snippet from another conversation
// - Documentation saved earlier

// AI can respond: "Based on the error screenshot you took on
// Jan 15th, you fixed it by updating the useEffect dependency array..."
```

---

## API Usage

### Upload and Store Photo:
```bash
curl -X POST http://localhost:3000/api/photo \
  -F "photo=@screenshot.png" \
  -F "analysisType=technical" \
  -F "userId=zach"
```

### Response:
```json
{
  "success": true,
  "analysis": "This is a screenshot showing a React error...",
  "photoId": "photo_1234567890_abc123",
  "knowledgeBaseId": "550e8400-e29b-41d4-a716-446655440000",
  "vectorSearchEnabled": true,
  "autoTags": ["technical", "photo-analysis", "code", "error", "react", "screenshot"],
  "rag": {
    "stored": true,
    "searchable": true,
    "message": "Photo analysis stored in knowledge base and available for semantic search"
  }
}
```

### Search Photos Later:
```typescript
// The photo is now searchable via:
// 1. Tags: ['error', 'react', 'code']
// 2. Content: Full OCR text from screenshot
// 3. Vector: Semantic similarity to queries
// 4. Metadata: Project, type, timestamp
```

---

## Performance Tips

### 1. Use Category Filters
```sql
-- FAST: Filter by category first
WHERE category = 'photo-analysis'
  AND tags @> ARRAY['receipt']

-- SLOWER: Search all categories
WHERE tags @> ARRAY['receipt']
```

### 2. Leverage Indexes
The knowledge_base table has indexes on:
- `user_id` (fast user filtering)
- `category` (fast type filtering)
- `tags` (GIN index for array searches)
- `embedding` (HNSW index for vector search)

### 3. Limit Results
```sql
-- Always use LIMIT for large datasets
SELECT * FROM knowledge_base
WHERE category = 'photo-analysis'
ORDER BY created_at DESC
LIMIT 20;
```

### 4. Combine Filters
```sql
-- Most efficient: user + category + vector search
SELECT * FROM search_knowledge_base(
  embedding,
  user_id,
  20,
  'photo-analysis',  -- category filter
  'file'             -- source filter
);
```

---

## Summary

Photos are now first-class citizens in the knowledge base:

✅ **Searchable** - Full-text, vector, and metadata search
✅ **Discoverable** - Tags, projects, and semantic queries
✅ **Integrated** - Works with chat, RAG, and BackgroundIndexer
✅ **Persistent** - Stored with full metadata and embeddings
✅ **Fast** - Indexed for quick retrieval

The system enables:
- "Find that receipt from Target"
- "Show me D&D character sheets"
- "What was that error message?"
- "Recipes with chicken"
- "Technical screenshots from last week"

All searchable via natural language or SQL queries!
