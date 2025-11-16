import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDndFactsReturn {
  currentFact: string;
  loading: boolean;
  error: string | null;
  sessionProgress?: string; // e.g., "15/120" facts shown
  category?: string;
}

// Fallback facts in case API fails
const FALLBACK_FACTS = [
  "D&D was created in 1974 by Gary Gygax and Dave Arneson in Lake Geneva, Wisconsin. The first edition came in a wood-grain box with three booklets totaling 36 pages.",
  "THAC0 (To Hit Armor Class 0) was the core combat mechanic in AD&D 1e and 2e. Lower armor class was better, and you subtracted the target's AC from your THAC0 to get the d20 target number.",
  "The Tarrasque is D&D's most powerful monster: a 50-foot-tall kaiju with regeneration, reflective carapace, and frightful presence. Only one exists, sleeping beneath the earth.",
  "The Deck of Many Things is a cursed artifact with 22 cards. Drawing can grant wishes, castles, or magic items—or instantly kill you, imprison you, or steal your soul.",
];

const SESSION_STORAGE_KEY = 'dnd-facts-session';

/**
 * Session tracking for facts shown
 */
interface SessionData {
  shownFacts: string[]; // Fact texts shown this session
  startedAt: number;
}

/**
 * Load session data from localStorage
 */
function loadSession(): SessionData {
  if (typeof window === 'undefined') {
    return { shownFacts: [], startedAt: Date.now() };
  }

  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SessionData;
      // Reset session if older than 24 hours
      const ageHours = (Date.now() - parsed.startedAt) / (1000 * 60 * 60);
      if (ageHours > 24) {
        console.log('[useDndFacts] Session expired, resetting...');
        return { shownFacts: [], startedAt: Date.now() };
      }
      return parsed;
    }
  } catch (err) {
    console.error('[useDndFacts] Error loading session:', err);
  }

  return { shownFacts: [], startedAt: Date.now() };
}

/**
 * Save session data to localStorage
 */
function saveSession(data: SessionData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[useDndFacts] Error saving session:', err);
  }
}

export function useDndFacts(intervalMs: number = 30000): UseDndFactsReturn {
  const [currentFact, setCurrentFact] = useState<string>(FALLBACK_FACTS[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionProgress, setSessionProgress] = useState<string>('0/120');
  const [category, setCategory] = useState<string>('loading');

  const sessionDataRef = useRef<SessionData>(loadSession());
  const fallbackIndexRef = useRef<number>(0);

  const fetchFact = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear any previous errors

    try {
      const session = sessionDataRef.current;

      // Send session data to API for smart fact selection
      // Base64 encode to handle emoji and special characters in HTTP headers (ISO-8859-1 requirement)
      const sessionString = session.shownFacts.join(',');
      const encoded = btoa(encodeURIComponent(sessionString));
      // If header too large (>7KB), send only last 50 facts to avoid HTTP header size limits
      const sessionData = encoded.length > 7000
        ? btoa(encodeURIComponent(session.shownFacts.slice(-50).join(',')))
        : encoded;
      const response = await fetch('/api/dnd-facts', {
        headers: {
          'x-session-shown-facts': sessionData,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[useDndFacts] Received fact:', data.fact.substring(0, 60) + '...');
      console.log('[useDndFacts] Metadata:', data.metadata);

      // Update state
      setCurrentFact(data.fact);
      setError(null); // Explicitly clear error on success

      if (data.metadata) {
        setSessionProgress(data.metadata.sessionProgress || '0/120');
        setCategory(data.metadata.category || 'unknown');
      }

      // Track fact in session
      if (!session.shownFacts.includes(data.fact)) {
        session.shownFacts.push(data.fact);
        saveSession(session);
        sessionDataRef.current = session; // BUG FIX: Sync ref with updated session
        console.log(`[useDndFacts] Session progress: ${session.shownFacts.length} facts seen`);
      }

      // If we've seen all facts, reset session
      if (data.metadata?.sessionProgress) {
        const [seen, total] = data.metadata.sessionProgress.split('/').map(Number);
        if (seen >= total) {
          console.log('[useDndFacts] All facts shown! Resetting session...');
          session.shownFacts = [data.fact];
          saveSession(session);
        }
      }
    } catch (err) {
      console.error('[useDndFacts] Error fetching fact:', err);
      // Only set error if this is a persistent failure
      // Don't show error message since we have fallback facts working
      // setError('Failed to fetch fact'); // REMOVED: Don't show error to user

      // Use fallback facts silently
      fallbackIndexRef.current = (fallbackIndexRef.current + 1) % FALLBACK_FACTS.length;
      setCurrentFact(FALLBACK_FACTS[fallbackIndexRef.current]);
      setCategory('fallback');
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - all dependencies are refs or setState functions which are stable

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
  }, [intervalMs, fetchFact]); // BUG FIX: Add fetchFact to dependencies to prevent stale closures

  return { currentFact, loading, error, sessionProgress, category };
}
