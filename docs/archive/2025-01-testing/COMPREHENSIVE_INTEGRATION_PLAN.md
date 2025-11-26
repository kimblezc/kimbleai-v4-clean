# KimbleAI v9.0 - 11-Service Integration Plan
## Optimized for 2 Users (Zach + Rebecca)

**Current Version:** v9.8.1
**Target Version:** v10.0.0
**Estimated Total Time:** 30-40 hours (1 week)
**Estimated Monthly Cost:** $18-28/month (vs current ~$50/month)

---

## Executive Summary

This plan integrates 11 new services into KimbleAI while MAXIMIZING FREE TIERS and minimizing costs for a 2-user system. Total cost increase: **-$22 to -$32/month** (SAVES money!).

### Cost Optimization Strategy:
1. **Use FREE tiers aggressively** - Most services have generous free tiers
2. **Pay-per-use only** - No monthly subscriptions unless required
3. **Smart defaults** - Default to free options (Gemini Flash over GPT-5)
4. **Usage caps** - Hard limits to prevent accidental cost spikes

---

## Monthly Cost Breakdown

| Service | FREE Tier | 2-User Usage | Cost |
|---------|-----------|--------------|------|
| Vercel AI SDK | ∞ (library) | N/A | $0 |
| Upstash Redis | 10K/day | 500/day | $0 |
| Gemini Flash | 1,500 RPD | 150 RPD | $0 |
| Gemini Pro | 50 RPD | 10 RPD | $0 |
| DeepSeek V3.2 | None | 50 jobs/month | $4 |
| Perplexity | None | 100/month | $0.50 |
| ElevenLabs | 10K chars/month | 8K chars/month | $0 |
| FLUX Pro | None | 20 images/month | $1 |
| Realtime API | None | 2 hrs/month | $7 |
| Computer Use | Claude API | 10 tasks/month | $2 |
| GPT-5.1 | None | 500K tokens/month | $3 |
| **TOTAL** | - | - | **~$18/month** |

**Current spend:** ~$50/month (OpenAI + Anthropic)
**New optimized spend:** ~$18-28/month
**NET SAVINGS:** $22-32/month 🎉

---

## Integration Priority & Timeline

### Week 1: Foundation + Core AI (FREE)
**Day 1-2:** Vercel AI SDK 4.0 + Upstash Redis
**Day 3-4:** Gemini 2.5 Pro + Flash (FREE 1,500 RPD)
**Day 5:** DeepSeek V3.2 + Enhanced Model Selection

### Week 2: Search + Voice + Creative
**Day 1-2:** Perplexity (toggle) + ElevenLabs TTS
**Day 3:** OpenAI Realtime API + FLUX 1.1 Pro
**Day 4:** Computer Use API (experimental)

### Week 3: UI + Testing + Documentation
**Day 1-2:** Integrations management page
**Day 3:** Testing all integrations
**Day 4-5:** Documentation + deployment

---

## Implementation Details

### 1. Vercel AI SDK 4.0 (Foundation)
**Purpose:** Unified streaming framework for all AI models
**Cost:** $0 (library, not service)
**Time:** 2-3 hours

**Dependencies:**
```json
{
  "ai": "^5.0.0",
  "@ai-sdk/openai": "latest",
  "@ai-sdk/anthropic": "latest",
  "@ai-sdk/google": "latest"
}
```

**Files to Create:**
- `lib/ai-sdk-wrapper.ts` - Unified AI client
- `lib/streaming/stream-handlers.ts` - Stream utilities

**Files to Modify:**
- `app/api/chat-stream/route.ts` - Replace custom OpenAI streaming

**Benefits:**
- Unified API for all models (OpenAI, Anthropic, Google)
- Built-in streaming, tool calling, structured output
- Easier to add new models (1 line of code)
- Better error handling & retries

