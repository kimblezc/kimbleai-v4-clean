# KimbleAI Cleanup Plan

**Goal:** Remove all non-working agents and clean up codebase before building new write agents

---

## 📋 What We Found (Clutter)

### 1. **9 Old Chat Route Files** (DELETE ALL)
- `app/api/chat/route-broken.ts` ❌
- `app/api/chat/route-DESKTOP-UN6T850.ts` ❌
- `app/api/chat/route-gpt5-backup.ts` ❌
- `app/api/chat/route-minimal.ts` ❌
- `app/api/chat/route-original.ts` ❌
- `app/api/chat/route-simple.ts` ❌
- `app/api/chat/route-with-memory.ts` ❌
- `app/api/chat/route-working-simple.ts` ❌
- `app/api/chat/route.backup.ts` ❌

**Keep:** `app/api/chat/route.ts` ✅ (the actual one)

---

### 2. **6 Old Library Files** (DELETE ALL)
- `lib/cost-monitor-DESKTOP-UN6T850.ts` ❌
- `lib/file-processors-DESKTOP-UN6T850.ts` ❌
- `lib/message-reference-system-backup.ts` ❌
- `lib/session-continuity-system-backup-DESKTOP-UN6T850.ts` ❌
- `lib/session-continuity-system-backup.ts` ❌
- `lib/session-continuity-system-DESKTOP-UN6T850.ts` ❌

---

### 3. **Non-Working Agent Mode UI** (REMOVE FROM UI)
From `app/page.tsx` lines 76-79:
```typescript
const [chatMode, setChatMode] = useState<'normal' | 'deep-research' | 'agent'>('normal');
const [selectedAgent, setSelectedAgent] = useState<string>('');
const [researchProgress, setResearchProgress] = useState<any[]>([]);
const [isResearching, setIsResearching] = useState(false);
```

These modes don't work well, so remove the UI for them.

---

### 4. **Non-Working Agent Code** (REMOVE FROM ROUTE)
From `app/api/chat/route.ts`:
- `executeAgentMode()` function (lines 1315-1614)
- Agent routing logic
- 5 agents that only do search (drive-intelligence, audio-intelligence, knowledge-graph, project-context, cost-monitor)

**These are just glorified search - they don't DO anything.**

---

## 🎯 Cleanup Steps

### Step 1: Delete Old Files
```bash
# Delete 9 old chat routes
rm app/api/chat/route-broken.ts
rm app/api/chat/route-DESKTOP-UN6T850.ts
rm app/api/chat/route-gpt5-backup.ts
rm app/api/chat/route-minimal.ts
rm app/api/chat/route-original.ts
rm app/api/chat/route-simple.ts
rm app/api/chat/route-with-memory.ts
rm app/api/chat/route-working-simple.ts
rm app/api/chat/route.backup.ts

# Delete 6 old library files
rm lib/cost-monitor-DESKTOP-UN6T850.ts
rm lib/file-processors-DESKTOP-UN6T850.ts
rm lib/message-reference-system-backup.ts
rm lib/session-continuity-system-backup-DESKTOP-UN6T850.ts
rm lib/session-continuity-system-backup.ts
rm lib/session-continuity-system-DESKTOP-UN6T850.ts
```

**Saves:** ~15 files removed

---

### Step 2: Remove Agent Mode from UI

**File:** `app/page.tsx`

**Remove:**
- Agent mode state variables
- Agent mode selector UI
- Deep research progress UI
- Mode switching logic

**Keep:**
- Normal chat
- Conversations list
- Projects
- User interface

**Result:** Simpler, cleaner UI focused on what works

---

### Step 3: Remove Agent Code from Chat Route

**File:** `app/api/chat/route.ts`

**Remove:**
- Lines 98-102: Agent mode routing
- Lines 1315-1614: `executeAgentMode()` function
- All 5 agent implementations (drive-intelligence, audio-intelligence, etc.)

**Keep:**
- Normal chat functionality
- Conversation history
- Message storage
- OpenAI integration

**Result:** Cleaner API route, ~300 lines removed

---

### Step 4: Clean Up Agent Registry (Optional)

**File:** `lib/agent-registry.ts`

**Options:**
A. Delete entire file (agents don't work anyway)
B. Keep for reference (we'll build new agents later)

**Recommendation:** Keep it but comment out, we'll rebuild it properly

---

## ✅ What Will Remain (Working Features)

### UI (app/page.tsx):
- ✅ Chat interface
- ✅ Conversations list
- ✅ Projects
- ✅ Message history
- ✅ User switcher (Zach/Rebecca)
- ✅ Clean, simple interface

### API (app/api/chat/route.ts):
- ✅ Normal chat with GPT-4o
- ✅ Conversation storage
- ✅ Message history
- ✅ Cost tracking
- ✅ Clean, focused code

### What's Gone:
- ❌ Agent mode (didn't work)
- ❌ Deep research mode (wasn't used)
- ❌ 5 search-only "agents"
- ❌ 15 backup/old files

---

## 🚀 After Cleanup: Build New Working Agents

Once clean, we'll build **3 real agents that DO things:**

1. **Gmail Agent** - Send/reply/organize emails
2. **Drive Agent** - Create/edit/organize files
3. **Calendar Agent** - Schedule/update events

These will be NEW routes:
- `app/api/agents/gmail/send/route.ts`
- `app/api/agents/drive/create/route.ts`
- `app/api/agents/calendar/create-event/route.ts`

Clean separation, clear purpose, actual functionality.

---

## 📊 Impact

### Before Cleanup:
- 10 chat route files (9 are useless)
- 6 backup library files
- Agent mode UI that doesn't work
- 300+ lines of agent code that only searches
- Confusing, cluttered codebase

### After Cleanup:
- 1 chat route file (the working one)
- 0 backup files
- Simple, clean UI
- Focused chat functionality
- Ready for new working agents

**Lines of code removed:** ~2,000-3,000
**Files removed:** ~15
**User confusion:** Gone

---

## ⚠️ Safety

**Before deleting anything:**
1. ✅ Git commit current state
2. ✅ Verify main chat still works
3. ✅ Can always revert if needed

**We're removing:**
- Old backup files (not used)
- Non-working agent mode (confusing users)
- Search-only agents (not helpful)

**We're keeping:**
- Everything that works
- All your data
- All working features

---

Ready to execute?
