import { useState, useMemo, useCallback } from 'react';
import { Message } from './useMessages';

export interface SearchMatch {
  messageIndex: number;
  matchIndex: number;
}

export function useMessageSearch(messages: Message[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Find all matches across all messages
  const matches = useMemo<SearchMatch[]>(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const foundMatches: SearchMatch[] = [];

    messages.forEach((message, messageIndex) => {
      const content = message.content.toLowerCase();
      let startIndex = 0;
      let matchIndex = 0;

      while (true) {
        const index = content.indexOf(query, startIndex);
        if (index === -1) break;

        foundMatches.push({ messageIndex, matchIndex });
        startIndex = index + 1;
        matchIndex++;
      }
    });

    return foundMatches;
  }, [messages, searchQuery]);

  const totalMatches = matches.length;
  const hasMatches = totalMatches > 0;

  // Get current match
  const currentMatch = useMemo(() => {
    if (!hasMatches) return null;
    return matches[currentMatchIndex];
  }, [matches, currentMatchIndex, hasMatches]);

  // Navigate to next match
  const nextMatch = useCallback(() => {
    if (!hasMatches) return;
    setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
  }, [hasMatches, totalMatches]);

  // Navigate to previous match
  const previousMatch = useCallback(() => {
    if (!hasMatches) return;
    setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  }, [hasMatches, totalMatches]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentMatchIndex(0);
  }, []);

  // Update search query
  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentMatchIndex(0);
  }, []);

  return {
    searchQuery,
    updateSearchQuery,
    matches,
    totalMatches,
    currentMatchIndex,
    currentMatch,
    hasMatches,
    nextMatch,
    previousMatch,
    clearSearch,
  };
}
