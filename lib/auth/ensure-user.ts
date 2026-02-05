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
  logger.info('[ensureUserExists] Starting validation', {
    sessionUserId,
    email: email || 'none',
    hasName: !!name,
  });

  try {
    // Step 1: Try to get user by session ID
    logger.info('[ensureUserExists] Step 1: Looking up by session ID', { sessionUserId });
    const existingUser = await userQueries.getById(sessionUserId).catch((err) => {
      logger.info('[ensureUserExists] User not found by ID (expected for new users)', {
        sessionUserId,
        error: err?.message || 'unknown'
      });
      return null;
    });

    if (existingUser) {
      logger.info('[ensureUserExists] SUCCESS: Found user by ID', {
        sessionUserId,
        dbUserId: existingUser.id,
        dbEmail: existingUser.email,
      });
      return existingUser.id;
    }

    // Step 2: Try to find user by email
    if (email) {
      logger.info('[ensureUserExists] Step 2: Looking up by email', { email });
      const userByEmail = await userQueries.getByEmail(email);

      if (userByEmail) {
        logger.info('[ensureUserExists] SUCCESS: Found user by email - USING DB userId', {
          sessionUserId,
          dbUserId: userByEmail.id,
          email,
          note: 'Session ID differs from DB ID - this is expected for Google OAuth users'
        });
        return userByEmail.id; // CRITICAL: Use the DB user's ID, not session ID!
      }
      logger.info('[ensureUserExists] User not found by email', { email });
    }

    // Step 3: Create new user
    logger.info('[ensureUserExists] Step 3: Creating new user record', {
      sessionUserId,
      email: email || `user-${sessionUserId}@kimbleai.local`,
      name: name || `User_${sessionUserId.substring(0, 8)}`,
    });

    const userName = name || `User_${sessionUserId.substring(0, 8)}`;
    const userEmail = email || `user-${sessionUserId}@kimbleai.local`;

    const newUser = await userQueries.createWithId(sessionUserId, {
      email: userEmail,
      name: userName,
    });

    logger.info('[ensureUserExists] SUCCESS: Created new user', {
      sessionUserId,
      createdUserId: newUser.id,
      email: userEmail,
      name: userName,
    });

    return newUser.id;
  } catch (error) {
    logger.error('[ensureUserExists] FAILED to ensure user exists', error as Error, {
      sessionUserId,
      email,
      errorMessage: (error as Error)?.message || 'unknown'
    });
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
