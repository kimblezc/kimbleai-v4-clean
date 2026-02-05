# KimbleAI Tasks

## Task Management Convention

**When user says "task" or "TASK" (any case):**

1. **New task** → Add to this file with "Pending" status + add to TodoWrite
2. **Existing task** → Report current status and any blockers
3. **Ambiguous** → Search this file, report matches or ask for clarification

**Task statuses:** Pending | In Progress | Complete | Verified | Blocked

---

## MANDATORY UI Branding Rules

**RULE: Every page MUST have the D20 and KimbleAI logo in the upper left.**

Requirements:
- Rotating wireframe D20 icosahedron
- "KimbleAI" text next to it
- Clicking EITHER returns to main page (kimbleai.com)
- Component: `components/layout/Logo.tsx`
- Included via: `components/layout/Sidebar.tsx`

If the D20 or KimbleAI text is missing from ANY page, fix it immediately.

---

## MANDATORY Development Workflow

**This workflow is AUTOMATIC. Claude executes it for EVERY change without being asked.**

```
0. PREFLIGHT → 1. READ LOGS → 2. UNDERSTAND → 3. FIX → 4. TEST LOCAL → 5. DEPLOY → 6. VERIFY → 7. DEBUG → 8. ITERATE
```

### Quick Commands
```bash
npm run preflight        # Check environment before starting
npm run build           # Test locally (MUST pass)
npm run deploy          # Build + push + deploy
npm run verify:deployed # Verify production health
npm run deploy:verify   # Full deploy + verification
```

### Rules (Claude MUST follow automatically)
1. Run `npm run build` before every commit
2. Run `npm run verify:deployed` after every deployment
3. Check logs if verification fails
4. Keep iterating until all checks pass
5. Update CLAUDE.md status after successful deployment

**Do not stop until the feature works in production. Do not ask permission to continue.**

---

## Project-Chat Integration Fixes

### Issue Summary
The projects feature at https://www.kimbleai.com/projects has several UX issues that prevent effective use of project-chat associations.

---

## Tasks

### Task 1: Add Back Navigation to Projects Page
**Status:** Complete
**File:** `app/projects/page.tsx`

**Problem:** No way to return to main chat page from /projects

**Solution:**
- Add "Back to Chat" link with ArrowLeftIcon in header
- Links to `/` (main page)

---

### Task 2: Fix Version Display on Projects Page
**Status:** Complete
**File:** `app/projects/page.tsx`

**Problem:** Version shows only `v11.9.7`, missing commit hash

**Solution:**
- Import and add `<VersionFooter />` component
- Will display `v11.9.7 @ abc1234` format in bottom-right

---

### Task 3: Make Project Cards Clickable
**Status:** Complete
**File:** `app/projects/page.tsx`

**Problem:** Cannot click a project to see its associated chats

**Solution:**
- Add `useRouter` from next/navigation
- Make cards clickable → navigate to `/?projectId={id}`
- Add visual hint "Click to view chats"

---

### Task 4: Add Project Context to Main Page
**Status:** Complete
**File:** `app/page.tsx`

**Problem:** Cannot view/create chats associated with a specific project

**Solution:**
- Read `projectId` from URL search params
- Add `activeProjectId` state
- Filter `loadConversations()` by projectId when set
- Pass projectId to `createConversation()`
- Show active project indicator in header with X to clear
- Pass props to Sidebar: `activeProjectId`, `onSelectProject`

---

### Task 5: Update Sidebar for Project Selection
**Status:** Complete
**File:** `components/layout/Sidebar.tsx`

**Problem:**
- Cannot select a project to filter chats
- Version display missing commit hash

**Solution:**
- Add `activeProjectId` and `onSelectProject` props
- Make project headers clickable to toggle selection
- Highlight selected project
- Add "New chat in project" button when expanded
- Fix version to show `v{version} @ {commit}`

---

## Technical Notes

### Database Schema (Already Exists)
```sql
-- conversations.project_id is nullable FK to projects.id
-- No schema changes needed
```

### API Support (Already Exists)
- `GET /api/conversations?projectId=xyz` - Filter by project
- `POST /api/conversations` - Accepts `projectId` in body
- `PUT /api/conversations/[id]` - Can update `projectId`

### Files to Modify
1. `app/projects/page.tsx` - Tasks 1, 2, 3
2. `app/page.tsx` - Task 4
3. `components/layout/Sidebar.tsx` - Task 5

---

## Verification Checklist

- [ ] Projects page has "Back to Chat" link
- [ ] Projects page shows `vX.X.X @ commit` in footer
- [ ] Clicking project card navigates to main page with project context
- [ ] Main page header shows active project name
- [ ] Main page shows only selected project's chats
- [ ] New Chat creates conversation in active project
- [ ] Can clear project selection via X button
- [ ] Sidebar project click selects/deselects project
- [ ] Sidebar version shows commit hash

---

## Additional Tasks

### Task 6: Show Model Used in Chat Responses
**Status:** Complete (v11.9.12)
**File:** `components/chat/MessageList.tsx`, `app/api/chat/route.ts`, `lib/ai/ai-service.ts`

Display which AI model was used for each response to verify smart routing works.

**Implementation:**
- AI service returns `modelUsed`, `providerUsed`, `selectionReason` with stream
- Chat API sends `model_info` event at start of stream
- Frontend captures model info and displays badge under AI messages
- Badge shows model name (e.g., `gpt-5.2`, `claude-opus-4.5`)

---

### Task 7: Test File Uploads & Analysis
**Status:** Verified (v11.9.13)
**Endpoints:** `/api/files/upload`, `/api/files`, `/api/files/[id]`
**Frontend:** `/files` page

