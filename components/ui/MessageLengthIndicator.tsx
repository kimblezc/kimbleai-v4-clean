'use client';

import { useMemo } from 'react';

interface MessageLengthIndicatorProps {
  text: string;
  warningThreshold?: number; // Default 2000 characters
  className?: string;
}

/**
 * Estimates token count from text
 * Rule of thumb: ~4 characters per token for English text
 * This is a rough estimate - actual tokenization varies by model
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Message length indicator component
 * Shows character count and estimated token count
 * Warns users when message exceeds threshold
 */
export function MessageLengthIndicator({
  text,
  warningThreshold = 2000,
  className = '',
}: MessageLengthIndicatorProps) {
  const charCount = text.length;
  const tokenEstimate = useMemo(() => estimateTokens(text), [text]);
  const isLong = charCount > warningThreshold;
  const isVeryLong = charCount > warningThreshold * 2; // 4000+ chars

  // Don't show anything for empty messages
  if (charCount === 0) {
    return null;
  }

  // Determine color based on length
  const getColor = () => {
    if (isVeryLong) return 'text-red-400';
    if (isLong) return 'text-yellow-400';
    return 'text-gray-500';
  };

  const getWarningIcon = () => {
    if (isVeryLong) return '⚠️';
    if (isLong) return '⚠️';
    return null;
  };

  const getWarningText = () => {
    if (isVeryLong) return 'Very long message';
    if (isLong) return 'Long message';
    return null;
  };

  return (
    <div className={`flex items-center gap-2 text-xs ${getColor()} ${className}`}>
      <span className="font-mono">
        {charCount.toLocaleString()} chars • ~{tokenEstimate.toLocaleString()} tokens
      </span>
      {getWarningIcon() && (
        <span className="flex items-center gap-1">
          <span>{getWarningIcon()}</span>
          <span className="font-medium">{getWarningText()}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Helper hook to get message stats
 */
export function useMessageStats(text: string) {
  return useMemo(() => {
    const charCount = text.length;
    const tokenEstimate = estimateTokens(text);
    const isLong = charCount > 2000;
    const isVeryLong = charCount > 4000;

    return {
      charCount,
      tokenEstimate,
      isLong,
      isVeryLong,
    };
  }, [text]);
}
