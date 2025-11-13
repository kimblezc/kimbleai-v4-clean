# Response Time Analyzer Agent

**Agent Type**: Performance & Memory Optimization Specialist
**Focus**: AI response times, context retention, memory management
**Expertise**: Prompt engineering, token optimization, RAG systems

---

## Mission

Analyze and optimize KimbleAI's response times and context retention. User reports:
1. Response times degraded (need to get back to fast responses)
2. AI forgets context even within same chat
3. User must manually tell AI to remember things

This suggests we "went too hard" on optimization and broke memory/context.

---

## Context

**User Concerns**:
- "Response times - we went too hard" (over-optimized, broke things)
- "It forgets what I said even in the same chat"
- "If I don't tell it to automatically remember"

**System Info**:
- Version: 8.14.5 (latest)
- Platform: Railway (was Vercel)
- Chat API: `/app/api/chat/route.ts` or `/app/api/chat-stream/route.ts`
- Database: Supabase (conversations, messages)
- AI Models: Claude Sonnet 4.5, GPT-4o, etc.

**Potential Issues**:
1. Context window too small
2. Message history not being sent
3. RAG system not working
4. Token limits too aggressive
5. Caching disabled
6. Conversation not loading properly

---

## Analysis Checklist

### 1. Response Time Metrics

- [ ] Measure baseline response time (simple query)
- [ ] Measure with context (follow-up query)
- [ ] Compare to previous version (if logs available)
- [ ] Check Railway cold start times
- [ ] Test different model configurations

**Target Metrics**:
- Simple query: < 2 seconds
- With context: < 3 seconds
- Streaming should start: < 1 second

### 2. Context Retention

- [ ] Check if messages are being stored in DB
- [ ] Verify conversation history is sent to AI
- [ ] Test multi-turn conversations
- [ ] Check token limits for history
- [ ] Verify RAG system is active

### 3. Memory Systems

- [ ] AutoReferenceButler status
- [ ] RAG Search System status
- [ ] Embedding Cache status
- [ ] Knowledge Graph status
- [ ] Message retrieval from DB

---

## Investigation Steps

### Step 1: Check Chat API Configuration

```bash
# Find the active chat API
ls -la app/api/chat*

# Read the implementation
cat app/api/chat/route.ts
cat app/api/chat-stream/route.ts
```

Look for:
- How many messages are sent to AI?
- Is conversation history included?
- What's the token limit?
- Is RAG being used?

### Step 2: Test Message Storage

Run in Supabase:
```sql
-- Check recent messages for a conversation
SELECT
    id,
    conversation_id,
    role,
    LEFT(content, 100) as content_preview,
    created_at
FROM messages
WHERE conversation_id IN (
    SELECT id FROM conversations
    WHERE user_id = 'zach'
    ORDER BY created_at DESC
    LIMIT 1
)
ORDER BY created_at DESC
LIMIT 20;
```

### Step 3: Measure Response Times

Create test endpoint `/api/performance-test`:
```typescript
export async function GET() {
  const tests = [];

  // Test 1: Simple query (no context)
  const start1 = Date.now();
  // Call chat API with single message
  tests.push({ test: 'simple', time: Date.now() - start1 });

  // Test 2: With context (10 messages)
  const start2 = Date.now();
  // Call chat API with conversation history
  tests.push({ test: 'with_context', time: Date.now() - start2 });

  // Test 3: Cold start
  // Restart and test

  return NextResponse.json({ tests });
}
```

### Step 4: Check RAG System

```bash
# Check if RAG files exist
ls -la lib/*rag* lib/*reference* lib/*butler*

# Check if they're being used
grep -r "AutoReferenceButler\|RAG" app/api/chat/
```

---

## Common Performance Issues

### Issue 1: Conversation History Not Sent

**Symptom**: AI forgets previous messages
**Diagnosis**: Chat API not including message history
**Fix**:
```typescript
// In chat API route
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });

// Send ALL messages to AI (or last 20 for token limits)
const conversationHistory = messages.slice(-20).map(m => ({
  role: m.role,
  content: m.content
}));
```

### Issue 2: Token Limit Too Aggressive

**Symptom**: Only sends 5 messages, AI has no context
**Diagnosis**: Token limit set too low to save costs
**Fix**:
```typescript
// Increase context window
const MAX_CONTEXT_MESSAGES = 20; // Was 5, now 20
const MAX_TOKENS = 4000; // Was 1000, now 4000
```

### Issue 3: RAG Not Running

**Symptom**: AI doesn't reference previous conversations
**Diagnosis**: AutoReferenceButler disabled or broken
**Fix**: Re-enable RAG system in chat API

### Issue 4: Model Configuration

**Symptom**: Slow responses, poor memory
**Diagnosis**: Using wrong model or bad parameters
**Fix**:
```typescript
// Optimal for speed + quality
model: 'claude-sonnet-4-5', // Fast and good
temperature: 0.7, // Not too creative
max_tokens: 4000, // Enough for detailed responses
```

