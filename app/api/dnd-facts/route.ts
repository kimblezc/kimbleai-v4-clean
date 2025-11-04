import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// In-memory cache for generated facts (unlimited - no cap)
const factCache: string[] = [];

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
  try {
    // Check if we have cached facts available
    if (factCache.length > 0) {
      // Return a random cached fact instantly (no rate limiting)
      const randomIndex = Math.floor(Math.random() * factCache.length);
      const fact = factCache[randomIndex];
      console.log('[DND Facts API] Returning cached fact:', fact);
      return NextResponse.json({ fact, cached: true });
    }

    console.log('[DND Facts API] Generating new fact with OpenAI...');

    // Generate a new fact using GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a D&D expert who generates interesting, accurate facts about Dungeons & Dragons.

Generate ONE unique fact about D&D. Mix between these categories:
- Deep lore (Forgotten Realms, Greyhawk, Planescape, Eberron, Dark Sun)
- Game mechanics (THAC0, saving throws, spell components, ability scores)
- Monster ecology (beholders, mind flayers, dragons, tarrasque, aboleths)
- Historical game development (TSR, Gygax, Arneson, editions)
- Famous campaigns and modules (Tomb of Horrors, Curse of Strahd, etc.)
- Iconic NPCs and deities (Vecna, Mordenkainen, Elminster, Tiamat)
- Planar cosmology (Nine Hells, Abyss, Shadowfell, Feywild)
- Magical items and artifacts (Deck of Many Things, Sphere of Annihilation)

The fact should be:
- Interesting and surprising
- 1-2 sentences maximum
- Accurate to official D&D lore
- A mix of well-known and obscure knowledge

Return ONLY the fact text, no quotes, no prefix.`,
        },
      ],
      temperature: 1.2, // High temperature for variety
      max_tokens: 150,
    });

    const fact = completion.choices[0]?.message?.content?.trim() || 'D&D was created in 1974 by Gary Gygax and Dave Arneson.';

    // Add to unlimited cache
    factCache.push(fact);

    console.log('[DND Facts API] Generated fact:', fact);
    console.log('[DND Facts API] Cache size:', factCache.length, '(unlimited)');

    return NextResponse.json({ fact, cached: false });
  } catch (error) {
    console.error('[DND Facts API] Error:', error);

    // Fallback fact if API fails
    const fallbackFact = 'The original D&D (1974) had only 3 character classes: Fighter, Magic-User, and Cleric.';
    return NextResponse.json({ fact: fallbackFact, cached: false, error: 'API error, using fallback' });
  }
}
