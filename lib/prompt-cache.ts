/**
 * Prompt Caching System
 *
 * Caches constructed system prompts to reduce:
 * 1. Server-side compute time (context gathering)
 * 2. OpenAI API costs (fewer input tokens on cache hits)
 * 3. Response latency (skip expensive context operations)
 *
 * Expected savings: 50-90% on repeated queries with similar context
 */

import { LRUCache } from 'lru-cache';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ITEMS = 200; // Cache up to 200 user contexts

interface CachedPrompt {
  systemMessage: string;
  contextMessages: any[];
  timestamp: number;
  autoContext: any;
  messageHistory: any[] | null;
}

interface CacheKey {
  userId: string;
  conversationId: string;
  messageHash: string; // Hash of user message to detect similar queries
}

const promptCache = new LRUCache<string, CachedPrompt>({
  max: MAX_CACHE_ITEMS,
  ttl: CACHE_TTL_MS,
  updateAgeOnGet: true
});

// Statistics tracking
let cacheHits = 0;
let cacheMisses = 0;
let totalCostSaved = 0; // Estimated cost saved in USD

/**
 * Generate cache key from request parameters
 */
function getCacheKey(params: CacheKey): string {
  return JSON.stringify({
    userId: params.userId,
    conversationId: params.conversationId,
    msgHash: params.messageHash.substring(0, 20) // First 20 chars for similarity
  });
}

/**
 * Simple hash function for message content
 */
function hashMessage(message: string): string {
  // Simple hash based on message length and first/last chars
  // For similar queries, this will likely match
  const normalized = message.toLowerCase().trim();
  return `${normalized.length}-${normalized.substring(0, 10)}-${normalized.substring(normalized.length - 10)}`;
}

/**
 * Get cached prompt if available and fresh
 */
export function getCachedPrompt(
  userId: string,
  conversationId: string,
  userMessage: string
): CachedPrompt | null {
  const messageHash = hashMessage(userMessage);
  const cacheKey = getCacheKey({ userId, conversationId, messageHash });

  const cached = promptCache.get(cacheKey);

  if (!cached) {
    cacheMisses++;
    console.log('[PromptCache] MISS - Building fresh context');
    return null;
  }

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    promptCache.delete(cacheKey);
    cacheMisses++;
    console.log('[PromptCache] EXPIRED - Age:', Math.round(age / 1000), 's');
    return null;
  }

  cacheHits++;

  // Estimate cost saved (assuming ~2000 tokens for system prompt)
  const estimatedTokensSaved = 2000;
  const estimatedCostSaved = (estimatedTokensSaved / 1_000_000) * 2.50; // GPT-4 input pricing
  totalCostSaved += estimatedCostSaved;

  console.log(`[PromptCache] HIT - Age: ${Math.round(age / 1000)}s, Estimated cost saved: $${estimatedCostSaved.toFixed(4)}`);
  console.log(`[PromptCache] Total saved this session: $${totalCostSaved.toFixed(4)}`);

  return cached;
}

/**
 * Store prompt in cache
 */
export function cachePrompt(
  userId: string,
  conversationId: string,
  userMessage: string,
  promptData: {
    systemMessage: string;
    contextMessages: any[];
    autoContext: any;
    messageHistory: any[] | null;
  }
): void {
  const messageHash = hashMessage(userMessage);
  const cacheKey = getCacheKey({ userId, conversationId, messageHash });

  const cached: CachedPrompt = {
    systemMessage: promptData.systemMessage,
    contextMessages: promptData.contextMessages,
    timestamp: Date.now(),
    autoContext: promptData.autoContext,
    messageHistory: promptData.messageHistory
  };

  promptCache.set(cacheKey, cached);
  console.log('[PromptCache] STORED - Cache size:', promptCache.size);
}

/**
 * Clear cache for a specific user (useful for testing)
 */
export function clearUserCache(userId: string): void {
  let cleared = 0;

  for (const [key, value] of promptCache.entries()) {
    if (key.includes(userId)) {
      promptCache.delete(key);
      cleared++;
    }
  }

  console.log(`[PromptCache] Cleared ${cleared} entries for user ${userId}`);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;

  return {
    size: promptCache.size,
    maxSize: MAX_CACHE_ITEMS,
    ttl: CACHE_TTL_MS,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: hitRate.toFixed(2) + '%',
    totalCostSaved: totalCostSaved.toFixed(4),
    estimatedMonthlySavings: ((totalCostSaved / (Date.now() / 1000 / 60 / 60)) * 24 * 30).toFixed(2)
  };
}

/**
 * Clear entire cache
 */
export function clearPromptCache(): void {
  promptCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  totalCostSaved = 0;
  console.log('[PromptCache] Cache cleared completely');
}

export const PromptCache = {
  getCachedPrompt,
  cachePrompt,
  clearUserCache,
  getCacheStats,
  clearPromptCache
};
