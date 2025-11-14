'use client';

import { useEffect } from 'react';
import { KeyboardShortcut, getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

/**
 * Keyboard shortcuts dialog
 * Shows all available shortcuts organized by category
 * Accessible via ? key or menu button
 */
export function KeyboardShortcutsDialog({ open, onClose, shortcuts }: KeyboardShortcutsDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  // Define category order
  const categoryOrder = ['Navigation', 'Actions', 'Editing', 'View', 'General'];
  const sortedCategories = categoryOrder.filter(cat => groupedShortcuts[cat]);
  const otherCategories = Object.keys(groupedShortcuts).filter(cat => !categoryOrder.includes(cat));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto pointer-events-auto animate-slide-up shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-400 mt-1">
                Power user tips for faster navigation
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Shortcuts List */}
          <div className="space-y-6">
            {[...sortedCategories, ...otherCategories].map((category) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {groupedShortcuts[category].map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-gray-300 text-base">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono text-white shadow-sm">
                        {getShortcutDisplay(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Tip: Press <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">?</kbd> anytime to view this dialog
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
