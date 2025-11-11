// lib/haptics.ts
// Haptic feedback utility for mobile devices

/**
 * Haptic feedback patterns for different interactions
 */
export enum HapticPattern {
  /** Light tap - button press, toggle */
  LIGHT = 'light',
  /** Medium tap - modal open/close, selection */
  MEDIUM = 'medium',
  /** Heavy tap - important action, confirmation */
  HEAVY = 'heavy',
  /** Error pattern - validation failure, warning */
  ERROR = 'error',
  /** Success pattern - action completed */
  SUCCESS = 'success',
}

/**
 * Check if haptic feedback is supported on this device
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback with specified pattern
 * @param pattern The haptic pattern to trigger
 */
export function triggerHaptic(pattern: HapticPattern): void {
  if (!isHapticSupported()) {
    return;
  }

  try {
    switch (pattern) {
      case HapticPattern.LIGHT:
        navigator.vibrate(10);
        break;
      case HapticPattern.MEDIUM:
        navigator.vibrate(20);
        break;
      case HapticPattern.HEAVY:
        navigator.vibrate(30);
        break;
      case HapticPattern.ERROR:
        // Two short bursts for error
        navigator.vibrate([50, 100, 50]);
        break;
      case HapticPattern.SUCCESS:
        // Quick double tap for success
        navigator.vibrate([20, 50, 20]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch (error) {
    // Silently fail if vibration API throws error
    console.debug('Haptic feedback failed:', error);
  }
}

/**
 * React hook for haptic feedback
 * @returns Object with haptic trigger function and support check
 */
export function useHaptics() {
  const supported = isHapticSupported();

  return {
    trigger: triggerHaptic,
    supported,
  };
}

/**
 * Custom haptic pattern with specific durations
 * @param pattern Array of vibration durations in milliseconds [vibrate, pause, vibrate, ...]
 */
export function triggerCustomHaptic(pattern: number[]): void {
  if (!isHapticSupported()) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.debug('Custom haptic feedback failed:', error);
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic(): void {
  if (!isHapticSupported()) {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch (error) {
    console.debug('Stop haptic failed:', error);
  }
}
