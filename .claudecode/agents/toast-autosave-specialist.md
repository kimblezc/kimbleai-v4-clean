# Toast & Autosave Specialist Agent

**Agent Type**: UX Feedback & Data Persistence Expert
**Focus**: Toast notifications + Autosave functionality
**Expertise**: User feedback systems, localStorage, react-hot-toast

---

## Mission

Implement comprehensive toast notification system and autosave functionality for KimbleAI.

---

## Phase 1: Toast Notifications (2 hours)

### Task 1: Enable Toaster Component

**File**: `app/providers.tsx`

```typescript
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            duration: 7000,
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}
```

### Task 2: Add Toasts to Message Sending

**File**: `hooks/useMessages.ts` (line ~234)

```typescript
import toast from 'react-hot-toast';

// In sendMessage function
try {
  // ... existing code ...

  if (!response.ok) {
    toast.error('Failed to send message');
    throw new Error(`HTTP ${response.status}`);
  }

  toast.success('Message sent');

} catch (error) {
  console.error('Error sending message:', error);
  toast.error('Failed to send message');
}
```

### Task 3: Add Toasts to File Upload

**File**: `components/FileUploader.tsx` (line ~428)

```typescript
import toast from 'react-hot-toast';

// In upload handler
const uploadToast = toast.loading('Uploading file...');

try {
  // ... upload logic ...

  toast.success('File uploaded successfully', { id: uploadToast });
} catch (error) {
  toast.error('Upload failed', { id: uploadToast });
}
```

### Task 4: Add Toasts to Google APIs

**Files**:
- `app/api/google/drive/route.ts`
- `app/api/google/gmail/route.ts`
- `app/api/google/calendar/route.ts`

Add client-side toast calls when these APIs are invoked.

### Task 5: Add Toasts to Projects

**File**: `hooks/useProjects.ts` (line ~223)

```typescript
import toast from 'react-hot-toast';

// In createProject
toast.success(`Project "${name}" created`);

// In deleteProject
toast.success('Project deleted');

// In updateProject
toast.success('Project updated');
```

### Task 6: Add Toasts to Conversations

**File**: `hooks/useConversations.ts` (line ~216)

```typescript
import toast from 'react-hot-toast';

// In deleteConversation
toast.success('Conversation deleted');

// In createConversation
toast.success('New conversation created');
```

---

## Phase 2: Autosave (1.5 hours)

### Task 1: Create Autosave Hook

**File**: `hooks/useAutosave.ts` (NEW)

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseAutosaveOptions {
  key: string;
  value: string;
  delay?: number; // milliseconds
  showToast?: boolean;
}

export function useAutosave({ key, value, delay = 2000, showToast = false }: UseAutosaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousValueRef = useRef<string>(value);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only save if value changed
    if (value !== previousValueRef.current && value.trim()) {
      timeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(key, value);
          previousValueRef.current = value;

          if (showToast) {
            toast('Draft saved', {
              icon: '💾',
              duration: 2000,
              position: 'bottom-right',
            });
          }
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay, showToast]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
      previousValueRef.current = '';
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [key]);

  const loadDraft = useCallback((): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }, [key]);

  return { clearDraft, loadDraft };
}
```

### Task 2: Integrate Autosave in Chat

**File**: `app/page.tsx` or main chat component

```typescript
import { useAutosave } from '@/hooks/useAutosave';

// In component
const [input, setInput] = useState('');
const { clearDraft, loadDraft } = useAutosave({
  key: `chat-draft-${conversationId}`,
  value: input,
  delay: 2000,
  showToast: false, // Don't show toast for every autosave
});

// Load draft on mount
useEffect(() => {
  const draft = loadDraft();
  if (draft) {
    setInput(draft);
    toast('Draft restored', { icon: '📝' });
  }
}, [conversationId]);

// Clear draft after sending
const handleSend = async () => {
  // ... send logic ...
  clearDraft();
};
```

---

## Success Criteria

**Toasts:**
- [ ] Toaster component rendered in app
- [ ] 50+ toast calls across app
- [ ] Message send/receive toasts
- [ ] File upload toasts
- [ ] Google API toasts
- [ ] Project CRUD toasts
- [ ] Conversation CRUD toasts

**Autosave:**
- [ ] useAutosave hook created
- [ ] Chat input autosaves every 2 seconds
- [ ] Draft restores on page load
- [ ] Draft clears after sending
- [ ] "Draft saved" indicator (optional)

---

## Testing

1. Send message → See "Message sent" toast
2. Upload file → See "Uploading..." → "File uploaded"
3. Type message, refresh page → Draft restored
4. Create project → See "Project created" toast
5. Delete conversation → See "Conversation deleted" toast

---

**Total Time**: 3.5 hours
**Lines Added**: ~300
**Impact**: Massive UX improvement
