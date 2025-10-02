# Audio Auto-Tagging Quick Start Guide

## Overview

The audio auto-tagging system automatically analyzes transcription content to extract tags, action items, topics, sentiment, and more - with zero additional API costs.

## Quick Examples

### Access Auto-Tags from Database

```typescript
// Get transcription with auto-tags
const { data } = await supabase
  .from('audio_transcriptions')
  .select('*')
  .eq('id', transcriptionId)
  .single();

// Access auto-tagging results
const tags = data.metadata.auto_tags;
const actionItems = data.metadata.action_items;
const category = data.project_id; // Auto-detected
const importance = data.metadata.importance_score;
const sentiment = data.metadata.sentiment;
```

### Search by Tags

```typescript
// Find all urgent technical meetings
const { data } = await supabase
  .from('audio_transcriptions')
  .select('*')
  .contains('metadata->auto_tags', ['urgent', 'technical']);

// Find high-priority transcriptions
const { data } = await supabase
  .from('audio_transcriptions')
  .select('*')
  .gte('metadata->importance_score', 0.8);
```

### Get Action Items

```typescript
// Extract all action items from a project
const { data } = await supabase
  .from('audio_transcriptions')
  .select('filename, created_at, metadata->action_items')
  .eq('project_id', 'development')
  .not('metadata->action_items', 'is', null);

// Flatten into todo list
const allActionItems = data.flatMap(t => ({
  task: t.action_items,
  source: t.filename,
  date: t.created_at
}));
```

### Semantic Search

```typescript
// Search across all transcriptions semantically
const embedding = await generateEmbedding("authentication bug fix");

const { data } = await supabase.rpc('search_knowledge_base', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 10,
  filter_category: 'audio'
});
```

## Auto-Detected Tags

### Content Types
- `meeting` - Meetings and discussions
- `interview` - Job interviews or Q&A
- `lecture` - Educational content
- `podcast` - Podcast episodes
- `voice-note` - Personal voice notes

### Project Categories
- `development` - Code, APIs, software projects
- `gaming` - D&D campaigns, game discussions
- `business` - Strategy, revenue, clients
- `automotive` - Vehicle maintenance, repairs
- `personal` - Groceries, appointments, family
- `general` - Uncategorized

### Feature Tags
- `action-items` - Contains TODO items
- `decisions` - Important decisions made
- `urgent` - Time-sensitive content
- `technical` - Technical discussions
- `code` - Code snippets mentioned
- `api` - API discussions
- `troubleshooting` - Problems/errors

## Metadata Schema

```typescript
interface TranscriptionMetadata {
  // AssemblyAI data
  speaker_labels?: any[];
  utterances?: any[];
  words?: any[];

  // Auto-tagging results
  auto_tags: string[];           // 8-15 tags
  action_items: string[];        // Extracted TODOs
  key_topics: string[];          // Main topics
  sentiment: 'positive' | 'neutral' | 'negative';
  importance_score: number;      // 0-1

  speaker_insights?: {
    speakerCount: number;
    dominantSpeaker: string;
    conversationType: 'monologue' | 'dialogue' | 'small-group' | 'large-group';
  };

  extracted_entities: {
    people: string[];
    organizations: string[];
    dates: string[];
    technologies: string[];
  };

  auto_tagged_at: string;        // ISO timestamp
}
```

## Integration Points

### 1. BackgroundIndexer
Transcriptions are automatically indexed for RAG:
```typescript
// Automatic - no code needed
// Every transcription gets:
// - Vector embeddings
// - Memory chunks
// - Message references
// - Conversation summaries
```

### 2. Knowledge Base
Transcriptions stored for semantic search:
```typescript
// Automatic storage in knowledge_base table
// Searchable via vector similarity
// RAG-ready for chat context
```

### 3. Chat Integration
Transcriptions available as context:
```typescript
// Chat can retrieve relevant transcriptions
// Based on semantic similarity
// Provides context from past recordings
```

## Performance

- **Auto-tagging**: <500ms per transcript
- **Embedding**: ~200ms (OpenAI API)
- **Total overhead**: <1 second
- **Cost**: $0 (NLP-based, no API calls for analysis)
- **Scalability**: Linear with transcript length

## Common Queries

### Get Today's Action Items
```sql
SELECT
  filename,
  metadata->>'action_items' as tasks
FROM audio_transcriptions
WHERE
  created_at::date = CURRENT_DATE
  AND metadata->>'action_items' IS NOT NULL;
```

### Find Technical Discussions
```sql
SELECT * FROM audio_transcriptions
WHERE
  metadata->'auto_tags' @> '["technical", "development"]'::jsonb
ORDER BY metadata->>'importance_score' DESC;
```

### Get High-Priority Items
```sql
SELECT
  filename,
  metadata->>'importance_score' as priority,
  metadata->>'auto_tags' as tags
FROM audio_transcriptions
WHERE
  (metadata->>'importance_score')::float >= 0.8
ORDER BY created_at DESC;
```

## Troubleshooting

### No Auto-Tags Generated
- Check that transcription completed successfully
- Verify `metadata.auto_tags` exists in database record
- Review logs for `[AutoTagging]` messages

### Incorrect Project Category
- Categories based on keyword density
- Requires 3+ matching keywords
- Default is `general` if uncertain
- Can manually override in database

### Missing Action Items
- Requires specific phrases: "need to", "must", "todo", etc.
- Check `metadata.action_items` array
- May be empty if no action language detected

## Support

For issues or questions:
- See full documentation: `AUDIO_AUTO_TAGGING_REPORT.md`
- Check test examples: `tests/audio-auto-tagging-test.ts`
- Review source code: `lib/audio-auto-tagger.ts`
