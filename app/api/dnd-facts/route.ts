import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { LORE_DATABASE, DndFact, getAllCategories } from '@/lib/dnd-lore-database';
import {
  isDuplicate,
  CategoryTracker,
  selectDiverseFact,
  shouldGenerateNewFact,
  isValidFact,
} from '@/lib/dnd-fact-deduplication';

// Enhanced cache with fact metadata
interface CachedFact {
  text: string;
  category: string;
  timesShown: number;
  addedAt: Date;
}

const factCache: CachedFact[] = [];
const categoryTracker = new CategoryTracker();
let initialized = false;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Initialize cache with curated lore database
 */
function initializeCache() {
  if (initialized) return;

  console.log('[DND Facts API] Initializing cache with curated lore database...');

  // Load all curated facts from database
  for (const fact of LORE_DATABASE) {
    factCache.push({
      text: fact.text,
      category: fact.category,
      timesShown: 0,
      addedAt: new Date(),
    });
  }

  initialized = true;
  console.log(`[DND Facts API] Cache initialized with ${factCache.length} curated facts`);
}

/**
 * Select a fact from cache that hasn't been shown recently
 * Uses truly random selection to work across server restarts
 */
function selectFactFromCache(sessionShownFacts: string[]): CachedFact | null {
  // Filter out facts already shown this session
  const unseenFacts = factCache.filter(
    cached => !sessionShownFacts.includes(cached.text)
  );

  if (unseenFacts.length === 0) {
    console.log('[DND Facts API] All facts shown this session, resetting...');
    // All facts shown, pick random fact from entire cache
    const randomIndex = Math.floor(Math.random() * factCache.length);
    return factCache[randomIndex];
  }

  // Truly random selection from unseen facts
  // This works even when server restarts reset the cache
  const randomIndex = Math.floor(Math.random() * unseenFacts.length);
  const selectedFact = unseenFacts[randomIndex];

  console.log(`[DND Facts API] Random selection: ${randomIndex + 1}/${unseenFacts.length} unseen facts`);
  return selectedFact;
}

/**
 * Generate a new fact using AI with deduplication
 */