**Environment Variables:** (Already have these)
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...  # NEW
```

---

### 2. Upstash Redis (Caching Layer)
**Purpose:** Cache API responses, embeddings, rate limits
**Cost:** $0 (FREE 10K commands/day, we use ~500/day)
**Time:** 2 hours

**Dependencies:**
```json
{
  "@upstash/redis": "^1.34.0"
}
```

**Files to Create:**
- `lib/cache/upstash-client.ts` - Redis client
- `lib/cache/cache-strategies.ts` - Caching logic

**Files to Modify:**
- `lib/embeddings.ts` - Cache embeddings
- `lib/web-search-service.ts` - Cache search results
- `app/api/chat-stream/route.ts` - Cache responses

**Cache Strategies:**
- Embeddings: 7 days TTL (rarely change)
- Search results: 1 hour TTL
- AI responses: 24 hours TTL (user-specific)

**Impact:** Saves ~$30/month in redundant API calls

**Setup:**
1. Create free Upstash account: https://upstash.com
2. Create Redis database (select FREE tier)
3. Copy REST URL + token to Railway env vars

**Environment Variables:**
```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

### 3. Gemini 2.5 Pro + Flash (PRIMARY MODELS)
**Purpose:** Google's multimodal AI - FREE 1,500 requests/day
**Cost:** $0/month (stays within free tier)
**Time:** 3-4 hours

**Why Gemini over GPT:**
- **FREE tier:** 1,500 requests/day vs GPT's paid-only
- **Better performance:** #1 on LMArena leaderboard
- **Larger context:** 1M tokens vs GPT's 128K
- **Multimodal:** Images + text in one request
- **Faster:** Flash model is 3x faster than GPT-4o

**Files to Create:**
- `lib/gemini-client.ts` - Gemini API wrapper

**Files to Modify:**
- `lib/model-selector.ts` - Add Gemini models as DEFAULT
- `app/api/chat-stream/route.ts` - Add Gemini streaming

**Model Definitions:**
```typescript
'gemini-2.5-flash': {
  model: 'gemini-2.5-flash',
  contextWindow: 1000000, // 1M tokens!
  costMultiplier: 0, // FREE
  description: 'Google Gemini Flash - Fast multimodal AI (FREE 1,500/day)',
  strengths: ['speed', 'multimodal', 'cost-effective'],
  useCases: ['simple chat', 'image analysis', 'quick questions']
},
'gemini-2.5-pro': {
  model: 'gemini-2.5-pro',
  contextWindow: 2000000, // 2M tokens!
  costMultiplier: 0, // FREE for 50/day
  description: 'Google Gemini Pro - Advanced reasoning (FREE 50/day)',
  strengths: ['reasoning', 'complex tasks', 'multimodal'],
  useCases: ['complex analysis', 'deep research', 'advanced reasoning']
}
```

**Smart Routing:**
- 90% of requests → Gemini Flash (FREE)
- 5% complex requests → Gemini Pro (FREE)
- 5% user-requested → GPT-5.1 or Claude (paid)

**Environment Variables:**
```env
GOOGLE_AI_API_KEY=...  # Get from https://ai.google.dev
GEMINI_DEFAULT_MODEL=gemini-2.5-flash
```

---

### 4. DeepSeek V3.2 (Bulk Processing)
**Purpose:** Process hundreds of documents/emails at once
**Cost:** ~$4/month (50 bulk jobs × 100K tokens each)
**Time:** 3-4 hours

**Why DeepSeek:**
- **98% cheaper than GPT-5** ($0.27 vs $15 per 1M tokens)
- **Competitive quality:** Matches GPT-5 on benchmarks
- **128K context:** Can process long documents
- **MIT License:** Open source, can self-host

**Files to Create:**
- `lib/deepseek-client.ts` - DeepSeek API wrapper
- `app/api/bulk-process/route.ts` - Bulk processing endpoint
- `components/BulkProcessModal.tsx` - UI for bulk uploads

**Files to Modify:**
- `lib/model-selector.ts` - Add DeepSeek for bulk tasks

**Use Cases:**
1. Process 100 emails at once → extract action items
2. Summarize 50 Google Drive documents
3. Categorize 200 Gmail attachments

