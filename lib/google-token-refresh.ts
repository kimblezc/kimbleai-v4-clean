/**
 * Google Token Refresh Library
 *
 * Handles automatic OAuth token refresh for Google APIs (Drive, Gmail, Calendar).
 * Prevents intermittent API failures by ensuring tokens are always valid.
 *
 * Key Features:
 * - Automatic token refresh when expired or near expiration
 * - Thread-safe refresh (prevents multiple simultaneous refreshes)
 * - Comprehensive error handling and logging
 * - Database persistence for tokens
 *
 * Usage:
 * ```typescript
 * import { getValidAccessToken } from '@/lib/google-token-refresh';
 *
 * const accessToken = await getValidAccessToken(userId);
 * if (!accessToken) {
 *   return NextResponse.json({ error: 'Please re-authenticate' }, { status: 401 });
 * }
 * ```
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Track in-flight refresh requests to prevent race conditions
const refreshInProgress = new Map<string, Promise<string | null>>();

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in milliseconds
  updated_at: string;
}

/**
 * Get a valid access token for a user, refreshing if necessary
 * @param userId - The user's ID (e.g., 'zach' or 'rebecca')
 * @returns Valid access token or null if unable to refresh
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    console.log(`[TOKEN-REFRESH] Checking token for user: ${userId}`);

    // Check if refresh is already in progress for this user
    if (refreshInProgress.has(userId)) {
      console.log(`[TOKEN-REFRESH] Refresh already in progress for ${userId}, waiting...`);
      return await refreshInProgress.get(userId)!;
    }

    // Fetch current token data
    const { data: tokenData, error: fetchError } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token, expires_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (fetchError || !tokenData) {
      console.error(`[TOKEN-REFRESH] No token data found for ${userId}:`, fetchError);
      return null;
    }

    // Check if token is valid
    const now = Date.now();
    const expiresAt = tokenData.expires_at;
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    console.log(`[TOKEN-REFRESH] Token status for ${userId}:`, {
      expiresAt: new Date(expiresAt).toISOString(),
      now: new Date(now).toISOString(),
      expired: expiresAt < now,
      needsRefresh: expiresAt < (now + bufferTime)
    });

    // If token is still valid and not near expiration, return it
    if (expiresAt > (now + bufferTime)) {
      console.log(`[TOKEN-REFRESH] Token still valid for ${userId}, expires in ${Math.round((expiresAt - now) / 1000 / 60)} minutes`);
      return tokenData.access_token;
    }

    // Token expired or near expiration, need to refresh
    console.log(`[TOKEN-REFRESH] Token expired or near expiration for ${userId}, refreshing...`);

    if (!tokenData.refresh_token) {
      console.error(`[TOKEN-REFRESH] No refresh token available for ${userId}`);
      return null;
    }

    // Start refresh and track it
    const refreshPromise = refreshAccessToken(userId, tokenData.refresh_token);
    refreshInProgress.set(userId, refreshPromise);

    try {
      const newAccessToken = await refreshPromise;
      return newAccessToken;
    } finally {
      // Clean up tracking
      refreshInProgress.delete(userId);
    }

  } catch (error: any) {
    console.error(`[TOKEN-REFRESH] Error getting valid token for ${userId}:`, error);
    return null;
  }
}

/**
 * Refresh an access token using the refresh token
 * @param userId - The user's ID
 * @param refreshToken - The refresh token
 * @returns New access token or null if refresh failed
 */
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    console.log(`[TOKEN-REFRESH] Calling Google OAuth2 token endpoint for ${userId}...`);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TOKEN-REFRESH] Google OAuth2 refresh failed for ${userId}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      // If refresh token is invalid, user needs to re-authenticate
      if (response.status === 400 || response.status === 401) {
        console.error(`[TOKEN-REFRESH] Refresh token invalid for ${userId}, user needs to re-authenticate`);

        // Clear the invalid tokens from database
        await supabase
          .from('user_tokens')
          .update({
            access_token: null,
            expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in; // seconds until expiration
    const newExpiresAt = Date.now() + (expiresIn * 1000); // Convert to milliseconds

    console.log(`[TOKEN-REFRESH] Successfully refreshed token for ${userId}:`, {
      expiresIn: `${expiresIn} seconds`,
      expiresAt: new Date(newExpiresAt).toISOString()
    });

    // Store new access token in database
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({
        access_token: newAccessToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`[TOKEN-REFRESH] Failed to update token in database for ${userId}:`, updateError);
      // Still return the token even if database update failed
    } else {
      console.log(`[TOKEN-REFRESH] Token updated in database for ${userId}`);
    }

    return newAccessToken;

  } catch (error: any) {
    console.error(`[TOKEN-REFRESH] Exception during token refresh for ${userId}:`, error);
    return null;
  }
}

/**
 * Check if a user needs to re-authenticate
 * @param userId - The user's ID
 * @returns True if user needs to re-authenticate
 */
export async function needsReauth(userId: string): Promise<boolean> {
  try {
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    // No tokens at all
    if (!tokenData?.access_token) {
      return true;
    }

    // No refresh token (can't refresh expired token)
    if (!tokenData.refresh_token) {
      return true;
    }

    // Token expired and refresh failed
    const now = Date.now();
    if (tokenData.expires_at < now) {
      const refreshedToken = await getValidAccessToken(userId);
      return !refreshedToken;
    }

    return false;
  } catch (error) {
    console.error(`[TOKEN-REFRESH] Error checking reauth status for ${userId}:`, error);
    return true; // Assume needs reauth on error
  }
}

/**
 * Get token expiration status for debugging
 * @param userId - The user's ID
 * @returns Token status information
 */
export async function getTokenStatus(userId: string): Promise<{
  hasToken: boolean;
  hasRefreshToken: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  expiresInMinutes: number | null;
}> {
  try {
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (!tokenData) {
      return {
        hasToken: false,
        hasRefreshToken: false,
        expiresAt: null,
        isExpired: true,
        expiresInMinutes: null
      };
    }

    const now = Date.now();
    const expiresAt = tokenData.expires_at;
    const isExpired = expiresAt < now;
    const expiresInMinutes = !isExpired ? Math.round((expiresAt - now) / 1000 / 60) : null;

    return {
      hasToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      isExpired,
      expiresInMinutes
    };
  } catch (error) {
    console.error(`[TOKEN-REFRESH] Error getting token status for ${userId}:`, error);
    return {
      hasToken: false,
      hasRefreshToken: false,
      expiresAt: null,
      isExpired: true,
      expiresInMinutes: null
    };
  }
}
