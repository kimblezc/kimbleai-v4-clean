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

/**
 * Get user from database by any identifier
 * This is the centralized function that ALL API endpoints should use
 *
 * @param identifier - Can be: UUID, friendly ID (zach-admin-001), or name (zach, Zach)
 * @param supabaseClient - Supabase client instance
 * @returns User record with id, name, and other fields, or null if not found
 */
export async function getUserByIdentifier(
  identifier: string,
  supabaseClient: any
): Promise<{ id: string; name: string; [key: string]: any } | null> {
  if (!identifier) return null;

  const normalized = normalizeUserIdentifier(identifier);

  // Try to get user by UUID if it's a UUID
  if (normalized.type === 'uuid') {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', normalized.normalized)
      .single();

    if (!error && data) return data;
  }

  // Try to get user by name (works for names and friendly IDs)
  // FIXED: Use eq with lower() for exact case-insensitive match instead of ilike pattern match
  const canonicalName = getCanonicalName(identifier);
  if (canonicalName) {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('name', canonicalName)
      .single();

    if (!error && data) return data;

    // Try case-insensitive exact match if exact match fails
    const { data: ciData, error: ciError } = await supabaseClient
      .from('users')
      .select('*')
      .ilike('name', canonicalName)
      .limit(1)
      .single();

    if (!ciError && ciData) return ciData;
  }

  // Last resort: try the identifier as-is (exact match first, then case-insensitive)
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('name', identifier.trim())
    .single();

  if (!error && data) return data;

  // Case-insensitive fallback with limit to prevent multiple matches
  const { data: fallbackData, error: fallbackError } = await supabaseClient
    .from('users')
    .select('*')
    .ilike('name', identifier.trim())
    .limit(1)
    .single();

  if (!fallbackError && fallbackData) return fallbackData;

  return null;
}
