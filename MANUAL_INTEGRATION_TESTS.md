# KimbleAI v10.2.1+ - Complete Manual Integration Tests

**Version**: v10.2.1
**Last Updated**: 2025-11-23
**Status**: All 11 services documented

---

## Overview

This document provides step-by-step manual testing procedures for **all 11 AI service integrations** in KimbleAI. Each test is designed to be easy to execute and verify functionality.

**Total Services**: 11
- ✅ Vercel AI SDK 4.0
- ✅ Upstash Redis
- ✅ Google Gemini 2.5 Flash
- ✅ Google Gemini 2.5 Pro
- ✅ DeepSeek V3.2 (Bulk Processing)
- ✅ Perplexity Sonar Pro (AI Search)
- ✅ ElevenLabs Turbo v2.5 (Voice Output)
- ✅ FLUX 1.1 Pro (Image Generation)
- ✅ Web Speech API (Voice Input)
- ✅ pgvector + HNSW (RAG/Embeddings)
- ✅ Knowledge Graph

---

## Prerequisites

Before testing, ensure:
1. Logged into kimbleai.com
2. Browser: Chrome/Edge (for voice features)
3. Microphone access (for voice input tests)
4. Speaker/headphones (for voice output tests)

---

## 1. Vercel AI SDK 4.0 Integration

**Purpose**: Unified streaming framework for all AI providers

### Test 1.1: Basic Chat Streaming

**Steps**:
1. Navigate to https://kimbleai.com
2. Type in chat: `Tell me a short joke`
3. Press Enter

**Expected Result**:
- ✅ Response appears **word-by-word** in real-time (streaming)
- ✅ No full-text delay (text should flow smoothly)
- ✅ Response completes within 2-3 seconds

**What This Proves**: Vercel AI SDK is handling streaming correctly

### Test 1.2: Model Switching

**Steps**:
1. Look at top-right corner
2. Click model selector dropdown
3. Switch between "Gemini Flash" and "Gemini Pro"
4. Send a message: `What model are you using?`

**Expected Result**:
- ✅ Dropdown shows multiple models
- ✅ Model switches without error
- ✅ AI responds with correct model name

**What This Proves**: Vercel AI SDK multi-provider support working

---

## 2. Upstash Redis Cache Integration

**Purpose**: Reduce API costs by caching responses

### Test 2.1: Identical Query Caching

**Steps**:
1. Send message: `What is 2+2?`
2. Note response time (likely 1-2 seconds)
3. **Immediately** send same message again: `What is 2+2?`
4. Note response time (should be <100ms)

**Expected Result**:
- ✅ First request: Normal speed (~1-2s)
- ✅ Second request: Near-instant (<100ms)
- ✅ Both responses identical

**What This Proves**: Redis caching working, reducing API costs

### Test 2.2: Cache Expiration

**Steps**:
1. Send: `Random test message for cache`
2. Wait 2 minutes
3. Send exact same message again
4. Check if response is cached or fresh

**Expected Result**:
- ✅ After expiration, new API call made (slower)
- ✅ Response still correct

**What This Proves**: Cache TTL working correctly

---

## 3. Google Gemini 2.5 Flash (FREE Tier)

**Purpose**: Fast, default AI model for most requests

### Test 3.1: Basic Chat

**Steps**:
1. Ensure model selector shows "Gemini Flash" (default)
2. Send: `Explain quantum computing in one sentence`
3. Verify response quality

**Expected Result**:
- ✅ Response in 1-2 seconds
- ✅ Clear, concise answer
- ✅ No errors about rate limits or costs

**What This Proves**: Gemini Flash FREE tier working (1,500 requests/day)

### Test 3.2: Long Conversation

**Steps**:
1. Send 5+ messages in a row
2. Each message: `Continue the conversation about [topic]`

**Expected Result**:
- ✅ All messages processed
- ✅ Context maintained across messages
- ✅ No rate limit errors

**What This Proves**: FREE tier limits not exceeded, multi-turn context working

---

## 4. Google Gemini 2.5 Pro (FREE Tier)

**Purpose**: Advanced reasoning for complex queries

### Test 4.1: Complex Analysis

**Steps**:
1. Switch model selector to "Gemini Pro"
2. Send: `Analyze the pros and cons of remote work vs office work in 2025`
3. Wait for detailed response

**Expected Result**:
- ✅ Response longer than Flash model would give
- ✅ More structured analysis
- ✅ Takes 2-4 seconds (slightly slower than Flash)

**What This Proves**: Gemini Pro FREE tier working (50 requests/day)

### Test 4.2: Automatic Pro Selection

**Steps**:
1. Switch back to "Auto" mode
2. Send: `Perform a deep analysis of blockchain scalability challenges`
3. Check which model was used (should auto-select Pro)

