'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface ModelFeedbackProps {
  conversationId: string;
  messageId?: string;
  metricId?: string;
  onFeedbackSubmitted?: (rating: number) => void;
  className?: string;
}

export default function ModelFeedback({
  conversationId,
  messageId,
  metricId,
  onFeedbackSubmitted,
  className = '',
}: ModelFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = async (newRating: number) => {
    if (submitting || rating !== null) return; // Prevent double submission

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/analytics/models/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metricId,
          conversationId,
          rating: newRating,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setRating(newRating);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(newRating);
      }
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError(err.message);
      setRating(null); // Reset on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => submitFeedback(1)}
        disabled={submitting || rating !== null}
        className={`p-1 rounded transition-all ${
          rating === 1
            ? 'bg-green-600 text-white'
            : rating === null
            ? 'text-slate-400 hover:text-green-400 hover:bg-green-400/10'
            : 'text-slate-600 opacity-50'
        } ${submitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        title="Good response"
      >
        <ThumbsUp size={16} />
      </button>

      <button
        onClick={() => submitFeedback(-1)}
        disabled={submitting || rating !== null}
        className={`p-1 rounded transition-all ${
          rating === -1
            ? 'bg-red-600 text-white'
            : rating === null
            ? 'text-slate-400 hover:text-red-400 hover:bg-red-400/10'
            : 'text-slate-600 opacity-50'
        } ${submitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        title="Poor response"
      >
        <ThumbsDown size={16} />
      </button>

      {error && (
        <span className="text-xs text-red-400 ml-2">Failed to save feedback</span>
      )}

      {rating !== null && (
        <span className="text-xs text-slate-500 ml-2">Thanks for your feedback!</span>
      )}
    </div>
  );
}