async function generateNewFact(maxRetries: number = 3): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('[DND Facts API] No OpenAI key, skipping generation');
    return null;
  }

  const categories = getAllCategories();
  const leastShownCategory = categoryTracker.getLeastShownCategory() || categories[0];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[DND Facts API] Generating new fact (attempt ${attempt}/${maxRetries})...`);
      console.log(`[DND Facts API] Target category: ${leastShownCategory}`);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a D&D expert who generates interesting, accurate facts about Dungeons & Dragons.

Generate ONE unique fact about D&D in the category: ${leastShownCategory}

Categories:
- editions: Edition history (OD&D, AD&D, 3e, 4e, 5e, 5.5e) and how the game evolved
- mechanics: Game rules (THAC0, saving throws, vancian magic, advantage/disadvantage)
- lore: Campaign settings (Forgotten Realms, Greyhawk, Planescape, Spelljammer, Dark Sun, Eberron)
- monsters: Iconic creatures (tarrasque, beholder, mind flayer, rust monster, gelatinous cube)
- npcs: Legendary characters (Vecna, Elminster, Drizzt, Raistlin, Mordenkainen)
- artifacts: Magical items (Deck of Many Things, Eye of Vecna, Sphere of Annihilation)
- planes: Planar cosmology (Nine Hells, Abyss, Sigil, Mechanus, Limbo, Astral Plane)
- adventures: Famous modules (Tomb of Horrors, Curse of Strahd, Keep on the Borderlands)

The fact should be:
- Interesting and surprising
- 1-2 sentences (50-300 characters)
- Accurate to official D&D lore
- Cover deep lore, not just surface-level knowledge
- Include specific names, dates, or details

Return ONLY the fact text, no quotes, no prefix.`,
          },
        ],
        temperature: 1.3, // Very high temperature for maximum variety
        max_tokens: 200,
      });

      const fact = completion.choices[0]?.message?.content?.trim();

      if (!fact) {
        console.log('[DND Facts API] Empty response from OpenAI');
        continue;
      }

      // Validate fact quality
      if (!isValidFact(fact)) {
        console.log('[DND Facts API] Generated fact failed validation');
        continue;
      }

      // Check for duplicates
      const existingTexts = factCache.map(f => f.text);
      if (isDuplicate(fact, existingTexts, 0.80)) {
        console.log('[DND Facts API] Generated fact is duplicate, retrying...');
        continue;
      }

      // Success! Add to cache
      console.log('[DND Facts API] Generated valid unique fact:', fact);
      factCache.push({
        text: fact,
        category: leastShownCategory,
        timesShown: 0,
        addedAt: new Date(),
      });

      return fact;
    } catch (error) {
      console.error(`[DND Facts API] Error generating fact (attempt ${attempt}):`, error);
    }
  }

  console.log('[DND Facts API] Failed to generate unique fact after retries');
  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Initialize cache with curated database on first request
    initializeCache();

    // Get session-shown facts from header (base64-encoded, comma-separated)
    const sessionHeader = req.headers.get('x-session-shown-facts') || '';
    let sessionShownFacts: string[] = [];

    if (sessionHeader) {
      // Limit header size to prevent 431 errors (max ~8KB is safe for most servers)
      if (sessionHeader.length > 8000) {
        console.warn('[DND Facts API] Session header too large (>8KB), resetting session');
        // Reset session by treating as empty
        sessionShownFacts = [];
      } else {
        try {
          // Decode base64 and URI component encoding
          const decoded = decodeURIComponent(Buffer.from(sessionHeader, 'base64').toString('utf-8'));
          sessionShownFacts = decoded ? decoded.split(',').map(f => f.trim()).filter(Boolean) : [];
        } catch (err) {
          console.error('[DND Facts API] Error decoding session header:', err);
          // Fall back to treating as plain text for backwards compatibility
          sessionShownFacts = sessionHeader.split(',').map(f => f.trim()).filter(Boolean);
        }
      }
    }

    console.log(`[DND Facts API] Session has seen ${sessionShownFacts.length} facts`);
    console.log(`[DND Facts API] Cache size: ${factCache.length} facts`);

    // Try to generate new fact occasionally (if cache needs more diversity)
    if (shouldGenerateNewFact(factCache.length, 120)) {
      const newFact = await generateNewFact();
      if (newFact) {
        // Return the newly generated fact
        const cached = factCache.find(f => f.text === newFact)!;
        cached.timesShown++;
        categoryTracker.trackFact(cached.category as any);

        return NextResponse.json({
          fact: newFact,
          cached: false,
          metadata: {
            category: cached.category,
            cacheSize: factCache.length,
            sessionProgress: `${sessionShownFacts.length}/${factCache.length}`,
          },
        });
      }
    }

    // Select fact from cache (prioritize unseen facts)
    const selectedCached = selectFactFromCache(sessionShownFacts);

    if (!selectedCached) {
      // Should never happen, but fallback just in case
      const fallback = LORE_DATABASE[0].text;
      console.log('[DND Facts API] No facts available, using fallback');
      return NextResponse.json({ fact: fallback, cached: true });
    }

    // Update tracking
    selectedCached.timesShown++;
    categoryTracker.trackFact(selectedCached.category as any);

    console.log(`[DND Facts API] Selected fact from cache:`, selectedCached.text.substring(0, 60) + '...');
    console.log(`[DND Facts API] Category: ${selectedCached.category}, Times shown: ${selectedCached.timesShown}`);
    console.log(`[DND Facts API] Category distribution:`, categoryTracker.getDistribution());

    return NextResponse.json({
      fact: selectedCached.text,
      cached: true,
      metadata: {
        category: selectedCached.category,
        timesShown: selectedCached.timesShown,
        cacheSize: factCache.length,
        sessionProgress: `${sessionShownFacts.length}/${factCache.length}`,
        categoryDistribution: categoryTracker.getDistribution(),
      },
    });
  } catch (error) {
    console.error('[DND Facts API] Error:', error);

    // Fallback to first curated fact
    const fallbackFact = LORE_DATABASE[0].text;
    return NextResponse.json({
      fact: fallbackFact,
      cached: true,
      error: 'API error, using fallback',
    });
  }
}
