/**
 * Search Results Component
 * Displays Perplexity AI search results with citations
 * Ultra-minimalist dark design
 */

'use client';

import React from 'react';

interface Citation {
  url: string;
  title: string;
  snippet: string;
}

interface SearchResultsProps {
  answer: string;
  citations: Citation[];
  relatedQuestions?: string[];
  cost: number;
  onRelatedQuestionClick?: (question: string) => void;
}

export default function SearchResults({
  answer,
  citations,
  relatedQuestions,
  cost,
  onRelatedQuestionClick,
}: SearchResultsProps) {
  return (
    <div className="space-y-4">
      {/* Answer */}
      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
        {answer}
      </div>

      {/* Citations */}
      {citations.length > 0 && (
        <div className="border-t border-gray-800 pt-3 mt-3">
          <div className="text-xs text-gray-500 font-mono mb-2">SOURCES ({citations.length})</div>
          <div className="space-y-1">
            {citations.map((citation, idx) => (
              <a
                key={idx}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                <span className="text-gray-600">[{idx + 1}]</span>{' '}
                <span className="hover:underline">{citation.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Questions */}
      {relatedQuestions && relatedQuestions.length > 0 && (
        <div className="border-t border-gray-800 pt-3 mt-3">
          <div className="text-xs text-gray-500 font-mono mb-2">RELATED QUESTIONS</div>
          <div className="space-y-1">
            {relatedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => onRelatedQuestionClick?.(question)}
                className="block w-full text-left text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-900/30 px-2 py-1 rounded transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cost */}
      <div className="text-xs text-gray-600 font-mono">
        Cost: ${cost.toFixed(4)}
      </div>
    </div>
  );
}
