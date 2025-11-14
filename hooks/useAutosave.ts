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
