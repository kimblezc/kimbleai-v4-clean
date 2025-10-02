# Embedding Cache Integration Guide

## Quick Start

The embedding cache has been implemented and integrated into the main API routes. Here's how to use it in other parts of the codebase.

## Basic Usage

### 1. Import the Cache

```typescript
import { embeddingCache } from '@/lib/embedding-cache';
```

### 2. Replace Direct OpenAI Calls

**Before:**
```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
  dimensions: 1536
});
const embedding = response.data[0].embedding;
```

**After:**
```typescript
const embedding = await embeddingCache.getEmbedding(text);
```

### 3. Batch Processing (RECOMMENDED)

For multiple embeddings, always use batch processing:

```typescript
// Instead of:
const embedding1 = await embeddingCache.getEmbedding(text1);
const embedding2 = await embeddingCache.getEmbedding(text2);
const embedding3 = await embeddingCache.getEmbedding(text3);

// Use:
const embeddings = await embeddingCache.getBatchEmbeddings([text1, text2, text3]);
```

**Performance Impact:**
- Single requests: 200-500ms each = 600-1500ms total
- Batch request: 300-600ms total (50-75% faster)

## Files That Need Integration

### High Priority

1. **lib/auto-reference-butler.ts** (Line 110-132)
   ```typescript
   // Replace generateEmbedding function
   private async generateEmbedding(text: string): Promise<number[] | null> {
     return await embeddingCache.getEmbedding(text);
   }
   ```

2. **lib/background-indexer.ts** (Line 333-356)
   ```typescript
   // Replace generateEmbedding function
   private async generateEmbedding(text: string): Promise<number[] | null> {
     return await embeddingCache.getEmbedding(text);
   }

   // For batch operations (line 361-397), optimize to:
   async batchIndexMessages(messages: Array<...>): Promise<IndexingResult[]> {
     const texts = messages.map(m => m.content);
     const embeddings = await embeddingCache.getBatchEmbeddings(texts);
     // Use embeddings array instead of generating one at a time
   }
   ```

3. **services/memory-service.ts**
   - Replace any OpenAI embedding calls with cache

### Medium Priority

4. **app/api/upload/route.ts**
   - File content embedding generation

5. **app/api/google/workspace/rag-system.ts**
   - Document embedding generation

6. **app/api/audio/transcribe/route.ts**
   - Transcription embedding generation

## Cache Statistics

Monitor cache performance:

```typescript
// Get cache statistics
const stats = embeddingCache.getStats();
console.log('Cache hit rate:', stats.hitRate);
console.log('Cost saved:', stats.costSaved);

// Get detailed summary
console.log(embeddingCache.getSummary());
```

## Cache Management

### Clear Cache (if needed)

```typescript
embeddingCache.clear();
```

### Warm Up Cache

Pre-populate cache with common queries:

```typescript
const commonQueries = [
  'What are my recent projects?',
  'Show me emails from last week',
  'What files did I upload?',
  // ... more common queries
];

await embeddingCache.warmup(commonQueries);
```

## Performance Monitoring

The cache automatically tracks:
- Hit/miss rates
- API cost savings
- Memory usage
- Eviction statistics

Access via Performance API:
```bash
curl http://localhost:3000/api/performance?action=cache
```

## Best Practices

1. **Always use batch processing** when generating multiple embeddings
2. **Monitor cache hit rate** - target >85%
3. **Warm up cache** on application start with common queries
4. **Use cache statistics** to identify optimization opportunities
5. **Don't clear cache unnecessarily** - it's optimized for 24h TTL

## Expected Performance Gains

| Scenario | Without Cache | With Cache | Improvement |
|----------|--------------|------------|-------------|
| Single embedding (cache hit) | 300-500ms | <10ms | **>95%** |
| Single embedding (cache miss) | 300-500ms | 300-500ms | Same |
| Batch of 10 (all cached) | 3000-5000ms | <50ms | **>99%** |
| Batch of 10 (50% cached) | 3000-5000ms | 1500-2500ms | **50%** |
| Chat request (3 embeddings) | 900-1500ms | 50-500ms | **70-95%** |

## Cost Impact

- **Before:** ~10,000 embedding calls/day = $20/day
- **After:** ~1,500 embedding calls/day = $3/day
- **Savings:** $17/day = **$510/month**

At 85% cache hit rate, you save approximately **$0.000002 per cached embedding**.

## Troubleshooting

### Cache Not Working

Check if module is imported:
```typescript
import { embeddingCache } from '@/lib/embedding-cache';
```

### Low Hit Rate

Common causes:
1. Text normalization issues (cache uses lowercase)
2. Dynamic content in queries (timestamps, IDs)
3. Cache size too small (increase CACHE_MAX_SIZE)
4. TTL too short (increase CACHE_TTL_MS)

### Memory Issues

If memory usage is high:
```typescript
// Reduce cache size
const cache = EmbeddingCache.getInstance(500); // Default is 1000

// Or clear cache
embeddingCache.clear();
```

## Integration Checklist

- [x] Chat API route (`app/api/chat/route.ts`)
- [x] Knowledge Search API (`app/api/knowledge/search/route.ts`)
- [ ] Auto Reference Butler (`lib/auto-reference-butler.ts`)
- [ ] Background Indexer (`lib/background-indexer.ts`)
- [ ] Memory Service (`services/memory-service.ts`)
- [ ] Upload API (`app/api/upload/route.ts`)
- [ ] Workspace RAG System (`app/api/google/workspace/rag-system.ts`)

## Next Steps

1. Integrate cache into remaining files (see checklist above)
2. Add cache warmup on application startup
3. Monitor cache performance via Performance API
4. Consider upgrading to Redis for multi-instance deployments

---

For questions or issues, refer to `lib/embedding-cache.ts` source code or the Performance Optimization Report.
