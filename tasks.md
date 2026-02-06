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

---

### Task 18: Claude Code Integration Research
**Status:** Pending
**Priority:** High

**Problem:** Explore how to integrate Claude Code CLI capabilities into KimbleAI.

**Research Areas:**
- Claude Agent SDK for building custom agents
- MCP (Model Context Protocol) servers
- Hooks and skill system
- Possible integration points with KimbleAI

---

### Task 19: MCP Integrations Research
**Status:** Pending
**Priority:** High

**Problem:** Research potential MCP server integrations and how they could enhance KimbleAI.

**Research Areas:**
- Available MCP servers (file systems, databases, APIs)
- Creating custom MCP servers
- Integrating MCP with existing chat interface
- Security considerations

---

### Task 20: Modern Tech Stack Assessment
**Status:** Ongoing
**Priority:** Medium

**Problem:** Continuously evaluate modern technologies and services to find best solutions.

**Areas to Monitor:**
- AI model releases (OpenAI, Anthropic, Google)
- New APIs and services
- Framework updates (Next.js, React)
- Database and vector store options
- Voice/audio technologies
- Agent frameworks

---

### Task 21: Regular Recommendations & Improvements
**Status:** Ongoing
**Priority:** Medium

**Problem:** Provide regular recommendations on ways to improve or identify missed opportunities.

**Scope:**
- Performance optimizations
- UX improvements
- Cost optimizations
- Security enhancements
- Feature ideas based on capabilities
- Integration opportunities

---

## Implemented Tools & Integrations (v11.11.0)

### Available Agentic Tools

The following tools are implemented in `lib/ai/tools/` and available for AI to call:

#### Web Tools (`lib/ai/tools/web.ts`)
| Tool | Description | Confirmation |
|------|-------------|--------------|
| `web_search` | Search the web using Brave Search or DuckDuckGo | No |
| `web_fetch` | Fetch and extract text from a webpage | No |
| `get_current_time` | Get current date/time in various formats | No |

#### File Tools (`lib/ai/tools/files.ts`)
| Tool | Description | Confirmation |
|------|-------------|--------------|
| `list_files` | List user's uploaded files | No |
| `get_file_content` | Get extracted text from a file | No |
| `search_files` | Search through uploaded files | No |
| `list_conversations` | List recent chat conversations | No |

#### Calendar Tools (`lib/ai/tools/calendar.ts`)
| Tool | Description | Confirmation |
|------|-------------|--------------|
| `calendar_list_events` | List upcoming Google Calendar events | No |
| `calendar_create_event` | Create a new calendar event | **Yes** |
| `calendar_find_free_time` | Find available time slots | No |

#### Data Tools (`lib/ai/tools/data.ts`)
| Tool | Description | Confirmation |
|------|-------------|--------------|
| `get_cost_analytics` | Get AI usage cost breakdown | No |
| `get_memories` | Get saved user memories/facts | No |
| `save_memory` | Save a new memory | No |
| `list_projects` | List user projects | No |
| `calculate` | Perform mathematical calculations | No |

### MCP Server Support (`lib/mcp/`)

MCP (Model Context Protocol) integration enables standardized connections to external services.

#### Implemented Components
- `lib/mcp/client.ts` - MCP client for connecting to servers
- `lib/mcp/registry.ts` - Server registry and catalog

#### Available MCP Server Catalog
| Server | Category | Description | Required Env |
|--------|----------|-------------|--------------|
| `github` | Development | GitHub repos, issues, PRs | `GITHUB_TOKEN` |
| `filesystem` | Data | Local file system access | - |
| `google-drive` | Productivity | Google Drive files | `GOOGLE_ACCESS_TOKEN` |
| `slack` | Communication | Slack messaging | `SLACK_TOKEN` |
| `notion` | Productivity | Notion pages/databases | `NOTION_TOKEN` |
| `postgres` | Data | PostgreSQL queries | `POSTGRES_URL` |
| `sqlite` | Data | SQLite database access | - |
| `brave-search` | Data | Web search | `BRAVE_API_KEY` |
| `puppeteer` | Data | Web scraping/automation | - |

### Voice Chat (`lib/voice/`)