**Expected Result**:
- ✅ System automatically selects Gemini Pro for complex query
- ✅ Detailed response provided
- ✅ No manual model switching needed

**What This Proves**: Smart model selection working

---

## 5. DeepSeek V3.2 Bulk Processing

**Purpose**: Process 100+ documents at once

### Test 5.1: Open Bulk Processing Modal

**Method 1 - Via Sidebar**:
1. Look at left sidebar (bottom section)
2. Click "📦 Bulk Process" button
3. Modal should open

**Method 2 - Via Slash Command**:
1. Click in chat input
2. Type `/bulk`
3. Press Tab or Enter
4. Modal should open

**Expected Result**:
- ✅ Dark modal opens (gray-900 background)
- ✅ File upload area visible
- ✅ Task selection buttons (Summarize, Extract, Categorize, Analyze)
- ✅ "Start Processing" button (green)

**What This Proves**: UI integration complete

### Test 5.2: Upload and Process Files

**Important**: This test requires `DEEPSEEK_API_KEY` to be set in Railway environment variables.

**Steps**:
1. Create 3 small text files:
   - `test1.txt`: "The quick brown fox jumps over the lazy dog."
   - `test2.txt`: "Machine learning is a subset of artificial intelligence."
   - `test3.txt`: "Climate change requires immediate global action."
2. Open bulk processing modal
3. Click "Choose Files" and select all 3 files
4. Select task: "Summarize"
5. Click "Start Processing"

**Expected Result** (if API key set):
- ✅ Files upload successfully
- ✅ Progress bar shows during processing
- ✅ Results display after ~10-20 seconds
- ✅ Summary stats: 3/3 successful
- ✅ Cost: ~$0.003 (very cheap)
- ✅ "Export Results" button available

**Expected Result** (if API key NOT set):
- ❌ Error: "DeepSeek service not available"
- **Action Required**: Set `DEEPSEEK_API_KEY` in Railway dashboard

**What This Proves**: DeepSeek bulk processing fully integrated (when API key configured)

---

## 6. Perplexity Sonar Pro - AI Search

**Purpose**: Real-time web search with citations

### Test 6.1: Basic Search

**Important**: Requires `PERPLEXITY_API_KEY` in Railway environment.

**Steps**:
1. In chat input, type: `/search what is quantum computing`
2. Press Enter
3. Wait 2-3 seconds

**Expected Result** (if API key set):
- ✅ AI response appears with Perplexity answer
- ✅ **Citations** displayed below (clickable links to sources)
- ✅ **Related Questions** shown (clickable)
- ✅ Cost tracked: $0.005
- ✅ Inline display (not popup)

**Expected Result** (if API key NOT set):
- ❌ Error: "Perplexity search service not available"
- **Action Required**: Set `PERPLEXITY_API_KEY` in Railway

**What This Proves**: Perplexity search fully integrated (when API key configured)

### Test 6.2: Click Related Question

**Steps** (continuing from Test 6.1):
1. After search completes
2. Click one of the "Related Questions"
3. New search should automatically execute

**Expected Result**:
- ✅ New search runs automatically
- ✅ New results appear
- ✅ Cost: +$0.005 (total $0.010)

**What This Proves**: Interactive search features working

---

## 7. ElevenLabs Turbo v2.5 - Voice Output (TTS)

**Purpose**: Read AI responses aloud

### Test 7.1: Play AI Response

**Important**: Requires `ELEVENLABS_API_KEY` in Railway environment.

**Steps**:
1. Send any message: `Explain photosynthesis briefly`
2. Wait for AI response
3. **Hover** over the AI message
4. Speaker icon (🔊) should appear on right side
5. Click the speaker icon

**Expected Result** (if API key set):
- ✅ Speaker icon visible on hover
- ✅ Loading spinner (⏳) appears briefly
- ✅ Audio plays in Rachel voice (calm, conversational)
- ✅ Icon changes to pause (⏸) during playback
- ✅ Can click pause to stop

**Expected Result** (if API key NOT set):
- ❌ Error in browser console
- **Action Required**: Set `ELEVENLABS_API_KEY` in Railway

**What This Proves**: ElevenLabs voice output integrated (when API key configured)

### Test 7.2: Free Tier Check

**Steps**:
1. Generate and play 5+ different AI messages
2. Track character count (each message ~100-200 chars)

**Expected Result**:
- ✅ All audio plays successfully
- ✅ FREE tier (10,000 chars/month) not exceeded
- ✅ No cost incurred

**What This Proves**: FREE tier usage tracking working

---

## 8. FLUX 1.1 Pro - Image Generation