**API Endpoint:**
```typescript
POST /api/bulk-process
{
  "documents": [
    { "id": "doc1", "content": "...", "type": "email" },
    // ... up to 100 docs
  ],
  "task": "summarize" | "extract" | "categorize",
  "model": "deepseek-v3.2"
}
```

**Cost Calculation:**
- Input: 100 docs × 1K tokens × 50 jobs/month = 5M tokens × $0.27 = $1.35
- Output: 100 docs × 500 tokens × 50 jobs/month = 2.5M tokens × $1.10 = $2.75
- **Total: ~$4/month**

**Environment Variables:**
```env
DEEPSEEK_API_KEY=...
DEEPSEEK_BATCH_SIZE=100
DEEPSEEK_MAX_CONCURRENT=5
```

---

### 5. Enhanced Automatic Model Selection
**Purpose:** Intelligently route requests to cheapest appropriate model
**Time:** 2-3 hours

**Files to Modify:**
- `lib/model-selector.ts` - Enhanced selection algorithm

**Selection Priority (Cost-Optimized):**
```typescript
function selectModel(context: ModelSelectionContext): Model {
  // 1. Bulk documents (100+) → DeepSeek ($0.27/1M)
  if (context.documentCount >= 100) {
    return 'deepseek-v3.2';
  }

  // 2. Images → Gemini Flash (FREE)
  if (context.hasImages) {
    return 'gemini-2.5-flash';
  }

  // 3. Complex reasoning → Gemini Pro (FREE 50/day)
  if (context.taskComplexity === 'high' && dailyGeminiProCount < 50) {
    return 'gemini-2.5-pro';
  }

  // 4. Simple chat → Gemini Flash (FREE 1,500/day)
  if (dailyGeminiFlashCount < 1500) {
    return 'gemini-2.5-flash';
  }

  // 5. User explicitly requests premium → GPT-5.1 or Claude
  if (context.userRequestedModel) {
    return context.userRequestedModel;
  }

  // 6. Fallback → GPT-4o-mini (cheapest OpenAI)
  return 'gpt-4o-mini';
}
```

**Impact:**
- Before: 90% GPT-4o ($5/1M tokens) = $45/month
- After: 90% Gemini Flash (FREE) + 10% GPT-4o = $5/month
- **Savings: $40/month**

---

### 6. Perplexity Sonar Pro (AI Search)
**Purpose:** Better search results than Google
**Cost:** $0.50/month (100 searches × $0.005 each)
**Time:** 3-4 hours

**Toggle:** OFF by default, user enables when needed

**Files to Create:**
- `lib/perplexity-client.ts`
- `components/SearchToggle.tsx`

**Files to Modify:**
- `lib/web-search-service.ts` - Add Perplexity as premium option
- `app/page.tsx` - Add search toggle UI

**UI:**
```typescript
<Switch
  checked={usePerplexity}
  onCheckedChange={setUsePerplexity}
  label="🔍 AI Search (+$0.005 per search)"
/>
```

**Fallback:** Google Custom Search (FREE 3K/month)

**Environment Variables:**
```env
PERPLEXITY_API_KEY=pplx-...
ENABLE_PERPLEXITY=false  # User toggles
```

---

### 7. ElevenLabs Turbo v2.5 (Voice Output)
**Purpose:** Read AI responses aloud
**Cost:** $0/month (FREE 10K chars/month, we use ~8K)
**Time:** 3-4 hours

**Pairs with existing voice input** (`hooks/useVoiceInput.ts`)

**Files to Create:**
- `lib/elevenlabs-client.ts`
- `hooks/useVoiceOutput.ts`
- `components/VoiceOutputButton.tsx` - Speaker icon

**Files to Modify:**
- `components/MessageItem.tsx` - Add 🔊 button to each message

**Usage Estimate:**
- 50 messages/month read aloud
- Avg 200 chars/message = 10,000 chars
- **Cost: $0** (exactly at free limit)

**If exceeded:** $5/month for 30K chars (covers 150 messages)

**Environment Variables:**
```env
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Default voice
ENABLE_VOICE_OUTPUT=true
```

