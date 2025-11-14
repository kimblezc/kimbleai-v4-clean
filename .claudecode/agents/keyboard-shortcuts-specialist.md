# Keyboard Shortcuts Specialist Agent

**Agent Type**: Productivity & Accessibility Expert
**Focus**: Global keyboard shortcuts + Copy code buttons + Message length
**Expertise**: Keyboard event handling, accessibility, power user features

---

## Mission

Implement 30+ keyboard shortcuts, copy code buttons, and message length indicator.

---

## Tasks

### 1. Global Keyboard Shortcuts Hook (1 hour)

**File**: `hooks/useKeyboardShortcuts.ts` (NEW)

```typescript
'use client';

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
```

### 2. Implement Shortcuts in Main App (1 hour)

**File**: `app/page.tsx` or main component

```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// In component
const shortcuts = [
  {
    key: 'k',
    ctrl: true,
    callback: () => focusSearch(),
    description: 'Focus search',
  },
  {
    key: 'n',
    ctrl: true,
    callback: () => createNewConversation(),
    description: 'New conversation',
  },
  {
    key: '/',
    ctrl: true,
    callback: () => toggleSidebar(),
    description: 'Toggle sidebar',
  },
  {
    key: 'Enter',
    ctrl: true,
    callback: () => sendMessage(),
    description: 'Send message',
  },
  {
    key: 'Escape',
    callback: () => closeModals(),
    description: 'Close modals/dialogs',
  },
  {
    key: 'j',
    ctrl: true,
    callback: () => openQuickSwitcher(),
    description: 'Quick switcher',
  },
  {
    key: 'p',
    ctrl: true,
    callback: () => toggleProjectPanel(),
    description: 'Toggle projects',
  },
  {
    key: 'd',
    ctrl: true,
    shift: true,
    callback: () => toggleDarkMode(),
    description: 'Toggle dark mode',
  },
  {
    key: '?',
    callback: () => showShortcutsDialog(),
    description: 'Show keyboard shortcuts',
  },
];

useKeyboardShortcuts(shortcuts);
```

### 3. Copy Code Button (30 minutes)

**File**: `components/ui/CodeBlock.tsx` (NEW or modify existing)

```typescript
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={copyCode}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        )}
      </button>
      <pre className="bg-gray-900 p-4 rounded overflow-x-auto">
        <code className={`language-${language || 'text'}`}>{code}</code>
      </pre>
    </div>
  );
}
```

### 4. Message Length Indicator (30 minutes)

**File**: Message input component

```typescript
'use client';

import { useMemo } from 'react';

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

export function MessageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const charCount = value.length;
  const tokenEstimate = useMemo(() => estimateTokens(value), [value]);
  const isLong = charCount > 2000;

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 bg-gray-800 rounded"
        placeholder="Type your message..."
      />

      {/* Length indicator */}
      <div className={`absolute bottom-2 right-2 text-xs ${isLong ? 'text-yellow-400' : 'text-gray-500'}`}>
        {charCount} chars • ~{tokenEstimate} tokens
        {isLong && <span className="ml-2">⚠️ Long message</span>}
      </div>
    </div>
  );
}
```

### 5. Keyboard Shortcuts Dialog (30 minutes)

**File**: `components/KeyboardShortcutsDialog.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';

const SHORTCUTS = [
  { key: 'Cmd/Ctrl + K', description: 'Focus search' },
  { key: 'Cmd/Ctrl + N', description: 'New conversation' },
  { key: 'Cmd/Ctrl + /', description: 'Toggle sidebar' },
  { key: 'Cmd/Ctrl + Enter', description: 'Send message' },
  { key: 'Esc', description: 'Close modals' },
  { key: 'Cmd/Ctrl + J', description: 'Quick switcher' },
  { key: 'Cmd/Ctrl + P', description: 'Toggle projects' },
  { key: 'Cmd/Ctrl + Shift + D', description: 'Toggle dark mode' },
  { key: '?', description: 'Show this dialog' },
];

export function KeyboardShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>

        <div className="space-y-2">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{shortcut.key}</kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

---

## Success Criteria

- [ ] 30+ keyboard shortcuts implemented
- [ ] Shortcuts work globally
- [ ] Copy code button on all code blocks
- [ ] Message length indicator shows chars + tokens
- [ ] Warning at 2000+ characters
- [ ] Shortcuts dialog accessible via ?

---

**Total Time**: 3 hours
**Lines Added**: ~400
