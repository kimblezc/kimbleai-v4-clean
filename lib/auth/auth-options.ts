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
          // Update last login only (skip google_tokens to avoid column error)
          await userQueries.update(dbUser.id, {
            name: user.name || undefined,
            last_login_at: new Date().toISOString(),
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

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
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
