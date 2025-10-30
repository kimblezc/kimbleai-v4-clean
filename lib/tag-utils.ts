/**
 * Tag Utilities - Normalization, validation, and management
 *
 * Provides consistent tag handling across the entire application.
 * All tag operations should use these utilities to ensure data consistency.
 *
 * @module lib/tag-utils
 * @version 7.0.0
 */

/**
 * Tag validation rules
 */
export const TAG_RULES = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 50,
  ALLOWED_PATTERN: /^[a-z0-9-_]+$/,
  RESERVED_NAMES: ['all', 'none', 'null', 'undefined', 'system']
} as const;

/**
 * Tag categories with predefined colors
 */
export const TAG_CATEGORIES = {
  technical: { color: '#3b82f6', label: 'Technical' },
  business: { color: '#8b5cf6', label: 'Business' },
  client: { color: '#ec4899', label: 'Client' },
  priority: { color: '#f59e0b', label: 'Priority' },
  status: { color: '#10b981', label: 'Status' },
  custom: { color: '#6366f1', label: 'Custom' }
} as const;

export type TagCategory = keyof typeof TAG_CATEGORIES;

/**
 * Normalized tag structure
 */
export interface NormalizedTag {
  normalized: string;
  original: string;
  isValid: boolean;
  error?: string;
}

/**
 * Normalize a single tag
 * Converts to lowercase, trims whitespace, replaces spaces with hyphens
 *
 * @param tag - Raw tag string
 * @returns Normalized tag string
 *
 * @example
 * normalizeTag("  Bug Fix  ") => "bug-fix"
 * normalizeTag("React Component") => "react-component"
 */
export function normalizeTag(tag: string): string {
  if (!tag || typeof tag !== 'string') {
    return '';
  }

  return tag
    .trim()                          // Remove leading/trailing whitespace
    .toLowerCase()                   // Convert to lowercase
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-_]/g, '')    // Remove invalid characters
    .replace(/-+/g, '-')            // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
}

/**
 * Normalize an array of tags and remove duplicates
 *
 * @param tags - Array of raw tag strings
 * @returns Array of unique normalized tags
 *
 * @example
 * normalizeTags(["Bug", "bug", "  Feature  ", "Bug Fix"])
 * => ["bug", "feature", "bug-fix"]
 */
export function normalizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = tags
    .map(tag => normalizeTag(tag))
    .filter(tag => tag.length >= TAG_RULES.MIN_LENGTH);

  // Remove duplicates using Set
  return Array.from(new Set(normalized));
}

/**
 * Validate a tag against rules
 *
 * @param tag - Tag to validate (should be pre-normalized)
 * @returns Validation result with error message if invalid
 */
export function validateTag(tag: string): NormalizedTag {
  const normalized = normalizeTag(tag);

  // Empty after normalization
  if (!normalized) {
    return {
      normalized,
      original: tag,
      isValid: false,
      error: 'Tag cannot be empty'
    };
  }

  // Too short
  if (normalized.length < TAG_RULES.MIN_LENGTH) {
    return {
      normalized,
      original: tag,
      isValid: false,
      error: `Tag must be at least ${TAG_RULES.MIN_LENGTH} characters`
    };
  }

  // Too long
  if (normalized.length > TAG_RULES.MAX_LENGTH) {
    return {
      normalized,
      original: tag,
      isValid: false,
      error: `Tag cannot exceed ${TAG_RULES.MAX_LENGTH} characters`
    };
  }

  // Invalid characters (after normalization, only a-z, 0-9, -, _ allowed)
  if (!TAG_RULES.ALLOWED_PATTERN.test(normalized)) {
    return {
      normalized,
      original: tag,
      isValid: false,
      error: 'Tag contains invalid characters (only letters, numbers, hyphens, underscores allowed)'
    };
  }

  // Reserved name
  if (TAG_RULES.RESERVED_NAMES.includes(normalized)) {
    return {
      normalized,
      original: tag,
      isValid: false,
      error: `"${normalized}" is a reserved tag name`
    };
  }

  return {
    normalized,
    original: tag,
    isValid: true
  };
}

/**
 * Validate multiple tags
 *
 * @param tags - Array of tags to validate
 * @returns Object with valid and invalid tags
 */
export function validateTags(tags: string[]): {
  valid: string[];
  invalid: Array<{ tag: string; error: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ tag: string; error: string }> = [];

  for (const tag of tags) {
    const result = validateTag(tag);
    if (result.isValid) {
      valid.push(result.normalized);
    } else {
      invalid.push({ tag: result.original, error: result.error || 'Invalid tag' });
    }
  }

  return {
    valid: Array.from(new Set(valid)), // Remove duplicates
    invalid
  };
}

