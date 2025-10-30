/**
 * User Utilities - Comprehensive identifier handling
 *
 * Solves the recurring UUID/string mismatch problem by providing
 * a single source of truth for user identifier comparisons.
 */

export interface UserIdentifier {
  uuid?: string;
  name?: string;
  friendlyId?: string;
}

/**
 * Normalize any user identifier to a comparable format
 * Handles: UUIDs, friendly IDs (zach-admin-001), names (zach, Zach)
 */
export function normalizeUserIdentifier(identifier: string): {
  normalized: string;
  type: 'uuid' | 'name' | 'friendlyId';
} {
  if (!identifier) {
    return { normalized: '', type: 'name' };
  }

  const lower = identifier.toLowerCase().trim();

  // Check if it's a UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(identifier)) {
    return { normalized: lower, type: 'uuid' };
  }

  // Check if it's a friendly ID (contains hyphen and 'admin' or 'user')
  if (identifier.includes('-') && (identifier.includes('admin') || identifier.includes('user'))) {
    // Extract base name from friendly ID (e.g., 'zach-admin-001' -> 'zach')
    const baseName = identifier.split('-')[0].toLowerCase();
    return { normalized: baseName, type: 'friendlyId' };
  }

  // It's a simple name
  return { normalized: lower, type: 'name' };
}

/**
 * Check if two user identifiers refer to the same user
 * Works with ANY combination of UUIDs, friendly IDs, or names
 */
export function isSameUser(identifier1: string, identifier2: string): boolean {
  if (!identifier1 || !identifier2) return false;

  // Direct match (case-insensitive)
  if (identifier1.toLowerCase() === identifier2.toLowerCase()) {
    return true;
  }

  const id1 = normalizeUserIdentifier(identifier1);
  const id2 = normalizeUserIdentifier(identifier2);

  // If both are UUIDs, compare directly
  if (id1.type === 'uuid' && id2.type === 'uuid') {
    return id1.normalized === id2.normalized;
  }

  // If one or both are names/friendlyIds, compare normalized names
  if (id1.type !== 'uuid' || id2.type !== 'uuid') {
    return id1.normalized === id2.normalized;
  }

  return false;
}

/**
 * Check if a user owns a resource
 * Compares user identifier against resource owner_id
 */
export function isResourceOwner(
  userId: string,
  resourceOwnerId: string,
  userInfo?: { id?: string; name?: string }
): boolean {
  // Direct comparison
  if (isSameUser(userId, resourceOwnerId)) {
    return true;
  }

  // If we have additional user info, try those too
  if (userInfo) {
    if (userInfo.id && isSameUser(userInfo.id, resourceOwnerId)) {
      return true;
    }
    if (userInfo.name && isSameUser(userInfo.name, resourceOwnerId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get a user-friendly display name from any identifier
 */
export function getDisplayName(identifier: string): string {
  if (!identifier) return 'Unknown User';

  const info = normalizeUserIdentifier(identifier);

  if (info.type === 'uuid') {
    return identifier; // Show UUID as-is if that's all we have
  }

  // Capitalize first letter
  return info.normalized.charAt(0).toUpperCase() + info.normalized.slice(1);
}

/**
 * Map friendly identifiers to canonical names
 * This is the single source of truth for user mappings
 */
const USER_MAPPINGS: Record<string, string> = {
  'zach-admin-001': 'Zach',
  'zach': 'Zach',
  'rebecca-user-001': 'Rebecca',
  'rebecca': 'Rebecca',
};

/**
 * Get canonical name for any user identifier
 */
export function getCanonicalName(identifier: string): string | null {
  if (!identifier) return null;

  const lower = identifier.toLowerCase().trim();
  return USER_MAPPINGS[lower] || null;
}
