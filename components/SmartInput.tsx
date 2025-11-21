'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useAutocomplete, AutocompleteSuggestion, SlashCommand } from '@/hooks/useAutocomplete';
import { useVoiceInput, VOICE_LANGUAGES, VoiceLanguage } from '@/hooks/useVoiceInput';
import toast from 'react-hot-toast';

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
  enableVoiceInput?: boolean;
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
  enableVoiceInput = true,
}: SmartInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

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

  // Voice input integration with advanced features
  const voiceInput = useVoiceInput({
    continuous: true,
    interimResults: true,
    enableCommands: true,
    enablePunctuation: true,
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        // Append final transcript to input
        onChange(value + transcript + ' ');
      }
    },
    onCommand: (command) => {
      // Handle voice commands
      switch (command) {
        case 'send':
          onSubmit();
          voiceInput.stopListening();
          toast.success('Message sent!');
          break;
        case 'newLine':
          onChange(value + '\n');
          break;
        case 'clear':
          onChange('');
          toast.success('Text cleared');
          break;
        case 'undo':
          // Simple undo - remove last word
          const words = value.trim().split(/\s+/);
          words.pop();
          onChange(words.join(' ') + ' ');
          break;
        case 'stop':
          voiceInput.stopListening();
          toast.success('Voice input stopped');
          break;
      }
    },
  });

  // Show error toast when voice input fails
  useEffect(() => {
    if (voiceInput.error) {
      toast.error(voiceInput.error);
    }
  }, [voiceInput.error]);

  // Handle voice button click
  const handleVoiceToggle = () => {
    if (voiceInput.isListening) {
      voiceInput.stopListening();
      toast.success('Voice input stopped');
    } else {
      voiceInput.clearTranscript();
      voiceInput.startListening();
      toast.success(`Voice input started (${voiceInput.language}) - speak now!`);
    }
  };

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
      {/* Audio Level Visualization - appears above input when listening */}
      {voiceInput.isListening && voiceInput.audioLevel > 0 && (
        <div className="absolute -top-8 left-0 right-0 h-6 flex items-center gap-2 px-4">
          <span className="text-xs text-gray-500 flex-shrink-0">Volume:</span>
          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-red-600 transition-all duration-100 rounded-full"
              style={{ width: `${voiceInput.audioLevel}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0 w-8 text-right">
            {voiceInput.audioLevel}%
          </span>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={inputRef as any}
          value={value + (voiceInput.isListening ? voiceInput.interimTranscript : '')}
          onChange={(e) => {
            onChange(e.target.value);
            setCursorPosition(e.target.selectionStart || 0);
          }}
          onKeyDown={handleKeyDown as any}
          onClick={(e) => {
            setCursorPosition(e.currentTarget.selectionStart || 0);
          }}
          placeholder={placeholder}
          disabled={disabled || voiceInput.isListening}
          rows={2}
          className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-base focus:outline-none transition-colors resize-none ${
            voiceInput.isListening
              ? 'border-red-500 bg-red-950/20'
              : 'border-gray-700 focus:border-blue-500'
          } ${enableVoiceInput ? 'pr-24' : ''}`}
          style={{ minHeight: '72px' }}
        />

        {/* Voice Input Controls */}
        {enableVoiceInput && voiceInput.isSupported && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Language Selector Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                disabled={disabled || voiceInput.isListening}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change voice language"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </button>

              {/* Language Selector Dropdown */}
              {showLanguageSelector && (
                <div className="absolute bottom-full right-0 mb-2 w-64 max-h-80 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                  <div className="p-2 border-b border-gray-800">
                    <div className="text-xs font-medium text-gray-400 uppercase">Voice Language</div>
                  </div>
                  <div className="p-1">
                    {Object.entries(VOICE_LANGUAGES).map(([code, name]) => (
                      <button
                        key={code}
                        onClick={() => {
                          voiceInput.setLanguage(code as VoiceLanguage);
                          setShowLanguageSelector(false);
                          toast.success(`Language changed to ${name}`);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                          voiceInput.language === code
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {name}
                        {voiceInput.language === code && (
                          <span className="ml-2 text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={disabled}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
                voiceInput.isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={voiceInput.isListening ? 'Stop voice input' : 'Start voice input'}
            >
              {voiceInput.isListening ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="4" width="8" height="12" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

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