/**
 * Categorize a tag based on content
 * Uses pattern matching to auto-detect tag category
 *
 * @param tag - Normalized tag string
 * @returns Tag category
 */
export function categorizeTag(tag: string): TagCategory {
  const normalized = normalizeTag(tag);

  // Technical patterns
  const technicalPatterns = [
    'react', 'nextjs', 'typescript', 'javascript', 'nodejs', 'api', 'database',
    'backend', 'frontend', 'mobile', 'web', 'ui', 'ux', 'design', 'code',
    'dev', 'test', 'deploy', 'ci-cd', 'docker', 'kubernetes', 'aws', 'cloud'
  ];
  if (technicalPatterns.some(pattern => normalized.includes(pattern))) {
    return 'technical';
  }

  // Business patterns
  const businessPatterns = [
    'revenue', 'sales', 'marketing', 'growth', 'strategy', 'plan', 'budget',
    'finance', 'legal', 'contract', 'partnership', 'investor'
  ];
  if (businessPatterns.some(pattern => normalized.includes(pattern))) {
    return 'business';
  }

  // Client patterns
  const clientPatterns = [
    'client', 'customer', 'user', 'feedback', 'support', 'ticket', 'request'
  ];
  if (clientPatterns.some(pattern => normalized.includes(pattern))) {
    return 'client';
  }

  // Priority patterns
  const priorityPatterns = [
    'urgent', 'critical', 'high', 'low', 'p0', 'p1', 'p2', 'p3', 'asap',
    'important', 'blocker'
  ];
  if (priorityPatterns.some(pattern => normalized.includes(pattern))) {
    return 'priority';
  }

  // Status patterns
  const statusPatterns = [
    'todo', 'doing', 'done', 'blocked', 'review', 'testing', 'deployed',
    'active', 'inactive', 'archived', 'complete', 'incomplete'
  ];
  if (statusPatterns.some(pattern => normalized.includes(pattern))) {
    return 'status';
  }

  return 'custom';
}

/**
 * Get color for a tag based on its category
 *
 * @param tag - Tag string (will be categorized)
 * @returns Hex color code
 */
export function getTagColor(tag: string): string {
  const category = categorizeTag(tag);
  return TAG_CATEGORIES[category].color;
}

/**
 * Merge duplicate tags in an array
 * Useful for cleaning up existing data
 *
 * @param tags - Array of tags (may contain duplicates with different cases)
 * @returns Array of unique normalized tags
 *
 * @example
 * mergeDuplicateTags(["Bug", "bug", "BUG", "feature", "Feature"])
 * => ["bug", "feature"]
 */
export function mergeDuplicateTags(tags: string[]): string[] {
  return normalizeTags(tags);
}

/**
 * Find similar tags (for merge suggestions)
 * Uses Levenshtein distance to find tags that might be duplicates
 *
 * @param tag - Tag to find similar matches for
 * @param allTags - Array of all available tags
 * @param threshold - Similarity threshold (0-1, default 0.8)
 * @returns Array of similar tags
 */
export function findSimilarTags(
  tag: string,
  allTags: string[],
  threshold: number = 0.8
): string[] {
  const normalized = normalizeTag(tag);
  const similar: string[] = [];

  for (const otherTag of allTags) {
    const otherNormalized = normalizeTag(otherTag);

    // Skip exact matches and the tag itself
    if (normalized === otherNormalized) continue;

    // Calculate similarity
    const similarity = calculateSimilarity(normalized, otherNormalized);

    if (similarity >= threshold) {
      similar.push(otherTag);
    }
  }

  return similar;
}

/**
 * Calculate similarity between two strings (simple Levenshtein-based)
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  // Simple check: if one contains the other
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  // Count matching characters
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }

  return matches / longer.length;
}

/**
 * Sort tags by usage frequency
 *
 * @param tags - Array of tags with usage counts
 * @returns Sorted array of tags (most used first)
 */
export function sortTagsByUsage(
  tags: Array<{ tag: string; count: number }>
): Array<{ tag: string; count: number }> {
  return [...tags].sort((a, b) => b.count - a.count);
}

/**
 * Format tags for display
 *
 * @param tags - Array of normalized tags
 * @returns Array of display-friendly tag objects
 */
export function formatTagsForDisplay(tags: string[]): Array<{
  tag: string;
  color: string;
  category: TagCategory;
}> {
  return normalizeTags(tags).map(tag => ({
    tag,
    color: getTagColor(tag),
    category: categorizeTag(tag)
  }));
}
