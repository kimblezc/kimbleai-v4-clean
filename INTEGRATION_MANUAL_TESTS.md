# Manual Integration Tests for KimbleAI v10.3.1

**Test Date:** 2025-11-24
**Platform:** https://kimbleai.com
**Version:** v10.3.1 @ 3992f01

These 11 tests can be run directly in the kimbleai.com chat interface to verify each integration is working correctly.

---

## Test 1: OpenAI Integration (GPT Models)

**What it tests:** OpenAI API, GPT-4o/GPT-5, chat completions, streaming

**Test Input:**
```
Test OpenAI: Please generate a haiku about artificial intelligence. Use GPT-4o model.
```

**Expected Result:**
- ✅ Response streams in real-time (word by word)
- ✅ Haiku follows 5-7-5 syllable pattern
- ✅ Response completes without errors
- ✅ Model indicator shows "GPT-4o" or similar

**Pass Criteria:** Receives a proper haiku response with streaming

---

## Test 2: Anthropic Claude Integration

**What it tests:** Claude API, Sonnet 4.5, alternative LLM provider

**Test Input:**
```
Switch to Claude Sonnet 4.5 and explain the difference between machine learning and deep learning in 2 sentences.
```

**Expected Result:**
- ✅ Model switches to Claude Sonnet 4.5
- ✅ Concise 2-sentence explanation provided
- ✅ Response quality is high (Claude's trademark clarity)
- ✅ No API errors

**Pass Criteria:** Receives clear explanation from Claude model

**Note:** Requires ANTHROPIC_API_KEY. If missing, you'll see fallback to OpenAI.

---

## Test 3: Google Workspace Integration (Gmail)

**What it tests:** Google OAuth, Gmail API, email search

**Test Input:**
```
Search my Gmail for emails from the last 7 days containing the word "meeting". Show me the top 3.
```

**Expected Result:**
- ✅ OAuth authentication succeeds (if first time)
- ✅ Returns list of 3 emails with:
  - Subject lines
  - Sender names
  - Dates
  - Snippets
- ✅ Token refresh works automatically
- ✅ No 401/403 errors

**Pass Criteria:** Retrieves and displays recent emails

**Note:** Requires Google account login. Must have emails matching criteria.

---

## Test 4: Google Workspace Integration (Drive)

**What it tests:** Google Drive API, file listing, search

**Test Input:**
```
List the 5 most recently modified files in my Google Drive. Include file names and modification dates.
```

**Expected Result:**
- ✅ OAuth authentication (reuses Gmail token)
- ✅ Returns list of 5 files with:
  - File names
  - Modification timestamps
  - File types/MIME types
- ✅ Sorted by most recent first
- ✅ No permission errors

**Pass Criteria:** Displays recent Drive files with metadata

---

## Test 5: Google Workspace Integration (Calendar)

**What it tests:** Google Calendar API, event retrieval

**Test Input:**
```
Show me my Google Calendar events for the next 7 days. List the event titles and start times.
```

**Expected Result:**
- ✅ OAuth authentication (reuses token)
- ✅ Returns upcoming events with:
  - Event titles
  - Start date/time
  - Duration or end time
- ✅ Events sorted chronologically
- ✅ Handles empty calendar gracefully

**Pass Criteria:** Retrieves and displays calendar events

---

## Test 6: AssemblyAI Integration

**What it tests:** Audio transcription, speaker diarization, file upload

**Test Input:**
```
I want to transcribe an audio file. Please open the audio transcription modal.
```

**Then:**
1. Click the transcription button/modal
2. Upload a short audio file (30 seconds - 2 minutes)
3. Wait for transcription to complete

**Expected Result:**
- ✅ Modal opens successfully
- ✅ File upload works (accepts audio formats)
- ✅ Progress indicator shows status
- ✅ Transcription completes with text output
- ✅ Speaker labels if multiple speakers
- ✅ Cost estimate shown before processing

**Pass Criteria:** Audio file transcribed with accurate text

**Note:** Requires audio file. Test with meeting recording or podcast clip.

---

## Test 7: Zapier Integration

**What it tests:** Webhook automation, event notifications

**Test Input:**
```
Send a test webhook notification to Zapier with the message: "Integration test from kimbleai.com at [current time]"
```

**Expected Result:**
- ✅ Webhook request sent successfully
- ✅ Response indicates success or queued
- ✅ No 500/timeout errors
- ✅ Zapier receives webhook (check Zapier task history)

**Pass Criteria:** Webhook sent without errors

**Note:** If ZAPIER_WEBHOOK_URL not configured, you'll see "Zapier webhooks not configured" message. This is expected and means the integration code is working.

---

## Test 8: Cost Monitoring Integration

**What it tests:** Budget tracking, cost calculation, API usage monitoring

**Test Input:**
```
Show me my API usage costs for today. Include breakdown by service (OpenAI, Claude, AssemblyAI).
```

**Expected Result:**
- ✅ Returns cost summary with:
  - Total daily spending
  - Breakdown by service
  - Number of API calls
  - Token usage (if applicable)
- ✅ Budget limits shown
- ✅ Alert thresholds displayed
- ✅ Data from api_cost_tracking table

**Pass Criteria:** Displays accurate cost data

**Alternative Test:** Visit https://kimbleai.com/costs for dashboard view

---

## Test 9: Supabase Integration

**What it tests:** PostgreSQL database, pgvector, conversation storage

**Test Input:**
```
Search my conversation history for messages containing "integration test" from the past 24 hours.
```

**Expected Result:**
- ✅ Database query executes successfully
- ✅ Returns matching conversations/messages
- ✅ Includes timestamps and context
- ✅ Semantic search works (finds related terms)
- ✅ No database connection errors

**Pass Criteria:** Retrieves conversation history from database

---

## Test 10: GitHub Integration (Optional)

**What it tests:** GitHub API, repository access, issue retrieval

**Test Input:**
```
Connect to GitHub and list my 5 most recent repositories. Include repository names and descriptions.
```

**Expected Result:**
- ✅ GitHub API authentication succeeds
- ✅ Returns list of repositories with:
  - Repository names
  - Descriptions
  - Last updated dates
  - Star counts
- ✅ No 401/403 errors

**Pass Criteria:** Displays GitHub repositories

**Note:** Requires GITHUB_TOKEN. If not configured, you'll see "GitHub integration not configured" - this is expected.

---

## Test 11: Knowledge Base RAG System

**What it tests:** Embeddings, vector search, RAG retrieval, pgvector HNSW

**Test Input:**
```
Search my knowledge base for information about "deployment process" and summarize what you find.
```

**Expected Result:**
- ✅ Vector similarity search executes
- ✅ Retrieves relevant documents/chunks
- ✅ Returns summary of found information
- ✅ Shows source references
- ✅ Uses embeddings for semantic matching
- ✅ HNSW index used for fast search

**Pass Criteria:** Finds and summarizes relevant knowledge base content

**Alternative Test:**
```
Index this message into my knowledge base: "Test document for integration validation - contains important information about system testing."

Then search for: "information about testing"
```

Should retrieve the indexed message.

---

## Bonus Tests

### Test 12: Perplexity Integration (Optional)

**Test Input:**
```
Use Perplexity to search the web for "latest developments in AI language models November 2025" and provide a summary with citations.
```

**Expected Result:**
- ✅ Perplexity API call succeeds
- ✅ Returns current web results with citations
- ✅ Summary includes source URLs
- ✅ Information is recent (2025)

**Pass Criteria:** Returns cited web search results

---

### Test 13: ElevenLabs TTS (Optional)

**Test Input:**
```
Convert this text to speech: "This is a test of the ElevenLabs text to speech integration."
```

**Expected Result:**
- ✅ TTS request processes
- ✅ Returns audio URL or plays audio
- ✅ Voice is clear and natural
- ✅ Within free tier limits (10K chars/month)

**Pass Criteria:** Text converted to speech audio

---

### Test 14: FLUX Image Generation (Optional)

**Test Input:**
```
Generate an image using FLUX 1.1 Pro: "A futuristic AI assistant helping a developer, digital art style, vibrant colors"
```

**Expected Result:**
- ✅ Image generation request sent
- ✅ Progress indicator shows generation status
- ✅ High-quality image returned
- ✅ Image displays in chat
- ✅ Cost tracked (~$0.055)

**Pass Criteria:** Image generated and displayed

---

## Integration Health Dashboard Test

**Alternative to individual tests:** Visit the Integration Health Dashboard

**URL:** https://kimbleai.com/integrations/health

**What to check:**
- ✅ All 11 integrations listed
- ✅ Status indicators show correct states:
  - Green (active) for configured services
  - Yellow (degraded) if issues detected
  - Red (offline) if service down
  - Gray (optional) for unconfigured services
- ✅ Response times displayed
- ✅ Error rates shown
- ✅ Auto-refresh works (60s interval)
- ✅ Summary cards show accurate counts

**Pass Criteria:** Dashboard displays all integrations with current status

---

## Quick Test Summary

**Minimum Required Tests (Core Functionality):**
1. ✅ Test 1 - OpenAI (Required for chat)
2. ✅ Test 3 - Gmail (Google OAuth)
3. ✅ Test 8 - Cost Monitor (Budget safety)
4. ✅ Test 9 - Supabase (Database)
5. ✅ Test 11 - Knowledge Base (RAG system)

**Optional Tests (Extended Features):**
6. Test 2 - Claude (If ANTHROPIC_API_KEY set)
7. Test 6 - AssemblyAI (If audio file available)
8. Test 7 - Zapier (If webhook configured)
9. Test 10 - GitHub (If GITHUB_TOKEN set)
10. Tests 12-14 - Perplexity, ElevenLabs, FLUX (If configured)

---

## Expected Results by Service Status

### ✅ Active Services (Should Pass)
- OpenAI
- Google Workspace (Gmail, Drive, Calendar)
- Supabase
- Cost Monitor
- NextAuth
- Knowledge Base RAG

### ⚠️ Optional Services (Pass if configured, skip if not)
- Anthropic Claude
- AssemblyAI
- Zapier
- GitHub
- Notion
- Todoist
- Perplexity
- ElevenLabs
- FLUX

---

## Troubleshooting

### Common Issues

**"API key not configured"**
- Expected for optional integrations
- Not a failure - just means service not set up
- Core functionality still works

**"Authentication required"**
- For Google services, click sign-in link
- For GitHub, provide GITHUB_TOKEN in env vars

**"Rate limit exceeded"**
- OpenAI/Claude may have rate limits
- Wait a few minutes and retry
- Check cost dashboard for usage

**"Database connection error"**
- Check SUPABASE_SERVICE_ROLE_KEY
- Verify Supabase project is running
- Check Railway environment variables

---

## Test Results Template

Copy and fill out after testing:

```
KimbleAI Integration Test Results
Date: ___________
Tester: ___________
Version: v10.3.1 @ 3992f01

Test 1 (OpenAI): [ ] Pass [ ] Fail - Notes: __________
Test 2 (Claude): [ ] Pass [ ] Fail [ ] Skip - Notes: __________
Test 3 (Gmail): [ ] Pass [ ] Fail - Notes: __________
Test 4 (Drive): [ ] Pass [ ] Fail - Notes: __________
Test 5 (Calendar): [ ] Pass [ ] Fail - Notes: __________
Test 6 (AssemblyAI): [ ] Pass [ ] Fail [ ] Skip - Notes: __________
Test 7 (Zapier): [ ] Pass [ ] Fail [ ] Skip - Notes: __________
Test 8 (Cost Monitor): [ ] Pass [ ] Fail - Notes: __________
Test 9 (Supabase): [ ] Pass [ ] Fail - Notes: __________
Test 10 (GitHub): [ ] Pass [ ] Fail [ ] Skip - Notes: __________
Test 11 (Knowledge Base): [ ] Pass [ ] Fail - Notes: __________

Integration Dashboard: [ ] Pass [ ] Fail

Overall Status: [ ] All Required Tests Pass [ ] Issues Found

Issues/Notes:
_________________________________
_________________________________
```

---

## Success Criteria

**Deployment Verified:** ✅ All required tests pass
**Production Ready:** ✅ No critical errors
**Optional Features:** ⚠️ May be skipped if not configured

**Minimum for Production:**
- 5/5 required tests passing
- Integration dashboard accessible
- No database errors
- No authentication failures

---

**Last Updated:** 2025-11-24
**Test Duration:** ~15-20 minutes (all tests)
**Test Duration:** ~5 minutes (required tests only)
