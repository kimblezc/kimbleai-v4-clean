'use client';

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
  category?: string;
}

/**
 * Global keyboard shortcuts hook
 * Handles both Ctrl (Windows) and Cmd (Mac) keys automatically
 * Prevents default browser behavior for registered shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input or textarea (unless explicitly handled)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      for (const shortcut of shortcuts) {
        // Match modifier keys
        const ctrlMatch = shortcut.ctrl
          ? (e.ctrlKey || e.metaKey) // Support both Ctrl (Windows) and Cmd (Mac)
          : !e.ctrlKey && !e.metaKey;

        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        // Match key (case-insensitive)
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        // If all conditions match
        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          // For shortcuts that should work in input fields (like Ctrl+Enter)
          const allowInInput = shortcut.key === 'Enter' && shortcut.ctrl;

          // Skip if typing and not explicitly allowed
          if (isInputField && !allowInInput && shortcut.ctrl) {
            // Allow navigation shortcuts even in input fields
            if (['k', 'n', 'j', 'p', '/'].includes(shortcut.key.toLowerCase())) {
              e.preventDefault();
              shortcut.callback();
              break;
            }
          } else {
            // Prevent default browser behavior and execute callback
            e.preventDefault();
            shortcut.callback();
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Helper to get keyboard shortcut display string
 * Automatically shows Cmd for Mac, Ctrl for Windows
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(isMac ? 'Cmd' : 'Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push(isMac ? 'Option' : 'Alt');

  // Capitalize key names
  const keyDisplay = shortcut.key === 'Enter' ? 'Enter'
    : shortcut.key === 'Escape' ? 'Esc'
    : shortcut.key.length === 1 ? shortcut.key.toUpperCase()
    : shortcut.key;

  parts.push(keyDisplay);

  return parts.join(' + ');
}
