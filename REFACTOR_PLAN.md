# Front Page Refactoring Plan

## Current State Analysis
- **File**: `app/page.tsx`
- **Size**: 4,041 lines (40,114 tokens)
- **Problem**: Single monolithic component with everything inline
- **Hooks**: 61 useState/useEffect/useRef calls
- **Handlers**: 30+ inline handler functions
- **Inline Styles**: Hundreds of style objects
- **Deprecated Code**: Identified at least one deprecated function (line 610)

## Phase 1: Quick Wins (Immediate Impact)
**Goal**: Reduce file size by 20-30% without breaking functionality

### 1.1 Remove Deprecated Code
- [ ] Delete `restoreDeletedProjects()` function (line 610+)
- [ ] Remove any localStorage-based project management
- [ ] Clean up commented-out code blocks

### 1.2 Extract Utility Functions
Create `lib/chat-utils.ts`:
- [ ] `groupConversationsByDate()` - Helper function (line 111)
- [ ] `formatProjectNames()` - Helper function (line 333)
- [ ] `formatTimestamp()` - Date formatting
- [ ] `scrollToBottom()` - Message scroll logic

### 1.3 Extract Style Constants
Create `app/styles/chat-styles.ts`:
- [ ] Button styles
- [ ] Input field styles
- [ ] Modal styles
- [ ] Layout constants

**Expected Reduction**: ~500-800 lines

## Phase 2: Component Extraction
**Goal**: Break down into logical, reusable components

### 2.1 Header Components
Create `components/chat/ChatHeader.tsx`:
- User selector dropdown
- Model selector button
- New chat button
- Search button
- **Lines**: ~200

### 2.2 Sidebar Component
Create `components/chat/ConversationsSidebar.tsx`:
- Conversation list
- Date grouping
- Project filtering
- Tag filtering
- **Lines**: ~500-600

### 2.3 Message Display
Create `components/chat/MessageList.tsx`:
- Messages container
- Individual message rendering
- FormattedMessage integration
- Scroll management
- **Lines**: ~300-400

### 2.4 Input Components
Create `components/chat/ChatInput.tsx`:
- Text input area
- Send button
- File upload buttons (photo, audio)
- Drag-and-drop handling
- **Lines**: ~400

### 2.5 Upload Modals
Create `components/chat/uploads/`:
- `PhotoUploadModal.tsx` - Photo analysis UI (~200 lines)
- `AudioUploadModal.tsx` - Audio transcription UI (~300 lines)
- `BatchUploadModal.tsx` - Batch processing UI (~200 lines)

### 2.6 Project Modals
Create `components/chat/projects/`:
- `ProjectSelectorModal.tsx` - Project selection UI (~200 lines)
- `CreateProjectModal.tsx` - New project creation (~150 lines)
- `MoveToProjectModal.tsx` - Move conversation UI (~100 lines)

**Expected Reduction**: ~2,000-2,500 lines

## Phase 3: Custom Hooks
**Goal**: Extract stateful logic into reusable hooks

### 3.1 Conversation Management
Create `hooks/useConversations.ts`:
```typescript
export function useConversations(userId: string) {
  // State: conversations, loading, current conversation
  // Functions: loadConversations, selectConversation, deleteConversation
  // Returns: { conversations, loading, select, delete, ... }
}
```

### 3.2 Message Management
Create `hooks/useMessages.ts`:
```typescript
export function useMessages(conversationId: string | null) {
  // State: messages, loading, sending
  // Functions: sendMessage, loadHistory
  // Returns: { messages, send, loading, ... }
}
```

### 3.3 File Upload Hooks
Create `hooks/useFileUpload.ts`:
```typescript
export function usePhotoUpload() { ... }
export function useAudioUpload() { ... }
export function useBatchUpload() { ... }
```

### 3.4 Project Management
Create `hooks/useProjects.ts`:
```typescript
export function useProjects(userId: string) {
  // State: projects, current project
  // Functions: loadProjects, createProject, deleteProject
  // Returns: { projects, current, create, delete, ... }
}
```

**Expected Reduction**: ~800-1,000 lines

## Phase 4: Final Optimization
**Goal**: Clean architecture with < 500 lines in main page

### 4.1 Main Page Structure (Target: ~300-400 lines)
```typescript
export default function Home() {
  // Custom hooks
  const { conversations, ... } = useConversations(currentUser);
  const { messages, send } = useMessages(currentConversationId);
  const { projects } = useProjects(currentUser);

  // Render structure
  return (
    <div className="chat-layout">
      <ChatHeader {...headerProps} />
      <div className="chat-container">
        <ConversationsSidebar {...sidebarProps} />
        <div className="chat-main">
          <MessageList messages={messages} />
          <ChatInput onSend={send} {...inputProps} />
        </div>
      </div>
      {/* Modals */}
    </div>
  );
}
```

### 4.2 Final Checklist
- [ ] All components in separate files
- [ ] All hooks in separate files
- [ ] All styles extracted
- [ ] All utilities extracted
- [ ] Main page < 500 lines
- [ ] Build succeeds
- [ ] All features working
- [ ] No regressions

## Success Metrics
- **Original**: 4,041 lines
- **Target**: ~400-500 lines (90% reduction)
- **Bundle Size**: Should decrease due to better code splitting
- **Maintainability**: Each component < 300 lines
- **Reusability**: Components usable in other pages

## Rollout Strategy
1. Create all new files on a feature branch
2. Test each component individually
3. Gradually replace sections of main page
4. Final integration and testing
5. Deploy when fully verified

## Risk Mitigation
- Keep original file as `page.tsx.bak` during refactoring
- Test after each major extraction
- Use TypeScript to catch errors early
- Deploy to staging before production
