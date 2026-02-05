# KimbleAI Tasks

## Development Workflow (MUST FOLLOW)

```
1. READ LOGS FIRST → 2. FIX → 3. TEST LOCAL → 4. DEPLOY → 5. TEST DEPLOYED → 6. DEBUG/FIX → 7. ITERATE
```

**Do not stop until the feature works in production.**

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
**Status:** Pending
**File:** `components/chat/MessageList.tsx`, `app/api/chat/route.ts`

Display which AI model was used for each response to verify smart routing works.

---

### Task 7: Test File Uploads & Analysis
**Status:** Pending

Verify file upload and analysis functionality works correctly.

---

### Task 8: Test Image Analysis
**Status:** Pending

Confirm image upload and vision analysis works.

---

### Task 9: Test Transcription
**Status:** Pending

Verify audio transcription feature works.

---

### Task 10: Google Integration
**Status:** Pending

Ensure Google integration works:
- Gmail
- Drive
- Calendar
