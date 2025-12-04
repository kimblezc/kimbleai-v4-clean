'use client';

import { useEffect, useState } from 'react';
import { TouchButton } from './TouchButton';
import { triggerHaptic, HapticPattern } from '@/lib/haptics';
import { useSwipe } from '@/hooks/useSwipe';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Trigger haptic feedback when dialog opens
  useEffect(() => {
    if (isOpen) {
      triggerHaptic(variant === 'danger' ? HapticPattern.HEAVY : HapticPattern.MEDIUM);
      setSwipeOffset(0);
    }
  }, [isOpen, variant]);

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

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    warning: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800',
    info: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' }}
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
        <p className="text-gray-300 mb-6 whitespace-pre-line leading-relaxed">
          {message}
        </p>

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
            onClick={onConfirm}
            className={variantStyles[variant]}
            fullWidth
            size="md"
          >
            {confirmText}
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
