/**
 * Cache Strategies - Smart caching for different data types
 *
 * Implements caching strategies for embeddings, search results, and AI responses
 * to reduce API costs and improve performance.
 *
 * @module lib/cache/cache-strategies
 * @version 1.0.0
 */

import {
  getCache,
  setCache,
  CACHE_PREFIXES,
  DEFAULT_TTL,
} from './upstash-client';
import { createHash } from 'crypto';

/**
 * Generate cache key from content
 */
function generateCacheKey(prefix: string, content: string): string {
  const hash = createHash('sha256').update(content).digest('hex').substring(0, 16);
  return `${prefix}${hash}`;
}

/**
 * Cache embedding vector
 *
 * Embeddings rarely change, so we cache for 7 days
 * This saves ~$0.002 per repeated embedding request
 */
export async function cacheEmbedding(
  text: string,
  embedding: number[]
): Promise<boolean> {
  const key = generateCacheKey(CACHE_PREFIXES.EMBEDDING, text);
  return setCache(key, embedding, DEFAULT_TTL.EMBEDDING);
}

/**
 * Get cached embedding
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const key = generateCacheKey(CACHE_PREFIXES.EMBEDDING, text);
  return getCache<number[]>(key);
}

/**
 * Cache search results
 *
 * Search results change frequently, so we cache for 1 hour
 */
export async function cacheSearchResults(
  query: string,
  results: any[]
): Promise<boolean> {
  const key = generateCacheKey(CACHE_PREFIXES.SEARCH, query);
  return setCache(key, results, DEFAULT_TTL.SEARCH);
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(query: string): Promise<any[] | null> {
  const key = generateCacheKey(CACHE_PREFIXES.SEARCH, query);
  return getCache<any[]>(key);
}

/**
 * Cache AI response
 *
 * Cache identical prompts for 24 hours (user-specific)
 * This prevents duplicate API calls for repeated questions
 */
export async function cacheAIResponse(
  prompt: string,
  userId: string,
  response: string
): Promise<boolean> {
  const key = generateCacheKey(CACHE_PREFIXES.AI_RESPONSE, `${userId}:${prompt}`);
  return setCache(key, response, DEFAULT_TTL.AI_RESPONSE);
}

/**
 * Get cached AI response
 */
export async function getCachedAIResponse(
  prompt: string,
  userId: string
): Promise<string | null> {
  const key = generateCacheKey(CACHE_PREFIXES.AI_RESPONSE, `${userId}:${prompt}`);
  return getCache<string>(key);
}

/**
 * Cache model selection decision
 *
 * Cache for 1 minute to avoid re-computing for similar queries
 */
export async function cacheModelSelection(
  queryPattern: string,
  modelId: string
): Promise<boolean> {
  const key = generateCacheKey(CACHE_PREFIXES.MODEL_SELECTION, queryPattern);
  return setCache(key, modelId, DEFAULT_TTL.MODEL_SELECTION);
}

/**
 * Get cached model selection
 */
export async function getCachedModelSelection(queryPattern: string): Promise<string | null> {
  const key = generateCacheKey(CACHE_PREFIXES.MODEL_SELECTION, queryPattern);
  return getCache<string>(key);
}

/**
 * Cache statistics
 */
export interface CacheStats {
  embeddingHits: number;
  embeddingMisses: number;
  searchHits: number;
  searchMisses: number;
  aiResponseHits: number;
  aiResponseMisses: number;
  hitRate: number;
  estimatedSavings: number; // in dollars
}

// In-memory stats (reset on server restart)
let cacheStats: CacheStats = {
  embeddingHits: 0,
  embeddingMisses: 0,
  searchHits: 0,
  searchMisses: 0,
  aiResponseHits: 0,
  aiResponseMisses: 0,
  hitRate: 0,
  estimatedSavings: 0,
};

/**
 * Record cache hit
 */
export function recordCacheHit(type: 'embedding' | 'search' | 'aiResponse', savingsUSD: number = 0) {
  switch (type) {
    case 'embedding':
      cacheStats.embeddingHits++;
      cacheStats.estimatedSavings += savingsUSD || 0.002; // $0.002 per embedding
      break;
    case 'search':
      cacheStats.searchHits++;
      cacheStats.estimatedSavings += savingsUSD || 0.005; // $0.005 per search
      break;
    case 'aiResponse':
      cacheStats.aiResponseHits++;
      cacheStats.estimatedSavings += savingsUSD || 0.01; // $0.01 per AI response
      break;
  }
  updateHitRate();
}

/**
 * Record cache miss
 */
export function recordCacheMiss(type: 'embedding' | 'search' | 'aiResponse') {
  switch (type) {
    case 'embedding':
      cacheStats.embeddingMisses++;
      break;
    case 'search':
      cacheStats.searchMisses++;
      break;
    case 'aiResponse':
      cacheStats.aiResponseMisses++;
      break;
  }
  updateHitRate();
}

/**
 * Update hit rate calculation
 */
function updateHitRate() {
  const totalHits = cacheStats.embeddingHits + cacheStats.searchHits + cacheStats.aiResponseHits;
  const totalMisses = cacheStats.embeddingMisses + cacheStats.searchMisses + cacheStats.aiResponseMisses;
  const total = totalHits + totalMisses;

  cacheStats.hitRate = total > 0 ? (totalHits / total) * 100 : 0;
}

/**
 * Get cache statistics
 */
export function getCacheStatistics(): CacheStats {
  return { ...cacheStats };
}

/**
 * Reset cache statistics
 */
export function resetCacheStatistics() {
  cacheStats = {
    embeddingHits: 0,
    embeddingMisses: 0,
    searchHits: 0,
    searchMisses: 0,
    aiResponseHits: 0,
    aiResponseMisses: 0,
    hitRate: 0,
    estimatedSavings: 0,
  };
}