---

### 8. OpenAI Realtime API (Voice Conversations)
**Purpose:** Real-time voice-to-voice chat
**Cost:** $7/month (2 hours usage × $3.60/hour)
**Time:** 4-5 hours

**DISABLED by default** - User explicitly enables

**Files to Create:**
- `lib/realtime-voice-client.ts`
- `app/api/realtime-voice/route.ts` - WebSocket endpoint
- `components/VoiceConversationModal.tsx`

**Cost Warning:**
```typescript
<button onClick={() => setRealtimeMode(true)}>
  💬 Real-time Voice Mode
  <span className="text-yellow-400">
    ⚠️ Costs $3.60/hour - proceed?
  </span>
</button>
```

**Auto-disable** after 1 hour to prevent runaway costs

**Environment Variables:**
```env
ENABLE_REALTIME_VOICE=false  # User enables
REALTIME_MAX_DURATION_MINUTES=60
```

---

### 9. FLUX 1.1 Pro (Image Generation)
**Purpose:** Generate images from text
**Cost:** $1/month (20 images × $0.055 each)
**Time:** 3-4 hours

**Pay-per-use** - Show cost before generating

**Files to Create:**
- `lib/flux-client.ts`
- `app/api/generate-image/route.ts`
- `components/ImageGenerationModal.tsx`

**Files to Modify:**
- `app/page.tsx` - Add "🎨 Generate Image" button

**Usage Limits:**
- 5 images/day (prevents accidents)
- Monthly budget: $5 (90 images max)

**UI:**
```typescript
<button onClick={() => showImageGen()}>
  🎨 Generate Image
  <span className="text-xs text-gray-500">
    (+$0.06 per image)
  </span>
</button>
```

**Environment Variables:**
```env
REPLICATE_API_TOKEN=...
IMAGE_GENERATION_ENABLED=true
MAX_IMAGES_PER_DAY=5
```

---

### 10. Anthropic Computer Use API (Browser Automation)
**Purpose:** AI controls browser (EXPERIMENTAL)
**Cost:** $2/month (10 tasks × ~10K tokens each)
**Time:** 5-6 hours

**DISABLED by default** - Security risk

**Files to Create:**
- `lib/computer-use-client.ts`
- `app/api/automation/route.ts`
- `components/AutomationPanel.tsx`

**Security:**
- Require explicit confirmation for EACH task
- Max 10 tasks/month hard limit
- Whitelist safe domains only (example.com, google.com, etc.)
- Log all actions

**Use Cases:**
- "Find all emails from last week and summarize in Google Doc"
- "Extract data from this webpage and save to spreadsheet"

**Environment Variables:**
```env
ENABLE_COMPUTER_USE=false  # Admin only
AUTOMATION_MAX_TASKS_PER_MONTH=10
AUTOMATION_WHITELIST_DOMAINS=example.com,google.com
```

---

### 11. Integrations Management Page
**Purpose:** Central UI to toggle all integrations on/off
**Time:** 4-6 hours

**Files to Create:**
- `app/integrations/page.tsx` - Main integrations page
- `components/integrations/IntegrationCard.tsx`
- `components/integrations/ToggleSwitch.tsx`

**Page Sections:**
1. **AI Models** - Gemini, DeepSeek, GPT-5.1
2. **Search** - Perplexity toggle
3. **Voice** - ElevenLabs, Realtime API
4. **Creative** - FLUX, Computer Use
5. **Infrastructure** - Redis, AI SDK (always on)

**Features:**
- Toggle on/off for each service
- Usage stats (X/Y requests used)
- Cost tracking (spent $X this month)
- Test integration button
- Link to documentation

