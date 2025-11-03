import { useState, useEffect, useRef } from 'react';

interface UseDndFactsReturn {
  currentFact: string;
  loading: boolean;
  error: string | null;
}

// Fallback facts in case API fails
const FALLBACK_FACTS = [
  "The original D&D (1974) had only 3 character classes: Fighter, Magic-User, and Cleric.",
  "A natural 20 is called a 'critical success' - it automatically succeeds at nearly any task.",
  "The Deck of Many Things can grant wishes or instantly kill you - many DMs ban it entirely.",
  "Dungeons & Dragons was created by Gary Gygax and Dave Arneson in 1974 in Lake Geneva, Wisconsin.",
];

export function useDndFacts(intervalMs: number = 30000): UseDndFactsReturn {
  const [currentFact, setCurrentFact] = useState<string>(FALLBACK_FACTS[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const fallbackIndexRef = useRef<number>(0);

  const fetchFact = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useDndFacts] Fetching new fact from API...');
      const response = await fetch('/api/dnd-facts', {
        headers: {
          'x-session-id': sessionIdRef.current,
        },
      });

      if (response.status === 429) {
        // Rate limited - use fallback
        const data = await response.json();
        console.log('[useDndFacts] Rate limited:', data.error);
        setError(data.error);

        // Cycle through fallback facts
        fallbackIndexRef.current = (fallbackIndexRef.current + 1) % FALLBACK_FACTS.length;
        setCurrentFact(FALLBACK_FACTS[fallbackIndexRef.current]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[useDndFacts] Received fact:', data.fact, '(cached:', data.cached, ')');
      setCurrentFact(data.fact);
    } catch (err) {
      console.error('[useDndFacts] Error fetching fact:', err);
      setError('Failed to fetch fact');

      // Use fallback facts
      fallbackIndexRef.current = (fallbackIndexRef.current + 1) % FALLBACK_FACTS.length;
      setCurrentFact(FALLBACK_FACTS[fallbackIndexRef.current]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial fact
  useEffect(() => {
    fetchFact();
  }, []); // Only on mount

  // Set up interval for rotating facts
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[useDndFacts] Interval triggered, fetching new fact...');
      fetchFact();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return { currentFact, loading, error };
}
