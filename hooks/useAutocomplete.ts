import { useState, useMemo, useCallback, useEffect } from 'react';

export interface AutocompleteSuggestion {
  id: string;
  label: string;
  value: string;
  description?: string;
  type: 'project' | 'file' | 'tag' | 'command';
  icon?: string;
}

export interface SlashCommand {
  command: string;
  description: string;
  action: () => void;
}

export function useAutocomplete(
  input: string,
  cursorPosition: number,
  options: {
    projects?: Array<{ id: string; name: string }>;
    tags?: string[];
    files?: Array<{ id: string; name: string; path?: string }>;
    commands?: SlashCommand[];
  }
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { projects = [], tags = [], files = [], commands = [] } = options;

  // Detect trigger character and search query
  const { trigger, query, startPos } = useMemo(() => {
    const textBeforeCursor = input.substring(0, cursorPosition);

    // Check for @ (mentions)
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      return {
        trigger: '@' as const,
        query: atMatch[1],
        startPos: textBeforeCursor.lastIndexOf('@'),
      };
    }

    // Check for / (commands)
    const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
    if (slashMatch) {
      return {
        trigger: '/' as const,
        query: slashMatch[1],
        startPos: textBeforeCursor.lastIndexOf('/'),
      };
    }

    // Check for # (tags)
    const hashMatch = textBeforeCursor.match(/#(\w*)$/);
    if (hashMatch) {
      return {
        trigger: '#' as const,
        query: hashMatch[1],
        startPos: textBeforeCursor.lastIndexOf('#'),
      };
    }

    return { trigger: null, query: '', startPos: -1 };
  }, [input, cursorPosition]);

  // Generate suggestions based on trigger and query
  const suggestions = useMemo<AutocompleteSuggestion[]>(() => {
    if (!trigger) return [];

    const lowerQuery = query.toLowerCase();

    if (trigger === '@') {
      // Project and file mentions
      const projectSuggestions: AutocompleteSuggestion[] = projects
        .filter((p) => p.name.toLowerCase().includes(lowerQuery))
        .map((p) => ({
          id: `project-${p.id}`,
          label: p.name,
          value: `@${p.name}`,
          type: 'project' as const,
          description: 'Project',
          icon: '📁',
        }));

      const fileSuggestions: AutocompleteSuggestion[] = files
        .filter((f) => f.name.toLowerCase().includes(lowerQuery))
        .map((f) => ({
          id: `file-${f.id}`,
          label: f.name,
          value: `@${f.name}`,
          type: 'file' as const,
          description: f.path || 'File',
          icon: '📄',
        }));

      return [...projectSuggestions, ...fileSuggestions];
    }

    if (trigger === '/') {
      // Slash commands
      return commands
        .filter((c) => c.command.toLowerCase().includes(lowerQuery))
        .map((c) => ({
          id: `command-${c.command}`,
          label: c.command,
          value: `/${c.command}`,
          type: 'command' as const,
          description: c.description,
          icon: '⚡',
        }));
    }

    if (trigger === '#') {
      // Tags
      return tags
        .filter((t) => t.toLowerCase().includes(lowerQuery))
        .map((t) => ({
          id: `tag-${t}`,
          label: t,
          value: `#${t}`,
          type: 'tag' as const,
          description: 'Tag',
          icon: '🏷️',
        }));
    }

    return [];
  }, [trigger, query, projects, files, tags, commands]);

  const isActive = suggestions.length > 0;

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Navigate suggestions
  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % suggestions.length);
  }, [suggestions.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
  }, [suggestions.length]);

  // Apply selected suggestion
  const applySuggestion = useCallback(
    (index?: number) => {
      const suggestionIndex = index !== undefined ? index : selectedIndex;
      const suggestion = suggestions[suggestionIndex];
      if (!suggestion) return null;

      // Replace the trigger and query with the full value
      const before = input.substring(0, startPos);
      const after = input.substring(cursorPosition);
      const newInput = before + suggestion.value + ' ' + after;
      const newCursorPosition = before.length + suggestion.value.length + 1;

      return {
        newInput,
        newCursorPosition,
        suggestion,
      };
    },
    [selectedIndex, suggestions, input, startPos, cursorPosition]
  );

  return {
    isActive,
    trigger,
    query,
    suggestions,
    selectedIndex,
    selectNext,
    selectPrevious,
    applySuggestion,
  };
}
