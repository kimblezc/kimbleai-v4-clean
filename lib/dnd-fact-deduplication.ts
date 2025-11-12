/**
 * D&D Fact Deduplication System
 *
 * Prevents duplicate or near-duplicate facts using:
 * - String similarity (Levenshtein distance)
 * - Keyword overlap detection
 * - Category diversity tracking
 */

import { DndFact, FactCategory } from './dnd-lore-database';

/**
 * Calculate Levenshtein distance between two strings
 * (minimum edits needed to transform one string into another)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 * 1.0 = identical, 0.0 = completely different
 */
function similarityRatio(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Extract significant keywords from a fact
 * (removes common words, keeps important nouns)
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
  );
}

/**
 * Calculate keyword overlap between two texts (0-1)
 * 1.0 = all keywords match, 0.0 = no keywords match
 */
function keywordOverlap(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);

  if (keywords1.size === 0 || keywords2.size === 0) return 0;

  const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
  const union = new Set([...keywords1, ...keywords2]);

  return intersection.size / union.size;
}

/**
 * Check if a new fact is too similar to existing facts
 *
 * @param newFact - The fact to check
 * @param existingFacts - Facts already in cache
 * @param similarityThreshold - Minimum similarity to consider duplicate (default 0.80)
 * @returns true if duplicate detected, false otherwise
 */
export function isDuplicate(
  newFact: string,
  existingFacts: string[],
  similarityThreshold: number = 0.80
): boolean {
  for (const existing of existingFacts) {
    // Check string similarity
    const stringSimilarity = similarityRatio(newFact, existing);
    if (stringSimilarity >= similarityThreshold) {
      console.log(`[Dedup] String similarity detected: ${(stringSimilarity * 100).toFixed(1)}%`);
      console.log(`[Dedup] New: "${newFact.substring(0, 60)}..."`);
      console.log(`[Dedup] Existing: "${existing.substring(0, 60)}..."`);
      return true;
    }

    // Check keyword overlap (stricter threshold)
    const keywordSimilarity = keywordOverlap(newFact, existing);
    if (keywordSimilarity >= 0.70) {
      console.log(`[Dedup] Keyword overlap detected: ${(keywordSimilarity * 100).toFixed(1)}%`);
      console.log(`[Dedup] New: "${newFact.substring(0, 60)}..."`);
      console.log(`[Dedup] Existing: "${existing.substring(0, 60)}..."`);
      return true;
    }
  }

  return false;
}

/**
 * Track category distribution to ensure diversity
 */
export class CategoryTracker {
  private categoryCounts: Map<FactCategory, number> = new Map();
  private totalFacts = 0;

  /**
   * Record a fact being shown
   */
  trackFact(category: FactCategory): void {
    this.categoryCounts.set(category, (this.categoryCounts.get(category) || 0) + 1);
    this.totalFacts++;
  }

  /**
   * Get the least-shown category to encourage diversity
   */
  getLeastShownCategory(): FactCategory | null {
    if (this.categoryCounts.size === 0) return null;

    let minCategory: FactCategory | null = null;
    let minCount = Infinity;

    for (const [category, count] of this.categoryCounts.entries()) {
      if (count < minCount) {
        minCount = count;
        minCategory = category;
      }
    }

    return minCategory;
  }

  /**
   * Get category distribution as percentages
   */
  getDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const [category, count] of this.categoryCounts.entries()) {
      dist[category] = this.totalFacts > 0 ? (count / this.totalFacts) * 100 : 0;
    }
    return dist;
  }

  /**
   * Check if a category is underrepresented (shown less than average)
   */
  isUnderrepresented(category: FactCategory): boolean {
    const avgCount = this.totalFacts / Math.max(1, this.categoryCounts.size);
    const categoryCount = this.categoryCounts.get(category) || 0;
    return categoryCount < avgCount * 0.8; // 20% below average
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.categoryCounts.clear();
    this.totalFacts = 0;
  }

  /**
   * Get total facts tracked
   */
  getTotal(): number {
    return this.totalFacts;
  }
}

/**
 * Select a diverse fact that maintains category balance
 *
 * @param availableFacts - Facts to choose from
 * @param tracker - Category tracker for diversity
 * @returns Selected fact
 */
export function selectDiverseFact(availableFacts: DndFact[], tracker: CategoryTracker): DndFact {
  // If tracker is empty, return random fact
  if (tracker.getTotal() === 0) {
    return availableFacts[Math.floor(Math.random() * availableFacts.length)];
  }

  // Try to find an underrepresented category
  const underrepresented = availableFacts.filter(fact =>
    tracker.isUnderrepresented(fact.category)
  );

  if (underrepresented.length > 0) {
    return underrepresented[Math.floor(Math.random() * underrepresented.length)];
  }

  // Otherwise, return random fact
  return availableFacts[Math.floor(Math.random() * availableFacts.length)];
}

/**
 * Determine if we should generate a new fact or use existing cache
 *
 * @param cacheSize - Current cache size
 * @param minCacheSize - Minimum cache size to maintain
 * @returns true if should generate new fact
 */
export function shouldGenerateNewFact(cacheSize: number, minCacheSize: number = 100): boolean {
  // Always generate if cache is below minimum
  if (cacheSize < minCacheSize) {
    return true;
  }

  // Occasionally generate new facts (10% chance) to keep cache fresh
  return Math.random() < 0.10;
}

/**
 * Validate a generated fact meets quality standards
 *
 * @param fact - Fact text to validate
 * @returns true if valid, false otherwise
 */
export function isValidFact(fact: string): boolean {
  // Must be reasonable length
  if (fact.length < 50 || fact.length > 500) {
    console.log(`[Validation] Fact rejected: length ${fact.length} (need 50-500)`);
    return false;
  }

  // Must not be empty or generic
  if (fact.trim().length === 0 || fact.includes('I apologize') || fact.includes('As an AI')) {
    console.log(`[Validation] Fact rejected: generic/empty content`);
    return false;
  }

  // Should have some D&D-specific keywords
  const dndKeywords = [
    'dnd', 'd&d', 'dungeons', 'dragons', 'edition', 'thac0', 'gygax', 'arneson',
    'wizard', 'cleric', 'fighter', 'rogue', 'spell', 'monster', 'dragon', 'demon',
    'devil', 'plane', 'dungeon', 'campaign', 'adventure', 'dice', 'roll',
  ];

  const lowerFact = fact.toLowerCase();
  const hasKeyword = dndKeywords.some(keyword => lowerFact.includes(keyword));

  if (!hasKeyword) {
    console.log(`[Validation] Fact rejected: no D&D keywords found`);
    return false;
  }

  return true;
}
