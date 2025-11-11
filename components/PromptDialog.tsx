'use client';

import { useState, useEffect, useRef } from 'react';
import { TouchButton } from './TouchButton';
import { triggerHaptic, HapticPattern } from '@/lib/haptics';
import { useSwipe } from '@/hooks/useSwipe';

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  validate?: (value: string) => boolean | string; // true = valid, string = error message, false = invalid
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  placeholder = '',
  initialValue = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  validate,
  onConfirm,
  onCancel
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string>('');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError('');
      setSwipeOffset(0);
      // Trigger haptic feedback when dialog opens
      triggerHaptic(HapticPattern.MEDIUM);
      // Focus input after a short delay to ensure mobile keyboard appears
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialValue]);

  // Swipe to dismiss (downward swipe on mobile)
  const swipeHandlers = useSwipe(
    {
      onSwipeDown: () => {
        triggerHaptic(HapticPattern.LIGHT);
        onCancel();
      },
      onSwipeProgress: (_, deltaY) => {
        if (deltaY > 0) {
          setSwipeOffset(deltaY);
        }
      },
      onSwipeCancel: () => {
        setSwipeOffset(0);
      },
    },
    {
      threshold: 100,
      trackProgress: true,
    }
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Validate if validator provided
    if (validate) {
      const result = validate(value);
      if (result === false) {
        setError('Invalid input');
        triggerHaptic(HapticPattern.ERROR);
        return;
      }
      if (typeof result === 'string') {
        setError(result);
        triggerHaptic(HapticPattern.ERROR);
        return;
      }
    }

    // Clear error and confirm
    setError('');
    triggerHaptic(HapticPattern.SUCCESS);
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    warning: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800',
    info: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        {...swipeHandlers}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-slide-up transition-transform"
        style={{ transform: `translateY(${swipeOffset}px)`, opacity: Math.max(0.3, 1 - swipeOffset / 200) }}
      >
        {/* Swipe indicator (mobile only) */}
        <div className="sm:hidden w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />

        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>

        {message && (
          <p className="text-gray-300 mb-4 whitespace-pre-line leading-relaxed">
            {message}
          </p>
        )}

        {/* Input field - mobile optimized */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(''); // Clear error on input
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-base"
          style={{
            // Prevent mobile zoom on iOS by using 16px font size
            fontSize: '16px',
            // Ensure minimum touch target height
            minHeight: '44px'
          }}
        />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <TouchButton
            onClick={onCancel}
            variant="ghost"
            fullWidth
            size="md"
          >
            {cancelText}
          </TouchButton>
          <TouchButton
            onClick={handleConfirm}
            className={variantStyles[variant]}
            fullWidth
            size="md"
            disabled={!value.trim()}
          >
            {confirmText}
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
