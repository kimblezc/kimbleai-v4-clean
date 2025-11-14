'use client';

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface UndoAction {
  type: 'delete-message' | 'delete-conversation' | 'delete-project';
  data: any;
  undo: () => Promise<void>;
  description: string;
}

interface UseUndoRedoOptions {
  maxHistory?: number;
  undoWindow?: number; // milliseconds before action can't be undone
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { maxHistory = 10, undoWindow = 5000 } = options;

  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const undoTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addAction = useCallback((action: UndoAction) => {
    setUndoStack(prev => {
      const newStack = [action, ...prev].slice(0, maxHistory);
      return newStack;
    });
    setRedoStack([]); // Clear redo stack when new action added

    // Show undo toast
    const toastId = toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span>{action.description}</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              undo();
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium transition-colors"
          >
            Undo
          </button>
        </div>
      ),
      {
        duration: undoWindow,
        icon: '↩️',
      }
    );

    // Auto-expire action after undo window
    const timer = setTimeout(() => {
      setUndoStack(prev => prev.filter(a => a !== action));
      undoTimers.current.delete(action.description);
    }, undoWindow);

    undoTimers.current.set(action.description, timer);

    return toastId;
  }, [maxHistory, undoWindow]);

  const undo = useCallback(async () => {
    if (undoStack.length === 0) {
      toast.error('Nothing to undo');
      return;
    }

    const action = undoStack[0];

    try {
      await action.undo();

      setUndoStack(prev => prev.slice(1));
      setRedoStack(prev => [action, ...prev].slice(0, maxHistory));

      // Clear timer
      const timer = undoTimers.current.get(action.description);
      if (timer) {
        clearTimeout(timer);
        undoTimers.current.delete(action.description);
      }

      toast.success('Action undone', { icon: '↩️' });
    } catch (error) {
      console.error('Undo failed:', error);
      toast.error('Failed to undo action');
    }
  }, [undoStack, maxHistory]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0) {
      toast.error('Nothing to redo');
      return;
    }

    const action = redoStack[0];

    try {
      // For redo, we need to re-execute the original action
      // This is a simplified version - in practice, you'd store the original action
      toast.info('Redo not yet implemented for this action');

      setRedoStack(prev => prev.slice(1));
      setUndoStack(prev => [action, ...prev].slice(0, maxHistory));
    } catch (error) {
      console.error('Redo failed:', error);
      toast.error('Failed to redo action');
    }
  }, [redoStack, maxHistory]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    // Clear all timers
    undoTimers.current.forEach(timer => clearTimeout(timer));
    undoTimers.current.clear();
  }, []);

  return {
    addAction,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    undoStack,
    redoStack,
  };
}
