# KimbleAI Vector/RAG Architecture for Maximum Continuity

## Goal
Create seamless conversation continuity where the AI remembers everything across:
- All past conversations
- All transcribed audio (including 2GB files)
- All photos analyzed
- All projects and their context

## Current State
❌ **No vector embeddings** - conversations stored but not semantically searchable
❌ **No RAG** - GPT-5 doesn't have access to past context automatically
❌ **No semantic search** - can't find "what did we discuss about D&D" across all time
✅ **Storage exists** - Supabase + Google Drive ready

---

## Proposed Architecture

### **1. Vector Database: Supabase pgvector**

**Why pgvector?**
- Already using Supabase
- Free tier supports vectors
- No additional service needed
- SQL + vector search in one query

**Schema**:
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'conversation', 'transcription', 'photo', 'project'
  source_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Metadata indexes for filtering
CREATE INDEX idx_embeddings_user ON embeddings(user_id);
CREATE INDEX idx_embeddings_type ON embeddings(source_type);
CREATE INDEX idx_embeddings_source ON embeddings(source_id);
```

---

### **2. Embedding Pipeline**

**Source → Chunk → Embed → Store**

```typescript
// lib/embeddings/pipeline.ts

import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI();
const supabase = createClient(...);

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // $0.02 per 1M tokens (cheaper than ada-002)
    input: text,
  });

  return response.data[0].embedding;
}

export async function embedConversation(conversationId: string) {
  // 1. Get conversation from DB
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, messages(*)')
    .eq('id', conversationId)
    .single();

  // 2. Chunk messages (group by semantic context)
  const chunks = chunkConversation(conversation);

  // 3. Generate embeddings for each chunk
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);

    await supabase.from('embeddings').insert({
      user_id: conversation.user_id,
      source_type: 'conversation',
      source_id: conversationId,
      content: chunk.text,
      embedding: embedding,
      metadata: {
        project: conversation.project,
        title: conversation.title,
        created_at: conversation.created_at,
        message_ids: chunk.messageIds
      }
    });
  }
}

export async function embedTranscription(transcriptionId: string) {
  const { data: transcription } = await supabase
    .from('audio_transcriptions')
    .select('*')
    .eq('id', transcriptionId)
    .single();

  // Chunk transcription by speaker turns or time windows
  const chunks = chunkTranscription(transcription);

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);

    await supabase.from('embeddings').insert({
      user_id: transcription.user_id,
      source_type: 'transcription',
      source_id: transcriptionId,
      content: chunk.text,
      embedding: embedding,
      metadata: {
        filename: transcription.filename,
        duration: transcription.duration,
        timestamp_start: chunk.timestampStart,
        timestamp_end: chunk.timestampEnd,
        speakers: chunk.speakers
      }
    });
  }
}
```

---

### **3. Semantic Search**

**Query → Embed → Search → Rank → Return**

```typescript
// lib/embeddings/search.ts

export async function semanticSearch(
  query: string,
  userId: string,
  options: {
    sourceTypes?: string[];
    project?: string;
    limit?: number;
    similarityThreshold?: number;
  } = {}
) {
  // 1. Embed the query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Vector search with filters
  const { data: results } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: options.similarityThreshold || 0.7,
    match_count: options.limit || 10,
    filter_user_id: userId,
    filter_source_types: options.sourceTypes,
    filter_project: options.project
  });

  return results;
}

// SQL function for vector search
// CREATE FUNCTION match_embeddings(
//   query_embedding vector(1536),
//   match_threshold float,
//   match_count int,
//   filter_user_id text,
//   filter_source_types text[],
//   filter_project text
// ) RETURNS TABLE (
//   id uuid,
//   content text,
//   metadata jsonb,
//   similarity float
// ) AS $$
// BEGIN
//   RETURN QUERY
//   SELECT
//     e.id,
//     e.content,
//     e.metadata,
//     1 - (e.embedding <=> query_embedding) as similarity
//   FROM embeddings e
//   WHERE
//     e.user_id = filter_user_id
//     AND (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
//     AND (filter_project IS NULL OR e.metadata->>'project' = filter_project)
//     AND 1 - (e.embedding <=> query_embedding) > match_threshold
//   ORDER BY e.embedding <=> query_embedding
//   LIMIT match_count;
// END;
// $$ LANGUAGE plpgsql;
```

---

### **4. RAG-Enhanced Chat**

**Inject relevant context before GPT-5 call**

```typescript
// app/api/chat/route.ts (enhanced)

export async function POST(request: Request) {
  const { message, userId, project } = await request.json();

  // 1. Semantic search for relevant context
  const relevantContext = await semanticSearch(message, userId, {
    project,
    limit: 5,
    similarityThreshold: 0.75
  });

  // 2. Format context for GPT-5
  const contextPrompt = relevantContext.map(ctx => {
    if (ctx.metadata.source_type === 'transcription') {
      return `[From audio: ${ctx.metadata.filename}]
${ctx.content}`;
    } else {
      return `[From conversation: ${ctx.metadata.title}]
${ctx.content}`;
    }
  }).join('\n\n');

  // 3. Enhanced system prompt with context
  const systemPrompt = `You are KimbleAI, an AI assistant with access to the user's history.

RELEVANT CONTEXT FROM PAST CONVERSATIONS/TRANSCRIPTIONS:
${contextPrompt}

Use this context to provide informed, continuous responses.`;

  // 4. Call GPT-5 with RAG context
  const completion = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ]
  });

  return completion;
}
```

---

### **5. Automatic Embedding Triggers**

**Embed everything as it's created**

```typescript
// Trigger 1: After conversation saved
export async function onConversationSaved(conversationId: string) {
  await embedConversation(conversationId);
}

