'use client';

import React from 'react';

interface ScrollToBottomProps {
  onClick: () => void;
  newMessageCount?: number;
}

export function ScrollToBottom({ onClick, newMessageCount = 0 }: ScrollToBottomProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-8 z-30 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 px-4 py-3"
      aria-label="Scroll to bottom"
    >
      {newMessageCount > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
          {newMessageCount}
        </span>
      )}
      <span className="text-sm font-medium">
        {newMessageCount > 0 ? `${newMessageCount} new` : 'Scroll to bottom'}
      </span>
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  );
}