**Database Schema:**
```sql
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, integration_name)
);

CREATE TABLE integration_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  monthly_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Testing Strategy

### Unit Tests
Each integration needs:
1. Connection test (API key valid?)
2. Basic functionality test (simple request works?)
3. Error handling test (graceful failure?)
4. Rate limiting test (respects limits?)
5. Caching test (Redis caching works?)

### Integration Tests
Test workflows:
1. User sends message → Gemini Flash responds (FREE)
2. User uploads 100 docs → DeepSeek processes (cheap)
3. User enables Perplexity → AI search works
4. User clicks speaker icon → ElevenLabs reads response
5. User generates image → FLUX creates image

### Load Tests
Simulate 2-user load:
- 200 messages/day
- 10 bulk processing jobs/week
- 5 searches/day
- 2 images/day

Verify costs stay under $30/month.

---

## Deployment Checklist

### Pre-Deployment
- ✅ All dependencies installed
- ✅ Environment variables set in Railway
- ✅ Database migrations applied
- ✅ Tests passing
- ✅ Build succeeds (`npm run build`)

### Railway Environment Variables
```env
# Existing
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# NEW - Phase 1
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# NEW - Phase 2
GOOGLE_AI_API_KEY=...
DEEPSEEK_API_KEY=...

# NEW - Phase 3
PERPLEXITY_API_KEY=pplx-...
ELEVENLABS_API_KEY=...

# NEW - Phase 4
REPLICATE_API_TOKEN=...
ENABLE_COMPUTER_USE=false
ENABLE_REALTIME_VOICE=false
```

### Post-Deployment
- ✅ Health check passes (`/api/health`)
- ✅ All integrations accessible
- ✅ Toggles work on `/integrations`
- ✅ Costs tracking correctly

---

## Success Metrics

### Technical
- ✅ 11 services integrated
- ✅ All services toggle on/off
- ✅ 0 TypeScript errors
- ✅ 100% test coverage on critical paths
- ✅ Railway deployment successful

### Cost
- ✅ Monthly cost ≤ $30/month
- ✅ 90%+ requests use FREE tiers
- ✅ Hard limits prevent runaway costs

### UX
- ✅ All features accessible from `/integrations`
- ✅ Clear cost indicators ($0.05 per X)
- ✅ Usage stats visible
- ✅ Documentation complete

---

## Version Progression

- Start: **v9.8.1**
- After Phase 1 (AI SDK + Redis): **v9.9.0**
- After Phase 2 (Gemini + DeepSeek): **v9.10.0**
- After Phase 3 (Search + Voice): **v9.11.0**
- After Phase 4 (Creative + Automation): **v9.12.0**
- After Phase 5 (UI + Testing): **v10.0.0** 🎉

---

## Final Commit Message

```
v10.0.0 - 11-Service Integration Complete 🎉

Integrated 11 new services optimized for 2-user system:

Foundation (100% FREE):
✅ Vercel AI SDK 4.0 - Unified streaming
✅ Upstash Redis - Caching layer (10K/day FREE)

AI Models (Mostly FREE):
✅ Gemini 2.5 Pro + Flash - FREE 1,500 RPD (PRIMARY)
✅ DeepSeek V3.2 - Bulk processing ($4/month)
✅ Enhanced model selection - Smart routing to FREE tiers

Search & Voice (Mostly FREE):
✅ Perplexity Sonar Pro - AI search ($0.50/month)
✅ ElevenLabs Turbo v2.5 - TTS (FREE 10K chars/month)
✅ OpenAI Realtime API - Voice conversations ($7/month)

Creative & Advanced:
✅ FLUX 1.1 Pro - Image generation ($1/month)
✅ Computer Use API - Browser automation ($2/month)

UI & Management:
✅ /integrations page - Toggle all services
✅ Usage tracking - Monitor consumption
✅ Cost indicators - Transparent pricing

Cost Impact:
- Before: ~$50/month
- After: ~$18-28/month
- **Savings: $22-32/month** 💰

All integrations Railway-compatible and production-ready.
FREE tiers cover 90%+ of usage.

🚀 Deployed to Railway: https://kimbleai.com
📚 Docs: /COMPREHENSIVE_INTEGRATION_PLAN.md
```

---

**This plan is optimized for a 2-user system with maximum FREE tier usage. Total implementation time: 30-40 hours (1 week). Cost savings: $22-32/month.**
