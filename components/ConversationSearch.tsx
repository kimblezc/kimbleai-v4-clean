'use client';

import React, { useEffect, useRef } from 'react';
import { TouchButton, IconButton } from './TouchButton';

interface ConversationSearchProps {
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalMatches: number;
  currentMatchIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

export default function ConversationSearch({
  isOpen,
  searchQuery,
  onSearchChange,
  totalMatches,
  currentMatchIndex,
  onNext,
  onPrevious,
  onClose,
}: ConversationSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasMatches = totalMatches > 0;
  const matchText = hasMatches
    ? `${currentMatchIndex + 1} of ${totalMatches}`
    : searchQuery
    ? '0 matches'
    : '';

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        {/* Search Icon */}
        <div className="text-gray-500">
          🔍
        </div>

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search in conversation..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-base focus:outline-none focus:border-blue-500 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) {
                onPrevious();
              } else {
                onNext();
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
        />

        {/* Match Counter */}
        {searchQuery && (
          <div className="text-sm text-gray-400 min-w-[100px] text-center">
            {matchText}
          </div>
        )}

        {/* Navigation Buttons */}
        {hasMatches && (
          <>
            <IconButton
              icon={<span className="text-lg">↑</span>}
              label="Previous match (Shift+Enter)"
              onClick={onPrevious}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            />
            <IconButton
              icon={<span className="text-lg">↓</span>}
              label="Next match (Enter)"
              onClick={onNext}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            />
          </>
        )}

        {/* Close Button */}
        <IconButton
          icon={<span className="text-lg">✕</span>}
          label="Close search (Esc)"
          onClick={onClose}
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        />
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="max-w-3xl mx-auto mt-2 text-xs text-gray-600 text-center">
        Enter: Next • Shift+Enter: Previous • Esc: Close
      </div>
    </div>
  );
}
