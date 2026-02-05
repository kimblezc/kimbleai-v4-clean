/**
 * Ensure User Exists Utility
 *
 * Validates that a user exists in the database and returns the correct DB userId.
 * This is critical because the NextAuth session userId may differ from the
 * Supabase users table UUID.
 */

import { userQueries } from '@/lib/db/queries';
import { logger } from '@/lib/utils/logger';

/**
 * Ensure user exists in database and return the correct user ID.
 *
 * IMPORTANT: The session userId from NextAuth may not match the database UUID.
 * This function finds the user by ID first, then by email, and returns
 * the ACTUAL database user ID to use for all foreign key relationships.
 *
 * @param sessionUserId - The userId from session (may be wrong)
 * @param email - User's email from session
 * @param name - User's name from session (optional)
 * @returns The correct database user ID to use for DB operations
 */
export async function ensureUserExists(
  sessionUserId: string,
  email: string | null | undefined,
  name: string | null | undefined
): Promise<string> {
  try {
    // First try to get by ID
    const existingUser = await userQueries.getById(sessionUserId).catch(() => null);
    if (existingUser) {
      return existingUser.id;
    }

    // If not found by ID and we have email, try by email
    // IMPORTANT: Return the DB user's ID, not the session userId
    if (email) {
      const userByEmail = await userQueries.getByEmail(email);
      if (userByEmail) {
        logger.info('Found user by email, using DB userId', {
          sessionUserId,
          dbUserId: userByEmail.id,
          email
        });
        return userByEmail.id; // Use the DB user's ID!
      }
    }

    // Create new user with the session's userId
    logger.info('Creating missing user record', { sessionUserId, email });

    // Generate a unique name if not provided (name column may be UNIQUE and required)
    const userName = name || `User_${sessionUserId.substring(0, 8)}`;

    const newUser = await userQueries.createWithId(sessionUserId, {
      email: email || `user-${sessionUserId}@kimbleai.local`,
      name: userName,
    });
    return newUser.id;
  } catch (error) {
    logger.error('Failed to ensure user exists', error as Error, { sessionUserId, email });
    throw error;
  }
}

/**
 * Helper to get validated userId from session
 * Combines session extraction with user validation
 */
export async function getValidatedUserId(session: {
  user?: { id?: string; email?: string | null; name?: string | null } | null;
} | null): Promise<string | null> {
  if (!session?.user?.id) {
    return null;
  }

  return ensureUserExists(
    session.user.id,
    session.user.email,
    session.user.name
  );
}