**Purpose**: High-quality AI image generation

### Test 8.1: Generate Image (Default 1:1)

**Important**: Requires `REPLICATE_API_TOKEN` in Railway environment.

**Steps**:
1. In chat input, type: `/image sunset over ocean`
2. Press Enter
3. Wait 10-15 seconds

**Expected Result** (if API key set):
- ✅ "Generating image..." message appears (gray text)
- ✅ Image appears inline after ~10 seconds
- ✅ Metadata shown below: prompt, aspect ratio (1:1), cost ($0.055)
- ✅ "Open full size" and "Clear" buttons visible
- ✅ High-quality image displayed

**Expected Result** (if API key NOT set):
- ❌ Error: "Image generation service not available"
- **Action Required**: Set `REPLICATE_API_TOKEN` in Railway

**What This Proves**: FLUX image generation integrated (when API key configured)

### Test 8.2: Generate with Aspect Ratio

**Steps**:
1. Type: `/image 16:9 mountain landscape`
2. Press Enter
3. Wait 10-15 seconds

**Expected Result**:
- ✅ Image generated in **16:9 aspect ratio** (widescreen)
- ✅ Metadata shows correct aspect ratio
- ✅ Image displays wide format
- ✅ Cost: $0.055

**Supported Ratios**: 1:1, 16:9, 9:16, 4:3, 3:4

**What This Proves**: Aspect ratio customization working

### Test 8.3: Daily Limit Check

**Steps**:
1. Generate 5 images (one at a time)
2. Try to generate 6th image

**Expected Result**:
- ✅ First 5 images generate successfully
- ✅ 6th attempt shows error: **"Daily limit reached (5 images/day)"**
- ✅ Limit resets next day

**What This Proves**: Usage limits enforced correctly

---

## 9. Web Speech API - Voice Input

**Purpose**: Speak instead of typing

### Test 9.1: Start Voice Input

**Steps**:
1. Look at chat input area (bottom)
2. Click microphone icon (🎤) on right side of input
3. Browser should prompt for microphone permission (if first time)
4. Click "Allow"
5. Microphone icon should turn red (recording)

**Expected Result**:
- ✅ Microphone permission granted
- ✅ Icon turns red/active
- ✅ Ready to receive speech

**What This Proves**: Web Speech API initialized

### Test 9.2: Speak and Convert to Text

**Steps**:
1. With microphone active (red)
2. Speak clearly: "What is machine learning?"
3. Stop speaking
4. Text should appear in input field
5. Press Enter to send

**Expected Result**:
- ✅ Speech converted to text accurately
- ✅ Text appears in input field
- ✅ Message sends normally
- ✅ AI responds to spoken question

**What This Proves**: Speech-to-text working end-to-end

### Test 9.3: Stop Recording

**Steps**:
1. Start microphone
2. Click microphone icon again (while red)

**Expected Result**:
- ✅ Recording stops
- ✅ Icon returns to gray/inactive

**What This Proves**: Start/stop controls working

---

## 10. pgvector + HNSW - RAG/Embeddings

**Purpose**: Semantic search and context retrieval

### Test 10.1: Semantic Search

**Steps**:
1. Go to: https://kimbleai.com/hub/search
2. Enter query: `machine learning algorithms`
3. Click "Search"

**Expected Result**:
- ✅ Results page loads
- ✅ Relevant documents/messages returned
- ✅ Results ranked by semantic similarity (not just keyword match)
- ✅ Search completes in <2 seconds

**What This Proves**: pgvector embeddings and HNSW indexing working

### Test 10.2: RAG Context Retrieval

**Steps**:
1. Go to main chat
2. Ask: `What have we discussed about machine learning before?`
3. AI should retrieve past conversations using RAG

**Expected Result**:
- ✅ AI references previous conversations
- ✅ Specific details from past chats mentioned
- ✅ Context retrieved via vector similarity

**What This Proves**: RAG system (AutoReferenceButler) integrated

### Test 10.3: Embedding Cache Performance

**Steps**:
1. Search for: `quantum computing` (first time)
2. Note search time (~1-2 seconds)
3. Search for same query again: `quantum computing`
4. Note search time (~500ms or less)

**Expected Result**:
- ✅ First search slower (generates embeddings)
- ✅ Second search faster (uses cached embeddings)
- ✅ 80-90% cache hit rate overall

**What This Proves**: Embedding cache working (445 lines, high hit rate)

---

## 11. Knowledge Graph

**Purpose**: Track entities and relationships

### Test 11.1: View Knowledge Graph

**Steps**:
1. Navigate to: https://kimbleai.com/hub/graph
2. Graph visualization should load