### Issue 5: No Streaming

**Symptom**: User waits for complete response
**Diagnosis**: Using `/api/chat` instead of `/api/chat-stream`
**Fix**: Ensure frontend uses streaming endpoint

---

## Optimization Strategy

### Balance Triangle

```
        SPEED
       /     \
      /       \
   COST ---- QUALITY
```

Current problem: Optimized too much for COST, sacrificed SPEED and QUALITY

**Recommended Balance**:
- Speed: 70% (streaming, caching, fast models)
- Quality: 25% (good models, enough context)
- Cost: 5% (accept some cost for UX)

### Specific Changes

1. **Context Window**:
   - Before: 5 messages (too small)
   - After: 20 messages (good context)

2. **Token Limits**:
   - Before: 1000 tokens (limiting)
   - After: 4000 tokens (reasonable)

3. **Model Selection**:
   - Simple queries: GPT-4o-mini (fast, cheap)
   - Complex queries: Claude Sonnet 4.5 (quality)
   - Don't use: Opus (too slow)

4. **Caching**:
   - Enable prompt caching for repeated context
   - Cache conversation history
   - Cache RAG results

5. **RAG System**:
   - Keep AutoReferenceButler active
   - Limit to 5 most relevant references
   - Use embedding cache (80-90% hit rate)

---

## Testing Protocol

### Test 1: Context Retention (Multi-Turn)

```
User: "My name is Zach"
AI: [response]
User: "What's my name?"
AI: [should say "Zach"] ✅
```

### Test 2: Response Speed

```
User: "What is D&D?"
AI: [should stream first token < 1s] ✅
```

### Test 3: Complex Context

```
User: "I'm working on project X with features A, B, C"
AI: [response]
User: "What features did I mention?"
AI: [should list A, B, C] ✅
```

### Test 4: Long Conversation

```
- Send 15 messages back and forth
- Ask about message #3
- AI should remember ✅
```

---

## Code Analysis Points

### 1. Chat API Route

File: `app/api/chat/route.ts` or `app/api/chat-stream/route.ts`

Check:
```typescript
// How many messages?
const messages = await getConversationHistory(conversationId);
console.log(`Messages in context: ${messages.length}`); // Should be 15-20

// What's being sent to AI?
const aiMessages = messages.map(m => ({ role: m.role, content: m.content }));

// Token counting
const tokenCount = countTokens(aiMessages); // Should be < 8000

// RAG integration
const references = await getRagReferences(query); // Should have results
```

### 2. Frontend Message Hook

File: `hooks/useMessages.ts`

Check:
```typescript
// Are messages being sent to API?
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    conversationId,
    messages: allMessages, // Should include history
  })
});
```

### 3. Database Queries

Check if queries are optimized:
```sql
-- Should have index on conversation_id
CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id, created_at);
```

---

## Performance Benchmarks

### Current State (Suspected)
- Simple query: ~5s (too slow)
- With context: ~10s (way too slow)
- Streaming: Not working?
- Context: 5 messages (too little)

### Target State
- Simple query: <2s ✅
- With context: <3s ✅
- Streaming: First token <1s ✅
- Context: 20 messages ✅

---

## Deliverables

1. **Performance Report**:
   - Response time measurements
   - Context retention test results
   - Comparison to baselines
   - Identified bottlenecks

2. **Optimized Code**:
   - Updated chat API with better context
   - Streaming implementation
   - RAG integration fixes
   - Token limit adjustments

3. **Configuration**:
   - Recommended model settings
   - Context window size
   - Caching strategy
   - Cost estimates

4. **Documentation**:
   - `PERFORMANCE_ANALYSIS.md` - Detailed findings
   - `OPTIMIZATION_GUIDE.md` - How to tune
   - Before/after metrics

---

## Agent Activation

When activated, this agent will:
1. ✅ Analyze chat API implementation
2. ✅ Measure current response times
3. ✅ Test context retention
4. ✅ Check RAG system status
5. ✅ Identify bottlenecks
6. ✅ Implement optimizations
7. ✅ Test improvements
8. ✅ Generate performance report
9. ✅ Deploy optimized version
10. ✅ Verify user experience improved

**Estimated Time**: 20-30 minutes for complete analysis and optimization

---

## Success Metrics

- [ ] Response time < 2s for simple queries
- [ ] AI remembers context from 20 messages ago
- [ ] Streaming starts < 1s
- [ ] No user complaints about forgetting
- [ ] Cost increase < 20% (acceptable for UX)
- [ ] User satisfaction improved

---

## Notes

- **Don't sacrifice UX for cost** - User experience is paramount
- **Streaming is critical** - Users need instant feedback
- **Context is king** - AI must remember conversation
- **Test with real usage** - Don't optimize for benchmarks
- **Monitor costs** - But don't over-optimize
