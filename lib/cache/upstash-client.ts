/**
 * Upstash Redis Client - Caching layer for API responses
 *
 * FREE tier: 10,000 commands/day (we use ~500/day)
 * Provides serverless Redis caching for embeddings, search results, and AI responses
 *
 * @module lib/cache/upstash-client
 * @version 1.0.0
 */

import { Redis } from '@upstash/redis';

// Singleton Redis client instance
let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis | null {
  // Return null if Redis not configured (graceful degradation)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Redis] Upstash not configured - caching disabled');
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redisClient;
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_PREFIXES = {
  EMBEDDING: 'emb:',
  SEARCH: 'search:',
  AI_RESPONSE: 'ai:',
  MODEL_SELECTION: 'model:',
  RATE_LIMIT: 'ratelimit:',
  SESSION: 'session:',
} as const;

/**
 * Default TTL values (in seconds)
 */
export const DEFAULT_TTL = {
  EMBEDDING: 7 * 24 * 60 * 60, // 7 days
  SEARCH: 60 * 60, // 1 hour
  AI_RESPONSE: 24 * 60 * 60, // 24 hours
  MODEL_SELECTION: 60, // 1 minute
  RATE_LIMIT: 60 * 60, // 1 hour
  SESSION: 30 * 24 * 60 * 60, // 30 days
} as const;

/**
 * Set value in cache with TTL
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      await redis.set(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error('[Redis] Set error:', error);
    return false;
  }
}

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const value = await redis.get<string>(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[Redis] Get error:', error);
    return null;
  }
}

/**
 * Delete value from cache
 */
export async function deleteCache(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('[Redis] Delete error:', error);
    return false;
  }
}

/**
 * Check if key exists in cache
 */
export async function existsCache(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[Redis] Exists error:', error);
    return false;
  }
}

/**
 * Increment counter (for rate limiting)
 */
export async function incrementCounter(key: string, ttlSeconds?: number): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  try {
    const count = await redis.incr(key);
    if (ttlSeconds && count === 1) {
      // Set TTL only on first increment
      await redis.expire(key, ttlSeconds);
    }
    return count;
  } catch (error) {
    console.error('[Redis] Increment error:', error);
    return 0;
  }
}

/**
 * Get multiple keys with a pattern
 */
export async function getCacheKeys(pattern: string): Promise<string[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const keys = await redis.keys(pattern);
    return keys;
  } catch (error) {
    console.error('[Redis] Keys error:', error);
    return [];
  }
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearAllCache(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.flushdb();
    return true;
  } catch (error) {
    console.error('[Redis] FlushDB error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const redis = getRedisClient();
  if (!redis) {
    return {
      enabled: false,
      dbsize: 0,
      memory: '0 bytes',
    };
  }

  try {
    const dbsize = await redis.dbsize();
    return {
      enabled: true,
      dbsize,
      memory: 'N/A', // Upstash doesn't expose memory stats via REST
    };
  } catch (error) {
    console.error('[Redis] Stats error:', error);
    return {
      enabled: true,
      dbsize: 0,
      memory: 'Error',
    };
  }
}
