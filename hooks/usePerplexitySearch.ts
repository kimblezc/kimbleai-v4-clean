/**
 * Perplexity Search Hook
 * AI-powered web search with citations
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface Citation {
  url: string;
  title: string;
  snippet: string;
}

interface SearchResult {
  answer: string;
  citations: Citation[];
  relatedQuestions?: string[];
  metadata: {
    model: string;
    processingTime: number;
    cost: number;
    searchesPerformed: number;
    citationCount: number;
  };
}

interface SearchState {
  result: SearchResult | null;
  isSearching: boolean;
  error: string | null;
}

export function usePerplexitySearch(userId: string = 'zach') {
  const [state, setState] = useState<SearchState>({
    result: null,
    isSearching: false,
    error: null,
  });

  const search = useCallback(
    async (query: string, model: 'sonar' | 'sonar-pro' | 'sonar-reasoning' = 'sonar-pro') => {
      if (!query.trim()) {
        toast.error('Please enter a search query');
        return null;
      }

      setState({ result: null, isSearching: true, error: null });

      try {
        console.log(`[PerplexitySearch] Searching: "${query.substring(0, 50)}..."`);

        const response = await fetch('/api/search/perplexity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            userId,
            model,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Search failed');
        }

        const data = await response.json();

        setState({
          result: {
            answer: data.answer,
            citations: data.citations,
            relatedQuestions: data.relatedQuestions,
            metadata: data.metadata,
          },
          isSearching: false,
          error: null,
        });

        console.log(
          `[PerplexitySearch] Success: ${data.citations.length} citations, $${data.metadata.cost.toFixed(4)}`
        );

        return data;
      } catch (error: any) {
        console.error('[PerplexitySearch] Error:', error);
        const errorMessage = error.message || 'Search failed';

        setState({
          result: null,
          isSearching: false,
          error: errorMessage,
        });

        toast.error(errorMessage);
        return null;
      }
    },
    [userId]
  );

  const clearResults = useCallback(() => {
    setState({
      result: null,
      isSearching: false,
      error: null,
    });
  }, []);

  return {
    search,
    clearResults,
    result: state.result,
    isSearching: state.isSearching,
    error: state.error,
  };
}
