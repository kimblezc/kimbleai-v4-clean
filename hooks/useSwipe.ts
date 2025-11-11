// hooks/useSwipe.ts
// Custom hook for swipe gestures on mobile

import { useRef, useCallback, TouchEvent } from 'react';

export interface SwipeConfig {
  /** Minimum distance in pixels to trigger swipe (default: 50) */
  threshold?: number;
  /** Prevent default touch behavior (default: false) */
  preventDefault?: boolean;
  /** Track swipe progress (default: false) */
  trackProgress?: boolean;
}

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Called during swipe with distance and direction */
  onSwipeProgress?: (deltaX: number, deltaY: number, direction: SwipeDirection | null) => void;
  /** Called when swipe ends without meeting threshold */
  onSwipeCancel?: () => void;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

/**
 * Custom hook for swipe gesture detection
 * @param callbacks Swipe event callbacks
 * @param config Swipe configuration
 * @returns Touch event handlers to spread on element
 */
export function useSwipe(
  callbacks: SwipeCallbacks,
  config: SwipeConfig = {}
): SwipeHandlers {
  const {
    threshold = 50,
    preventDefault = false,
    trackProgress = false,
  } = config;

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchCurrent = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    touchCurrent.current = { x: touch.clientX, y: touch.clientY };

    if (preventDefault) {
      e.preventDefault();
    }
  }, [preventDefault]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.touches[0];
    touchCurrent.current = { x: touch.clientX, y: touch.clientY };

    if (trackProgress && callbacks.onSwipeProgress) {
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;

      // Determine primary direction
      let direction: SwipeDirection | null = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else if (Math.abs(deltaY) > threshold / 2) {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      callbacks.onSwipeProgress(deltaX, deltaY, direction);
    }

    if (preventDefault) {
      e.preventDefault();
    }
  }, [trackProgress, callbacks, preventDefault, threshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current || !touchCurrent.current) return;

    const deltaX = touchCurrent.current.x - touchStart.current.x;
    const deltaY = touchCurrent.current.y - touchStart.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine if swipe threshold was met
    const thresholdMet = absX > threshold || absY > threshold;

    if (thresholdMet) {
      // Horizontal swipe (X > Y)
      if (absX > absY) {
        if (deltaX > 0 && callbacks.onSwipeRight) {
          callbacks.onSwipeRight();
        } else if (deltaX < 0 && callbacks.onSwipeLeft) {
          callbacks.onSwipeLeft();
        }
      }
      // Vertical swipe (Y > X)
      else {
        if (deltaY > 0 && callbacks.onSwipeDown) {
          callbacks.onSwipeDown();
        } else if (deltaY < 0 && callbacks.onSwipeUp) {
          callbacks.onSwipeUp();
        }
      }
    } else {
      // Swipe cancelled (didn't meet threshold)
      if (callbacks.onSwipeCancel) {
        callbacks.onSwipeCancel();
      }
    }

    // Reset touch tracking
    touchStart.current = null;
    touchCurrent.current = null;

    if (preventDefault) {
      e.preventDefault();
    }
  }, [threshold, callbacks, preventDefault]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook specifically for swipe-to-dismiss modals
 * @param onDismiss Callback when swipe-to-dismiss succeeds
 * @param threshold Minimum swipe distance (default: 100px)
 * @returns Swipe handlers and progress value (0-1)
 */
export function useSwipeToDismiss(
  onDismiss: () => void,
  threshold: number = 100
) {
  const progressRef = useRef(0);

  const swipeHandlers = useSwipe(
    {
      onSwipeDown: onDismiss,
      onSwipeProgress: (_, deltaY) => {
        // Track downward swipe progress
        if (deltaY > 0) {
          progressRef.current = Math.min(deltaY / threshold, 1);
        }
      },
      onSwipeCancel: () => {
        progressRef.current = 0;
      },
    },
    {
      threshold,
      trackProgress: true,
    }
  );

  return {
    ...swipeHandlers,
    progress: progressRef.current,
  };
}