File upload functionality is implemented with:
- 50MB file size limit
- Text extraction
- AI summarization
- Embedding generation for semantic search

---

### Task 8: Test Image Analysis
**Status:** Verified (v11.9.13)
**Endpoint:** `/api/vision`

Vision API supports:
- Base64 and URL image inputs
- Camera capture support
- Smart model routing (Gemini 2.5 Flash default)
- Cost tracking

---

### Task 9: Test Transcription
**Status:** Verified (v11.9.13)
**Endpoint:** `/api/voice/transcribe`
**Frontend:** `/transcriptions` page

Audio transcription with:
- Deepgram Nova-3 (no file size limit, up to 5 hours)
- AI-powered categorization
- Project assignment suggestions
- Speaker diarization support

---

### Task 10: Google Integration
**Status:** Verified (v11.9.13)
**File:** `lib/auth/auth-options.ts`

Google OAuth configured with scopes for:
- Gmail (read/send)
- Drive (read-only)
- Calendar (read + create events)

Tokens stored in JWT session for API access.

---

## Strategic Pillars (Ultimate Goals)

### Pillar 1: Unified AI Interface
**Status:** Partially Complete
- ✅ Smart routing between GPT-5.2, Claude Opus 4.5, Gemini 3 Pro
- ✅ Cost-aware processing that respects budgets
- ✅ Automatic model selection for optimal results

### Pillar 2: Perfect Memory
**Status:** Pending
- ✅ Vector-indexed knowledge base exists
- ⬜ Never lose context across sessions (RAG not leveraged)
- ✅ Project-scoped isolation for different work contexts

### Pillar 3: Multi-Modal Intelligence
**Status:** Verified
- ✅ Text, vision, audio unified
- ✅ Deepgram Nova-3 for transcription
- ✅ Document processing (PDF, DOCX, spreadsheets)

### Pillar 4: Workspace Integration
**Status:** Partial
- ✅ Deep Google Workspace integration (Gmail, Drive, Calendar)
- ⬜ Future: Slack, Notion, GitHub integrations

### Pillar 5: Self-Improvement
**Status:** Complete
- ✅ Automated health monitoring
- ✅ Performance tracking
- ✅ Idea generation for continuous evolution

### Pillar 6: User Experience
**Status:** Complete
- ✅ Fast, responsive UI
- ✅ Clear cost visibility
- ✅ D&D-themed dark mode design

### Pillar 7: Coding & Debugging
**Status:** Ongoing
- ⬜ Eternal improvement and testing
- ⬜ Remain within cost limits

---

## Immediate Priority Tasks

### Task 11: Implement RAG for Cross-Session Memory
**Status:** Complete (v11.9.14 @ 435d412)
**Priority:** High

**Problem:** Data is stored but not leveraged for context. Users lose conversational context between sessions.

**Implementation:**
- Created `lib/ai/rag-service.ts` - RAG service with semantic search
- Integrated into `app/api/chat/route.ts` - Context injection
- Created `scripts/create-rag-tables.sql` - Database schema for user_memories

**Features:**
- ✅ Semantic search across messages, files, and memories
- ✅ "Remember this" commands to persist explicit facts
- ✅ Google services integration (Gmail, Drive, Calendar)
- ✅ Context injection into chat prompts
- ⚠️ Requires running SQL script in Supabase to enable vector search

**Note:** User must run `scripts/create-rag-tables.sql` in Supabase SQL Editor to enable vector search functions.

---

### Task 12: Build Voice Chat Interface
**Status:** Pending
**Priority:** High

**Problem:** All voice pieces exist (Deepgram transcription) but no unified voice interface.

**Solution:**
- Add microphone button to chat input
- Real-time speech-to-text using Deepgram
- Option for text-to-speech responses
- Push-to-talk or voice activity detection modes

**Files to examine:**
- `app/api/voice/transcribe/route.ts` - Existing transcription
- `components/chat/ChatInput.tsx` - Where to add mic button
- Consider ElevenLabs or similar for TTS

---

### Task 13: Add Tool Calling for Agentic Workflows
**Status:** Pending
**Priority:** High

**Problem:** AI can chat but can't take actions (agentic capability missing).

**Solution:**
- Implement function/tool calling with OpenAI and Anthropic APIs
- Define tool schemas (web search, file operations, calendar, etc.)
- Add confirmation UI for sensitive actions
- Track tool usage in cost calculations

**Files to examine:**
- `lib/ai/ai-service.ts` - Add tool definitions
- `lib/ai/providers/` - Provider-specific tool implementations
- New: `lib/ai/tools/` - Tool definitions and handlers

---

### Task 14: Production Validation Testing
**Status:** Pending
**Priority:** Medium

**Problem:** Features exist but need production validation with real user flows.

**Subtasks:**
- [ ] Test complete file upload → analysis → chat about file flow
- [ ] Test image capture → vision analysis → follow-up chat flow
- [ ] Test audio transcription → categorization → project assignment flow
- [ ] Test Google integration: read Gmail, read Drive, create Calendar event
- [ ] Test model routing with different prompt types
- [ ] Verify cost tracking accuracy

---

### Task 16: Notion Integration
**Status:** Pending
**Priority:** Low

**Problem:** No Notion integration yet.

**Solution:**
- OAuth flow for Notion access
- Read/create pages and databases
- Sync knowledge base with Notion pages

---

### Task 17: GitHub Integration
**Status:** Pending
**Priority:** Low

**Problem:** No GitHub integration yet.

**Solution:**
- OAuth flow for GitHub access
- Read issues, PRs, code
- Create issues/comments from chat