**Expected Result**:
- ✅ Graph visualization appears
- ✅ Nodes represent entities (people, concepts, projects)
- ✅ Edges represent relationships
- ✅ Interactive (can click/drag nodes)

**What This Proves**: Knowledge Graph integrated (553 lines)

### Test 11.2: Entity Extraction in Chat

**Steps**:
1. Go to main chat
2. Send: `I'm working on Project Alpha with Rebecca. We're using Python and TensorFlow.`
3. Go to Knowledge Graph page
4. Search for "Project Alpha"

**Expected Result**:
- ✅ Entities extracted from message:
  - Project: "Project Alpha"
  - Person: "Rebecca"
  - Technology: "Python", "TensorFlow"
- ✅ Relationships created:
  - User → works_on → Project Alpha
  - User → collaborates_with → Rebecca
  - Project Alpha → uses → Python, TensorFlow

**What This Proves**: Entity extraction and relationship tracking working

### Test 11.3: Entity Search

**Steps**:
1. On Knowledge Graph page
2. Use search bar to find specific entity
3. Click on entity node

**Expected Result**:
- ✅ Search finds entities
- ✅ Node details appear on click
- ✅ Related entities highlighted

**What This Proves**: Knowledge Graph query and navigation working

---

## API Key Requirements Summary

**Currently Required** (must be set in Railway environment):
1. ✅ `GOOGLE_API_KEY` - Gemini Flash/Pro (FREE tier)
2. ❓ `DEEPSEEK_API_KEY` - Bulk processing
3. ❓ `PERPLEXITY_API_KEY` - AI search
4. ❓ `ELEVENLABS_API_KEY` - Voice output
5. ❓ `REPLICATE_API_TOKEN` - Image generation

**Already Configured** (should work out-of-box):
- ✅ Upstash Redis (serverless, FREE)
- ✅ Supabase (database, FREE tier)
- ✅ Web Speech API (browser native, FREE)

---

## Setting Missing API Keys

If any service shows "not available" errors:

1. **Railway Dashboard**:
   ```
   https://railway.app → Select kimbleai project → Variables tab
   ```

2. **Add Missing Keys**:
   ```
   DEEPSEEK_API_KEY=sk-xxx...
   PERPLEXITY_API_KEY=pplx-xxx...
   ELEVENLABS_API_KEY=sk_xxx...
   REPLICATE_API_TOKEN=r8_xxx...
   ```

3. **Redeploy**:
   - Railway auto-redeploys on variable changes
   - Wait 4-6 minutes for deployment
   - Test again

---

## Troubleshooting

### "Service not available" Errors

**Cause**: Missing API key in Railway environment

**Fix**:
1. Go to Railway dashboard
2. Add required API key
3. Wait for redeploy
4. Test again

### "Failed to validate user"

**Cause**: User validation bug (should be fixed in v10.2.1+)

**Fix**:
1. Ensure version shows v10.2.1 or higher
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for errors

### Images/Search/Voice Not Working

**Cause**: API keys not set OR free tier limits exceeded

**Fix**:
1. Check Railway environment variables
2. Check Railway logs for error messages
3. Verify API key is valid (test on provider website)

---

## Success Criteria

All 11 integrations pass if:

✅ **Vercel AI SDK**: Chat streams word-by-word
✅ **Upstash Redis**: Identical queries return cached instantly
✅ **Gemini Flash**: Responses fast (~1-2s), FREE tier working
✅ **Gemini Pro**: Complex analysis working, auto-selection smart
✅ **DeepSeek**: Bulk modal opens, processes files (if API key set)
✅ **Perplexity**: Search returns citations and related questions (if API key set)
✅ **ElevenLabs**: Audio plays on click, FREE tier not exceeded (if API key set)
✅ **FLUX**: Images generate in 10-15s, aspect ratios work (if API key set)
✅ **Web Speech API**: Voice input converts speech to text accurately
✅ **pgvector/HNSW**: Semantic search fast, RAG context retrieval working
✅ **Knowledge Graph**: Entities extracted, relationships tracked, graph navigable

---

## Cost Summary

**FREE Services** (No API key needed):
- Gemini Flash: FREE 1,500 requests/day
- Gemini Pro: FREE 50 requests/day
- Upstash Redis: FREE 10K commands/day
- Web Speech API: Browser native, FREE

**Paid Services** (API key required, but cheap):
- DeepSeek: $0.003 per 3 files (~$0.001 each)
- Perplexity: $0.005 per search
- ElevenLabs: FREE 10K chars/month
- FLUX: $0.055 per image (5/day limit)

**Total Monthly Cost** (with moderate usage): $18-28

---

**Test Report Generated**: 2025-11-23
**Version Tested**: v10.2.1+
**All Tests Documented**: ✅ Complete
