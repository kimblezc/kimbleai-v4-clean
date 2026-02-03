/**
 * NextAuth Configuration
 *
 * Handles authentication with Google OAuth
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { userQueries } from '../db/queries';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request offline access for refresh tokens
          access_type: 'offline',
          prompt: 'consent',
          // Request necessary Google API scopes
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('[Auth] Sign in callback:', { email: user.email, hasAccount: !!account });

      if (!user.email) {
        console.error('[Auth] No email provided');
        return false;
      }

      try {
        // Check if user exists
        let dbUser = await userQueries.getByEmail(user.email);

        if (!dbUser) {
          // Create new user (without google_tokens to avoid column error)
          dbUser = await userQueries.create({
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            // Skip googleTokens for now to avoid schema errors
          });
          console.log('[Auth] Created new user:', dbUser.id);
        } else {
          // Update name only (skip last_login_at - column doesn't exist)
          await userQueries.update(dbUser.id, {
            name: user.name || undefined,
          });
          console.log('[Auth] Updated existing user:', dbUser.id);
        }

        return true;
      } catch (error) {
        console.error('[Auth] Sign in error:', error);
        // TEMPORARILY allow signin even if database fails
        console.warn('[Auth] Allowing signin despite database error (debug mode)');
        return true;
      }
    },

    async jwt({ token, user, account, trigger }) {
      // Initial sign in - get database user ID by email
      if (user && user.email) {
        try {
          const dbUser = await userQueries.getByEmail(user.email);
          if (dbUser) {
            token.userId = dbUser.id; // Use database UUID, not Google ID
            token.userEmail = user.email; // Store email for recovery
            console.log('[Auth] JWT token userId set to:', dbUser.id);
          } else {
            console.error('[Auth] User not found in database:', user.email);
          }
        } catch (error) {
          console.error('[Auth] Error getting user for JWT:', error);
        }
      }

      // FIX OLD TOKENS: If token has old Google numeric ID, look up proper UUID
      if (token.userId && typeof token.userId === 'string' && token.userId.length > 36) {
        console.warn('[Auth] Detected old Google numeric ID in token, fixing...');
        if (token.userEmail) {
          try {
            const dbUser = await userQueries.getByEmail(token.userEmail as string);
            if (dbUser) {
              token.userId = dbUser.id;
              console.log('[Auth] Fixed old token, userId now:', dbUser.id);
            }
          } catch (error) {
            console.error('[Auth] Error fixing old token:', error);
          }
        }
      }

      // Store Google tokens in JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      return token;
    },

    async session({ session, token }) {
      console.log('[Auth] Session callback:', { hasUser: !!session.user, userId: token.userId });

      // Add user ID and Google tokens to session
      if (session.user) {
        session.user.id = token.userId as string;
      }

      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.expiresAt = token.expiresAt as number;

      return session;
    },
  },

  // Use NextAuth default signin pages since custom pages don't exist
  // pages: {
  //   signIn: '/auth/signin',
  //   error: '/auth/error',
  // },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