// Trigger 2: After transcription completed
export async function onTranscriptionCompleted(transcriptionId: string) {
  await embedTranscription(transcriptionId);
}

// Trigger 3: After photo analyzed
export async function onPhotoAnalyzed(photoId: string, analysis: string) {
  const embedding = await generateEmbedding(analysis);
  await supabase.from('embeddings').insert({
    user_id: userId,
    source_type: 'photo',
    source_id: photoId,
    content: analysis,
    embedding,
    metadata: { ... }
  });
}

// Trigger 4: Batch embed existing data
export async function backfillEmbeddings() {
  // Get all conversations without embeddings
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .not('id', 'in', supabase.from('embeddings').select('source_id').eq('source_type', 'conversation'));

  for (const conv of conversations) {
    await embedConversation(conv.id);
  }
}
```

---

## Using Parallel Agents to Build This

### **Agent A: Vector Pipeline Builder**
```typescript
// Builds: Embedding pipeline, chunking logic, batch processing
const vectorPipelineAgent = new ClaudeAgent({
  name: 'vector-pipeline-builder',
  systemPrompt: 'Build the vector embedding pipeline for KimbleAI',
  tools: [fileWrite, fileRead, npmInstall, runTests]
});

await vectorPipelineAgent.run({
  tasks: [
    'Create lib/embeddings/pipeline.ts',
    'Implement chunking strategies',
    'Add batch processing',
    'Write tests'
  ]
});
```

### **Agent B: Search Builder**
```typescript
// Builds: Semantic search, SQL functions, API routes
const searchAgent = new ClaudeAgent({
  name: 'search-builder',
  systemPrompt: 'Build semantic search functionality',
  tools: [fileWrite, sqlExecute, apiTest]
});

await searchAgent.run({
  tasks: [
    'Create SQL match_embeddings function',
    'Build search.ts module',
    'Create API endpoint',
    'Test search quality'
  ]
});
```

### **Agent C: RAG Integration**
```typescript
// Builds: Chat enhancement, context injection, prompt engineering
const ragAgent = new ClaudeAgent({
  name: 'rag-integrator',
  systemPrompt: 'Integrate RAG into existing chat system',
  tools: [fileEdit, apiTest, promptTest]
});

await ragAgent.run({
  tasks: [
    'Enhance app/api/chat/route.ts',
    'Test context relevance',
    'Optimize prompt templates',
    'A/B test with/without RAG'
  ]
});
```

### **Agent D: Security Hardening**
```typescript
// Runs in parallel while others build
const securityAgent = new ClaudeAgent({
  name: 'security-auditor',
  systemPrompt: 'Audit and harden KimbleAI security',
  tools: [securityScan, codeReview, dependencyAudit]
});

await securityAgent.run({
  tasks: [
    'Scan for SQL injection risks',
    'Review API authentication',
    'Check data access controls',
    'Test rate limiting'
  ]
});
```

---

## Implementation Timeline

### **Week 1: Foundation**
- [ ] Enable pgvector in Supabase
- [ ] Create embeddings table and indexes
- [ ] Build embedding pipeline (Agent A)
- [ ] Embed existing conversations (backfill)

### **Week 2: Search**
- [ ] Implement semantic search (Agent B)
- [ ] Create search API endpoint
- [ ] Test search quality
- [ ] Optimize for speed

### **Week 3: RAG Integration**
- [ ] Enhance chat with RAG (Agent C)
- [ ] Test conversation continuity
- [ ] Fine-tune context selection
- [ ] Measure improvement vs baseline

### **Week 4: Scale & Security**
- [ ] Auto-embed new content (triggers)
- [ ] Security audit (Agent D)
- [ ] Performance optimization
- [ ] Documentation

---

## Cost Estimate

### **Embedding Costs (text-embedding-3-small)**
- **Price**: $0.02 per 1M tokens
- **1000 conversations** (~500K tokens): $0.01
- **100 transcriptions** (~5M tokens): $0.10
- **Monthly ongoing**: ~$0.50-2.00

### **Storage (Supabase Free Tier)**
- **Database**: 500MB (vectors ~1KB each = 500K vectors)
- **Estimated vectors**: 10K conversations + transcriptions = well under limit

### **Query Costs**
- Free (just database reads)

**Total: ~$5-10/month for complete RAG system**

---

## Success Metrics

1. **Continuity Score**: User asks "what did we discuss before?" - finds it 95%+ of the time
2. **Response Quality**: A/B test shows RAG responses rated 40%+ better
3. **Search Speed**: <200ms for semantic search
4. **Coverage**: 100% of conversations + transcriptions embedded within 24hrs

---

## Next Steps

1. **Start with Agent A**: Build vector pipeline
2. **Run Agents B+C in parallel**: Search + RAG integration
3. **Agent D background**: Security audit while building
4. **Continuous iteration**: Each agent tests and improves its component

This gives you maximum continuity while I work on multiple features simultaneously.