Real-time voice chat using OpenAI Realtime API with WebRTC.

#### Implemented Components
- `lib/voice/realtime.ts` - OpenAI Realtime API WebRTC connection
- `VoiceActivityDetector` class for push-to-talk

#### Voice Features
- WebRTC connection (recommended over WebSockets)
- Server-side Voice Activity Detection (VAD)
- Interrupt handling for natural conversations
- Multiple voice options (alloy, echo, fable, onyx, nova, shimmer)
- Real-time transcription with Whisper

---

## Future Integrations Roadmap

### Phase 1: Core Agentic (Current)
- [x] Tool framework implementation
- [x] MCP client foundation
- [x] Voice chat WebRTC
- [ ] Tool confirmation UI
- [ ] MCP server connection UI

### Phase 2: Workspace Integrations (Q2 2026)
- [ ] Slack MCP server connection
- [ ] Notion MCP server connection
- [ ] GitHub MCP server connection
- [ ] Email drafting tools

### Phase 3: Advanced Agentic (Q3 2026)
- [ ] Code execution sandbox (Pyodide)
- [ ] Multi-step task planning
- [ ] Autonomous task execution
- [ ] Tool chaining

### Phase 4: Collaboration (Q4 2026)
- [ ] Shared workspaces
- [ ] Team permissions
- [ ] Real-time collaboration
- [ ] Conversation branching

---

## New Tasks (Added 2026-02-06)

### Task 22: Implement MCP Server Support
**Status:** In Progress
**Priority:** HIGH
**Added:** 2026-02-06

**Problem:** MCP is now the industry standard for AI integrations (adopted by OpenAI, Google, Microsoft). Missing this means manual integration work.

**Research Findings:**
- MCP donated to Linux Foundation's Agentic AI Foundation (AAIF)
- OpenAI adopted MCP in March 2025
- Pre-built servers exist for Slack, GitHub, Notion, Google Drive, Asana

**Implementation:**
1. Add MCP client library
2. Create MCP server registry
3. Build custom KimbleAI MCP server for local data
4. Connect to community MCP servers (Slack, GitHub, Notion)
5. Add MCP tool execution to chat

**Files to create:**
```
lib/mcp/
├── client.ts        # MCP client connection
├── registry.ts      # Server registry and management
├── executor.ts      # Tool execution handler
└── servers/
    └── kimbleai.ts  # Custom server for KimbleAI data
```

**Benefits:**
- Instant access to 50+ integrations
- Standardized tool interface
- OAuth handling built-in

---

### Task 23: Upgrade Voice to OpenAI Realtime API
**Status:** Pending
**Priority:** HIGH
**Added:** 2026-02-06

**Problem:** Current voice uses file upload + transcription. Research shows WebRTC is recommended for voice chat.

**Research Findings:**
- OpenAI Realtime API uses WebRTC (not WebSockets)
- LiveKit and Pipecat provide orchestration
- DTLS 1.3 is now standard (February 2025)
- Sub-200ms latency achievable

**Implementation:**
1. Add WebRTC connection to OpenAI Realtime API
2. Implement voice activity detection (VAD)
3. Add push-to-talk mode
4. Enable interruption handling
5. Add TTS for AI responses

**Files to create:**
```
lib/voice/
├── realtime.ts      # OpenAI Realtime API connection
├── webrtc.ts        # WebRTC signaling and connection
├── vad.ts           # Voice activity detection
└── audio-player.ts  # Audio playback for TTS
```

**Cost consideration:** Realtime API is $32/1M tokens - use sparingly

---

### Task 24: Implement Agentic Tool Framework
**Status:** In Progress
**Priority:** HIGH
**Added:** 2026-02-06

**Problem:** AI can only chat, cannot take actions. GPT-5.2 and Claude Opus 4.5 excel at tool calling.

**Research Findings:**
- GPT-5.2 has improved tool calling (no sprawling system prompts needed)
- Freeform tool calling allows raw text (Python, SQL) directly
- Claude Agent SDK uses in-process MCP servers

