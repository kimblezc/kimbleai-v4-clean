'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useAutocomplete, AutocompleteSuggestion, SlashCommand } from '@/hooks/useAutocomplete';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  projects?: Array<{ id: string; name: string }>;
  tags?: string[];
  files?: Array<{ id: string; name: string; path?: string }>;
  commands?: SlashCommand[];
}

export default function SmartInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type @ for mentions, / for commands, # for tags...',
  disabled = false,
  projects = [],
  tags = [],
  files = [],
  commands = [],
}: SmartInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const autocomplete = useAutocomplete(value, cursorPosition, {
    projects,
    tags,
    files,
    commands,
  });

  const {
    isActive,
    suggestions,
    selectedIndex,
    selectNext,
    selectPrevious,
    applySuggestion,
  } = autocomplete;

  // Update cursor position on input change
  useEffect(() => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isActive) {
      // Handle autocomplete navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNext();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevious();
        return;
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        if (isActive && suggestions.length > 0) {
          e.preventDefault();
          const result = applySuggestion();
          if (result) {
            onChange(result.newInput);
            // Set cursor position after update
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.setSelectionRange(
                  result.newCursorPosition,
                  result.newCursorPosition
                );
              }
            }, 0);
          }
          return;
        }
      }

      if (e.key === 'Escape') {
        // Close autocomplete (suggestions will disappear when we clear the trigger)
        e.preventDefault();
        return;
      }
    }

    // Normal input handling
    if (e.key === 'Enter' && !e.shiftKey && !isActive) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleSuggestionClick = (index: number) => {
    const result = applySuggestion(index);
    if (result) {
      onChange(result.newInput);
      // Focus input and set cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(
            result.newCursorPosition,
            result.newCursorPosition
          );
        }
      }, 0);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={inputRef as any}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPosition(e.target.selectionStart || 0);
        }}
        onKeyDown={handleKeyDown as any}
        onClick={(e) => {
          setCursorPosition(e.currentTarget.selectionStart || 0);
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-base focus:outline-none focus:border-blue-500 transition-colors resize-none"
        style={{ minHeight: '72px' }}
      />

      {/* Autocomplete Dropdown */}
      {isActive && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-[300px] overflow-y-auto z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(index)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-b border-gray-800 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {/* Icon */}
              {suggestion.icon && (
                <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
              )}

              {/* Label and Description */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium truncate">
                  {suggestion.label}
                </div>
                {suggestion.description && (
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.description}
                  </div>
                )}
              </div>

              {/* Type Badge */}
              <div className="text-xs text-gray-600 capitalize flex-shrink-0">
                {suggestion.type}
              </div>
            </button>
          ))}

          {/* Footer with keyboard hints */}
          <div className="px-4 py-2 bg-gray-950 border-t border-gray-800 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>↑↓ Navigate</span>
              <span>Tab/Enter Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