**Tool Categories to Implement:**
1. **Web Tools**: Search, fetch URLs, scrape content
2. **File Tools**: Read/write files, manage uploads
3. **Code Tools**: Execute Python/JavaScript in sandbox
4. **Calendar Tools**: Read/create Google Calendar events
5. **Email Tools**: Draft/send Gmail (with confirmation)
6. **Data Tools**: Query Supabase, run analytics

**Files to create:**
```
lib/ai/tools/
├── index.ts         # Tool registry and executor
├── schemas.ts       # Tool JSON schemas
├── web.ts           # Web search, fetch
├── files.ts         # File operations
├── code.ts          # Sandboxed code execution
├── calendar.ts      # Google Calendar
├── email.ts         # Gmail integration
└── data.ts          # Database queries
```

**Security:** All tools require user confirmation for destructive actions

---

### Task 25: Enable Supabase Automatic Embeddings
**Status:** Pending
**Priority:** Medium
**Added:** 2026-02-06

**Problem:** Currently generating embeddings manually. Supabase supports automatic embedding triggers.

**Research Findings:**
- Supabase has automatic embedding generation via triggers
- Sub-50ms query times for indexed searches
- Can handle 1.6M+ embeddings

**Implementation:**
1. Create database trigger on messages table
2. Auto-generate embeddings on INSERT
3. Create trigger on files table
4. Enable similarity search functions

**SQL to add:**
```sql
-- Trigger function for automatic embedding
CREATE OR REPLACE FUNCTION generate_embedding_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function to generate embedding
  PERFORM net.http_post(
    url := current_setting('app.edge_function_url') || '/generate-embedding',
    body := json_build_object('id', NEW.id, 'content', NEW.content)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Task 26: Add Code Execution Sandbox
**Status:** Pending
**Priority:** Medium
**Added:** 2026-02-06

**Problem:** Users can't run code snippets directly. Need safe execution environment.

**Implementation:**
1. Use Pyodide for Python in browser
2. Add sandboxed JavaScript execution (Web Worker)
3. Implement output capture with streaming
4. Add memory/time limits for safety
5. Display execution results in chat

**Files to create:**
```
lib/sandbox/
├── python.ts        # Pyodide Python execution
├── javascript.ts    # Web Worker JS execution
├── output.ts        # Output capture and streaming
└── limits.ts        # Resource limits
```

---

### Task 27: Implement Conversation Branching
**Status:** Pending
**Priority:** Low
**Added:** 2026-02-06

**Problem:** Can't explore "what if" scenarios without losing original context.

**Implementation:**
1. Add "Fork" button to any message
2. Create conversation_branches table
3. Branch visualization UI
4. Compare branches side-by-side
5. Merge branches back

---

### Task 28: Add Collaborative Workspaces
**Status:** Pending
**Priority:** Low
**Added:** 2026-02-06

**Problem:** No multi-user support for team projects.

**Implementation:**
1. Add workspace entity with members
2. Shared projects with permissions (view/edit/admin)
3. Real-time collaboration via Supabase Realtime
4. Team cost allocation and budgets
5. Activity feed for workspace

---

## Task Summary

### Completed (11)
- Tasks 1-5: Project-chat integration ✅
- Task 6: Model display in responses ✅
- Tasks 7-10: File, vision, transcription, Google ✅
- Task 11: RAG service (needs SQL script) ✅

### High Priority - In Progress (4)
- Task 22: MCP Server Support 🔄
- Task 24: Agentic Tool Framework 🔄
- Task 12: Voice Chat Interface
- Task 23: OpenAI Realtime API

### High Priority - Pending (2)
- Task 13: Tool Calling (merged into Task 24)
- Task 18/19: Claude Code & MCP Research (merged into Task 22)

### Medium Priority - Pending (4)
- Task 14: Production Validation
- Task 20: Tech Stack Assessment
- Task 25: Automatic Embeddings
- Task 26: Code Sandbox

### Low Priority - Pending (4)
- Task 16: Notion Integration (via MCP)
- Task 17: GitHub Integration (via MCP)
- Task 27: Conversation Branching
- Task 28: Collaborative Workspaces

### Ongoing (2)
- Task 20: Modern Tech Stack Assessment
- Task 21: Regular Recommendations
